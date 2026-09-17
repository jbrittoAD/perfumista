/**
 * sync.ts — Sincronização OPCIONAL de progresso entre aparelhos.
 *
 * OFFLINE-FIRST: o localStorage continua sendo a fonte de verdade. A nuvem
 * (Supabase, via RPC) é só um espelho. O app funciona 100% sem internet e sem
 * código de sincronização; a sync nunca bloqueia a UI e NUNCA perde dado local
 * (todo o merge é união / "melhor de cada", nunca sobrescrita cega).
 *
 * Acesso por um CÓDIGO de sincronização (o id da linha no backend). Não há
 * acesso direto à tabela: tudo passa pelas RPC `perfumista_get`/`perfumista_set`.
 *
 * TS strict, ESM, imports sem extensão. Todo acesso a `window` é guardado para
 * o pré-render (build estático) não quebrar.
 */

import { createClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------ */
/* Backend                                                             */
/* ------------------------------------------------------------------ */

const SUPABASE_URL = "https://tgbnxnftahjrphxpazvz.supabase.co";
// Chave "publishable" — é client-side por design; pode ir no bundle.
const SUPABASE_PUBLISHABLE = "sb_publishable_2xyzNzjovJcz2diJwJRL4Q_O4SyGomI";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  realtime: { params: { eventsPerSecond: 0 } },
});

/* ------------------------------------------------------------------ */
/* Chaves de localStorage (mesmas usadas pelos módulos existentes)     */
/* ------------------------------------------------------------------ */

const SYNC_CODE_KEY = "perfumista:sync-code";
const LAST_SYNC_KEY = "perfumista:sync-last";

// Projeto de UM usuário só (o João): em vez de gerar/colar código em cada
// aparelho, todo dispositivo adota AUTOMATICAMENTE este código fixo no 1º load
// e passa a sincronizar sozinho (ver initSyncOnLoad). O usuário nunca digita nada.
// É um "segredo compartilhado" client-side (como a publishable key) — ok p/ uso
// pessoal. Trocar por um código próprio (UI em /hoje) continua funcionando.
const DEFAULT_SYNC_CODE = "PERF-JB29-K7M4-Q8XR-N6TZ-A5HD-W3PY";

const K_COURSE = "perfumista:course-progress"; // string[]
const K_QUIZ = "perfumista:quiz-results"; // Record<moduleId,{correct,total}>
const K_SRS = "perfumista:srs"; // Record<key,{box,dueDate,lastGrade}>
const K_FORMULAS = "perfumista:saved-formulas"; // SavedFormula[]

const STATE_VERSION = 1;

/* ------------------------------------------------------------------ */
/* Tipos do estado sincronizado                                        */
/* ------------------------------------------------------------------ */

type QuizResult = { correct: number; total: number };
type SrsItem = { box: number; dueDate: string; lastGrade: string | null };
type FormulaItemData = { materialId: number; name: string; grams: number; dilutionPct: number };
type SavedFormula = {
  id: string;
  name: string;
  items: FormulaItemData[];
  createdAt: number;
  // updatedAt é opcional (fórmulas antigas não têm). Usado só para o merge:
  // ao editar/sincronizar gravamos updatedAt; senão cai para createdAt.
  updatedAt?: number;
};

export interface SyncState {
  version: number;
  courseProgress: string[];
  quizResults: Record<string, QuizResult>;
  srs: Record<string, SrsItem>;
  formulas: SavedFormula[];
  updatedAt: number;
}

/* ------------------------------------------------------------------ */
/* localStorage helpers                                                */
/* ------------------------------------------------------------------ */

function hasStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readJSON<T>(key: string, fallback: T): T {
  if (!hasStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / modo privado: ignora */
  }
}

/* ------------------------------------------------------------------ */
/* Código de sincronização                                             */
/* ------------------------------------------------------------------ */

/** Código legível: 4 grupos de 4 chars (sem caracteres ambíguos). Ex.: ABCD-EFGH-JKLM-NPQR */
export function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I
  const pick = () => alphabet[Math.floor(Math.random() * alphabet.length)];
  const group = () => Array.from({ length: 4 }, pick).join("");
  return Array.from({ length: 4 }, group).join("-");
}

