/**
 * deck-store.ts — Persistência do progresso do baralho.
 *
 * Requisito do app: NUNCA perder progresso, inclusive offline. Por isso são
 * duas camadas, escritas em toda mutação:
 *
 *   1. IndexedDB (`perfumista-deck`) — armazenamento primário, robusto, sem
 *      limite prático de tamanho e imune ao "limpar cookies" casual.
 *   2. localStorage (`perfumista:deck-state`) — espelho compacto. Serve de
 *      fallback quando o IndexedDB não está disponível (aba anônima, Safari
 *      com storage bloqueado) e é o formato que a sincronização em nuvem envia.
 *
 * A leitura na abertura tenta o IndexedDB e, se vier vazio, promove o espelho
 * do localStorage — ou seja, um aparelho que já usou o app nunca volta do zero.
 *
 * Estado guardado: swipe de cada carta (direção + quando), posição do cursor
 * em cada família e os blends montados na aba Fórmulas.
 *
 * O componente React assina via `useDeckState` (useSyncExternalStore), então
 * toda tela reflete a mesma verdade sem prop drilling.
 */

"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { FamilySlug } from "./deck";

export type SwipeDir = "like" | "pass";

export interface SwipeRecord {
  id: number;
  dir: SwipeDir;
  at: number;
}

export interface BlendItem {
  id: number;
  /** Partes relativas (não gramas): a aba Fórmulas trabalha em proporção. */
  parts: number;
}

export interface Blend {
  id: string;
  name: string;
  items: BlendItem[];
  createdAt: number;
  updatedAt: number;
}

/** O plano de compra da paleta: cotas, escolhidos e pulados. */
export interface PaletteState {
  quotas: Partial<Record<FamilySlug, number>>;
  /** Ids que o usuário aprovou, um a um. */
  picks: number[];
  /** Ids recusados nesta montagem (não voltam a aparecer). */
  skipped: number[];
  /** Teto de R$ por frasco; null = sem teto. */
  maxPerBottle: number | null;
  /** Tamanho do frasco considerado no custo. */
  grams: number;
  /** Fórmula cujos materiais têm vaga reservada. */
  reservedFormula: string | null;
}

export const EMPTY_PALETTE: PaletteState = {
  quotas: {}, picks: [], skipped: [], maxPerBottle: 120, grams: 10, reservedFormula: null,
};

export interface DeckState {
  swipes: Record<number, SwipeRecord>;
  /** Última posição vista em cada família (índice dentro da família). */
  cursor: Partial<Record<FamilySlug, number>>;
  /** Id da última carta exibida — é por onde o app reabre. */
  last: { id: number; family: FamilySlug } | null;
  blends: Blend[];
  palette: PaletteState;
  updatedAt: number;
  /** false até o IndexedDB responder: a UI não pode montar a fila antes disso. */
  ready: boolean;
}

const EMPTY: DeckState = {
  swipes: {}, cursor: {}, last: null, blends: [], palette: EMPTY_PALETTE,
  updatedAt: 0, ready: false,
};

const DB_NAME = "perfumista-deck";
const DB_VERSION = 1;
const STORE = "state";
const ROW = "current";
const LS_KEY = "perfumista:deck-state";

/* ------------------------------------------------------------------ */
/* IndexedDB (promisificado, tolerante a ambiente sem suporte)         */
/* ------------------------------------------------------------------ */

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      return resolve(null);
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    // Safari às vezes nunca resolve nem rejeita: não deixa a UI pendurada.
    setTimeout(() => resolve(null), 2500);
  });
}

async function idbRead(): Promise<DeckState | null> {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(ROW);
      req.onsuccess = () => resolve((req.result as DeckState) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbWrite(state: DeckState): Promise<void> {
  const db = await openDB();
  if (!db) return;
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(state, ROW);
  } catch {
    /* sem IndexedDB: o espelho no localStorage segura o progresso */
  }
}

/* ------------------------------------------------------------------ */
/* localStorage (espelho)                                              */
/* ------------------------------------------------------------------ */

function lsRead(): DeckState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as DeckState) : null;
  } catch {
    return null;
  }
}

function lsWrite(state: DeckState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* quota estourada / modo privado */
  }
}

function sanitize(raw: unknown): DeckState {
  const s = (raw ?? {}) as Partial<DeckState>;
  const swipes: Record<number, SwipeRecord> = {};
  for (const [k, v] of Object.entries(s.swipes ?? {})) {
    const rec = v as SwipeRecord;
    if (rec && (rec.dir === "like" || rec.dir === "pass")) {
      swipes[Number(k)] = { id: Number(k), dir: rec.dir, at: Number(rec.at) || 0 };
    }
  }
  return {
    swipes,
    cursor: (s.cursor ?? {}) as DeckState["cursor"],
    last: (s.last as DeckState["last"]) ?? null,
    blends: Array.isArray(s.blends) ? (s.blends as Blend[]) : [],
    palette: { ...EMPTY_PALETTE, ...((s.palette as PaletteState) ?? {}) },
    updatedAt: Number(s.updatedAt) || 0,
    ready: true,
  };
}

/* ------------------------------------------------------------------ */
/* Store observável                                                    */
/* ------------------------------------------------------------------ */