/** Normaliza um código digitado pelo usuário (uppercase, só chars válidos, hífens a cada 4). */
export function normalizeCode(input: string): string {
  const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const chunks = clean.match(/.{1,4}/g) ?? [];
  return chunks.join("-");
}

export function getSyncCode(): string | null {
  if (!hasStorage()) return null;
  try {
    const code = window.localStorage.getItem(SYNC_CODE_KEY);
    return code && code.trim() ? code : null;
  } catch {
    return null;
  }
}

export function setSyncCode(code: string): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(SYNC_CODE_KEY, code);
  } catch {
    /* ignora */
  }
}

/** Desativa a sincronização neste aparelho (não apaga dados locais nem remotos). */
export function clearSync(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(SYNC_CODE_KEY);
    window.localStorage.removeItem(LAST_SYNC_KEY);
  } catch {
    /* ignora */
  }
}

export function isSyncEnabled(): boolean {
  return getSyncCode() != null;
}

export function getLastSync(): number | null {
  if (!hasStorage()) return null;
  const n = Number(window.localStorage.getItem(LAST_SYNC_KEY));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function markSynced(): void {
  writeJSON(LAST_SYNC_KEY, Date.now());
}

/* ------------------------------------------------------------------ */
/* Coleta do estado local                                              */
/* ------------------------------------------------------------------ */

function readCourseProgress(): string[] {
  const arr = readJSON<unknown>(K_COURSE, []);
  if (!Array.isArray(arr)) return [];
  return arr.filter((x): x is string => typeof x === "string");
}

function readQuizResults(): Record<string, QuizResult> {
  const obj = readJSON<Record<string, unknown>>(K_QUIZ, {});
  const out: Record<string, QuizResult> = {};
  if (!obj || typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj)) {
    if (
      v &&
      typeof v === "object" &&
      typeof (v as QuizResult).correct === "number" &&
      typeof (v as QuizResult).total === "number"
    ) {
      out[k] = { correct: (v as QuizResult).correct, total: (v as QuizResult).total };
    }
  }
  return out;
}

function readSrs(): Record<string, SrsItem> {
  const obj = readJSON<Record<string, unknown>>(K_SRS, {});
  const out: Record<string, SrsItem> = {};
  if (!obj || typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj)) {
    if (
      v &&
      typeof v === "object" &&
      typeof (v as SrsItem).box === "number" &&
      typeof (v as SrsItem).dueDate === "string"
    ) {
      const it = v as SrsItem;
      out[k] = { box: it.box, dueDate: it.dueDate, lastGrade: it.lastGrade ?? null };
    }
  }
  return out;
}

function readFormulas(): SavedFormula[] {
  const arr = readJSON<unknown>(K_FORMULAS, []);
  if (!Array.isArray(arr)) return [];
  const out: SavedFormula[] = [];
  for (const f of arr) {
    if (!f || typeof f !== "object") continue;
    const o = f as Partial<SavedFormula>;
    if (typeof o.id !== "string" || !o.id) continue;
    out.push({
      id: o.id,
      name: typeof o.name === "string" ? o.name : "Sem nome",
      items: Array.isArray(o.items) ? (o.items as FormulaItemData[]) : [],
      createdAt: Number(o.createdAt) || 0,
      updatedAt: typeof o.updatedAt === "number" ? o.updatedAt : undefined,
    });
  }
  return out;
}

function formulaStamp(f: SavedFormula): number {
  return typeof f.updatedAt === "number" ? f.updatedAt : f.createdAt;
}

/** Lê TODO o estado local relevante e monta o objeto sincronizável. */
export function collectState(): SyncState {
  return {
    version: STATE_VERSION,
    courseProgress: readCourseProgress(),
    quizResults: readQuizResults(),
    srs: readSrs(),
    formulas: readFormulas(),
    updatedAt: Date.now(),
  };
}

/* ------------------------------------------------------------------ */
/* Merge (nunca perde dado local)                                      */
/* ------------------------------------------------------------------ */

/** Valida/normaliza um objeto remoto num SyncState parcial e seguro. */
function coerceRemote(remote: unknown): Partial<SyncState> {
  if (!remote || typeof remote !== "object") return {};
  const r = remote as Record<string, unknown>;
  const out: Partial<SyncState> = {};
  if (Array.isArray(r.courseProgress)) {
    out.courseProgress = r.courseProgress.filter((x): x is string => typeof x === "string");
  }
  if (r.quizResults && typeof r.quizResults === "object") {
    const q: Record<string, QuizResult> = {};
    for (const [k, v] of Object.entries(r.quizResults as Record<string, unknown>)) {
      if (
        v &&
        typeof v === "object" &&
        typeof (v as QuizResult).correct === "number" &&
        typeof (v as QuizResult).total === "number"
      ) {
        q[k] = { correct: (v as QuizResult).correct, total: (v as QuizResult).total };
      }
    }
    out.quizResults = q;
  }
  if (r.srs && typeof r.srs === "object") {
    const s: Record<string, SrsItem> = {};
    for (const [k, v] of Object.entries(r.srs as Record<string, unknown>)) {
      if (
        v &&
        typeof v === "object" &&
        typeof (v as SrsItem).box === "number" &&
        typeof (v as SrsItem).dueDate === "string"
      ) {
        const it = v as SrsItem;
        s[k] = { box: it.box, dueDate: it.dueDate, lastGrade: it.lastGrade ?? null };
      }
    }
    out.srs = s;
  }
  if (Array.isArray(r.formulas)) {
    const list: SavedFormula[] = [];
    for (const f of r.formulas) {
      if (!f || typeof f !== "object") continue;
      const o = f as Partial<SavedFormula>;
      if (typeof o.id !== "string" || !o.id) continue;
      list.push({
        id: o.id,
        name: typeof o.name === "string" ? o.name : "Sem nome",
        items: Array.isArray(o.items) ? (o.items as FormulaItemData[]) : [],
        createdAt: Number(o.createdAt) || 0,
        updatedAt: typeof o.updatedAt === "number" ? o.updatedAt : undefined,
      });
    }
    out.formulas = list;
  }
  return out;
}

/**
 * Faz o MERGE do estado remoto com o local e grava de volta no localStorage.
 * Regras:
 *  - aulas concluídas: UNIÃO.
 *  - quiz results: melhor pontuação por módulo (maior ratio correct/total).
 *  - SRS: por item, mantém o mais avançado (box maior; empate → dueDate mais longe).
 *  - fórmulas: por id, mantém a de stamp (updatedAt||createdAt) mais novo; união dos ids.
 */