let state: DeckState = EMPTY;
let hydrated = false;
let hydrating: Promise<void> | null = null;
const listeners = new Set<() => void>();

/* Gancho de pós-gravação. Existe para o módulo de sincronização se registrar
   SEM que este arquivo precise importá-lo — o caminho contrário criaria ciclo
   (deck-sync já importa daqui). `applyingRemote` evita o eco: estado que acabou
   de chegar da nuvem não dispara um novo envio. */
let commitHook: (() => void) | null = null;
let applyingRemote = false;

export function setCommitHook(fn: (() => void) | null) {
  commitHook = fn;
}

function emit() {
  for (const l of listeners) l();
}

function commit(next: DeckState) {
  state = { ...next, updatedAt: Date.now() };
  emit();
  void idbWrite(state);
  lsWrite(state);
  if (commitHook && !applyingRemote) commitHook();
}

/** Carrega o estado uma única vez; IndexedDB manda, localStorage salva a pátria. */
export function hydrate(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydrating) return hydrating;
  hydrating = (async () => {
    const fromIdb = await idbRead();
    const fromLs = lsRead();
    const a = fromIdb ? sanitize(fromIdb) : null;
    const b = fromLs ? sanitize(fromLs) : null;
    // O mais recente vence; se só um existir, é ele mesmo.
    let chosen = EMPTY;
    if (a && b) chosen = a.updatedAt >= b.updatedAt ? a : b;
    else chosen = a ?? b ?? EMPTY;
    state = { ...chosen, ready: true };
    hydrated = true;
    // Reescreve nas duas camadas para elas convergirem.
    if (chosen !== EMPTY) {
      void idbWrite(chosen);
      lsWrite(chosen);
    }
    emit();
  })();
  return hydrating;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  void hydrate();
  return () => listeners.delete(fn);
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return EMPTY;
}

/* ------------------------------------------------------------------ */
/* Mutações                                                            */
/* ------------------------------------------------------------------ */

export function recordSwipe(id: number, dir: SwipeDir) {
  commit({ ...state, swipes: { ...state.swipes, [id]: { id, dir, at: Date.now() } } });
}

/** Tira a carta da pilha de decididas — usado no "desfazer" e no Laboratório. */
export function clearSwipe(id: number) {
  const swipes = { ...state.swipes };
  delete swipes[id];
  commit({ ...state, swipes });
}

export function setCursor(family: FamilySlug, index: number, cardId?: number) {
  const sameIndex = state.cursor[family] === index;
  const sameCard = cardId == null || state.last?.id === cardId;
  if (sameIndex && sameCard) return;
  commit({
    ...state,
    cursor: { ...state.cursor, [family]: index },
    last: cardId != null ? { id: cardId, family } : state.last,
  });
}

/** Zera só os descartes: o usuário revê o que rejeitou sem perder os favoritos. */
export function resetPassed() {
  const swipes: Record<number, SwipeRecord> = {};
  for (const [k, v] of Object.entries(state.swipes)) {
    if (v.dir === "like") swipes[Number(k)] = v;
  }
  commit({ ...state, swipes, cursor: {}, last: null });
}

export function resetAll() {
  commit({ ...state, swipes: {}, cursor: {}, last: null });
}

export function saveBlend(blend: Blend) {
  const rest = state.blends.filter((b) => b.id !== blend.id);
  commit({ ...state, blends: [{ ...blend, updatedAt: Date.now() }, ...rest] });
}

export function setPalette(patch: Partial<PaletteState>) {
  commit({ ...state, palette: { ...state.palette, ...patch } });
}

/** Aprova o material para a paleta. */
export function palettePick(id: number) {
  const p = state.palette;
  if (p.picks.includes(id)) return;
  setPalette({ picks: [...p.picks, id], skipped: p.skipped.filter((x) => x !== id) });
}

/** Recusa o material nesta montagem. */
export function paletteSkip(id: number) {
  const p = state.palette;
  if (p.skipped.includes(id)) return;
  setPalette({ skipped: [...p.skipped, id], picks: p.picks.filter((x) => x !== id) });
}

/** Tira da paleta (volta a ser candidato). */
export function paletteRemove(id: number) {
  const p = state.palette;
  setPalette({ picks: p.picks.filter((x) => x !== id), skipped: p.skipped.filter((x) => x !== id) });
}

export function paletteReset() {
  setPalette({ picks: [], skipped: [] });
}

export function deleteBlend(id: string) {
  commit({ ...state, blends: state.blends.filter((b) => b.id !== id) });
}

/** Substitui o estado inteiro (usado pela sincronização depois do merge). */
export function replaceState(next: DeckState) {
  applyingRemote = true;
  try {
    commit(sanitize(next));
  } finally {
    applyingRemote = false;
  }
}

export function currentState(): DeckState {
  return state;
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

export function useDeckState(): DeckState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useSwipeActions() {
  const like = useCallback((id: number) => recordSwipe(id, "like"), []);
  const pass = useCallback((id: number) => recordSwipe(id, "pass"), []);
  const undo = useCallback((id: number) => clearSwipe(id), []);
  return { like, pass, undo };
}