export function applyState(remote: unknown): void {
  const rem = coerceRemote(remote);

  // ---- Aulas concluídas: união ----
  if (rem.courseProgress) {
    const merged = new Set<string>([...readCourseProgress(), ...rem.courseProgress]);
    writeJSON(K_COURSE, [...merged]);
  }

  // ---- Quiz: melhor ratio por módulo ----
  if (rem.quizResults) {
    const local = readQuizResults();
    const out: Record<string, QuizResult> = { ...local };
    for (const [mod, r] of Object.entries(rem.quizResults)) {
      const cur = out[mod];
      if (!cur) {
        out[mod] = r;
        continue;
      }
      const curRatio = cur.total > 0 ? cur.correct / cur.total : 0;
      const remRatio = r.total > 0 ? r.correct / r.total : 0;
      if (remRatio > curRatio) out[mod] = r;
    }
    writeJSON(K_QUIZ, out);
  }

  // ---- SRS: item mais avançado ----
  if (rem.srs) {
    const local = readSrs();
    const out: Record<string, SrsItem> = { ...local };
    for (const [key, r] of Object.entries(rem.srs)) {
      const cur = out[key];
      if (!cur) {
        out[key] = r;
        continue;
      }
      // Mais avançado = box maior; empate desempata pela dueDate mais distante
      // (revisão mais espaçada => item mais dominado).
      if (r.box > cur.box || (r.box === cur.box && r.dueDate > cur.dueDate)) {
        out[key] = r;
      }
    }
    writeJSON(K_SRS, out);
  }

  // ---- Fórmulas: por id, mais nova; união dos ids ----
  if (rem.formulas) {
    const byId = new Map<string, SavedFormula>();
    for (const f of readFormulas()) byId.set(f.id, f);
    for (const f of rem.formulas) {
      const cur = byId.get(f.id);
      if (!cur || formulaStamp(f) > formulaStamp(cur)) byId.set(f.id, f);
    }
    const merged = [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
    writeJSON(K_FORMULAS, merged);
  }
}

/* ------------------------------------------------------------------ */
/* Push / Pull / Sync (tolerantes a offline/erro)                      */
/* ------------------------------------------------------------------ */

/** Envia o estado local para a nuvem. Retorna true se sucesso. Nunca lança. */
export async function push(): Promise<boolean> {
  const code = getSyncCode();
  if (!code) return false;
  try {
    const { error } = await supabase.rpc("perfumista_set", {
      p_code: code,
      p_state: collectState(),
    });
    if (error) return false;
    markSynced();
    return true;
  } catch {
    return false;
  }
}

/** Puxa o estado da nuvem e faz merge no local. Retorna true se sucesso. Nunca lança. */
export async function pull(): Promise<boolean> {
  const code = getSyncCode();
  if (!code) return false;
  try {
    const { data, error } = await supabase.rpc("perfumista_get", { p_code: code });
    if (error) return false;
    if (data != null) applyState(data);
    markSynced();
    return true;
  } catch {
    return false;
  }
}

/**
 * Ciclo completo: pull → merge → push. Assim o estado remoto absorve o local e
 * o local absorve o remoto (convergência). Tolerante a offline: se o pull
 * falhar, ainda tenta o push (e vice-versa). Retorna true se ao menos um lado
 * teve sucesso.
 */
export async function sync(): Promise<boolean> {
  if (!getSyncCode()) return false;
  const pulled = await pull();
  const pushed = await push();
  return pulled || pushed;
}

/* ------------------------------------------------------------------ */
/* Auto-push com debounce + ativação                                   */
/* ------------------------------------------------------------------ */

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Sinaliza que o estado local mudou → agenda um push debounced (~2s).
 * Chamado pelos pontos de gravação (ou pelos handlers de visibilidade). Se não
 * houver código, é no-op. Nunca bloqueia a UI.
 */
export function markDirty(): void {
  if (!getSyncCode()) return;
  if (typeof window === "undefined") return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void push();
  }, 2000);
}

let listenersAttached = false;

/** Instala handlers de visibilidade/descarga que fazem flush do push pendente. */
function attachFlushListeners(): void {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;

  const flush = () => {
    if (!getSyncCode()) return;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    // Não dá para esperar a Promise no unload, mas o supabase-js dispara o
    // fetch (keepalive) e o pior caso é reenviar no próximo load.
    void push();
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
}

/**
 * Ativa a sincronização: define/gera o código, faz um sync inicial (merge dos
 * dois lados) e instala os listeners de flush. Retorna o código usado.
 * Se `code` vier, ativa com ele (colar código de outro aparelho → puxa dados).
 */
export async function enableSync(code?: string): Promise<string> {
  const finalCode = code && code.trim() ? normalizeCode(code) : generateCode();
  setSyncCode(finalCode);
  attachFlushListeners();
  await sync();
  return finalCode;
}

/**
 * Chamado no carregamento do app (client). Se houver código, dispara um sync em
 * background e instala os listeners. Não espera nem bloqueia a UI.
 */
export function initSyncOnLoad(): void {
  // Sem código salvo neste aparelho? Adota o código fixo do projeto (1 usuário)
  // e sincroniza automaticamente — nada de digitar/colar código.
  if (!getSyncCode()) setSyncCode(DEFAULT_SYNC_CODE);
  attachFlushListeners();
  void sync();
}
