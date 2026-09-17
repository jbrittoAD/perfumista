/**
 * formula.ts — Store client-side (localStorage) de fórmulas salvas + "fórmula
 * atual" para handoff entre telas (catálogo/detalhe/reverso -> Modo Direto).
 *
 * OFFLINE-FIRST: tudo vive no localStorage do aparelho (a PWA é estática, sem
 * servidor). Perde-se a sincronização entre dispositivos — o preço do offline —
 * mas mantém-se Exportar/Importar JSON para mover fórmulas manualmente.
 *
 * Funções SÍNCRONAS e puras/isoladas de UI. Todo acesso a localStorage é guardado
 * com `typeof window !== "undefined"` para funcionar em pré-render (build). ESM,
 * sem extensão nos imports.
 */

import { markDirty } from "@/lib/sync";

export interface FormulaItemData {
  materialId: number;
  name: string;
  grams: number;
  dilutionPct: number; // 100 => puro
}

export interface SavedFormula {
  id: string;
  name: string;
  items: FormulaItemData[];
  createdAt: number;
  /** Marca da última edição (para o merge de sincronização escolher a mais nova). */
  updatedAt?: number;
}

const SAVED_KEY = "perfumista:saved-formulas";
const CURRENT_KEY = "perfumista:current-formula";

function hasStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function genId(): string {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Normaliza um item cru (de storage/import) num FormulaItemData válido. */
function cleanItem(i: unknown): FormulaItemData {
  const o = (i ?? {}) as Partial<FormulaItemData>;
  return {
    materialId: Number(o.materialId),
    name: String(o.name ?? ""),
    grams: Number(o.grams) || 0,
    dilutionPct: Number(o.dilutionPct) || 100,
  };
}

// --------------------------------------------------------------------------
// Fórmulas salvas — localStorage (offline, por aparelho)
// --------------------------------------------------------------------------

/** Lê o array bruto do storage (mais recentes primeiro), tolerante a lixo. */
function readSaved(): SavedFormula[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
      .map((f) => ({
        id: typeof f.id === "string" && f.id ? f.id : genId(),
        name: typeof f.name === "string" && f.name.trim() ? f.name : "Sem nome",
        items: Array.isArray(f.items) ? f.items.map(cleanItem) : [],
        createdAt: Number(f.createdAt) || Date.now(),
        updatedAt: typeof f.updatedAt === "number" ? f.updatedAt : undefined,
      }));
  } catch {
    return [];
  }
}

function writeSaved(list: SavedFormula[]): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(list));
    markDirty();
  } catch {
    /* quota/serialização: ignora */
  }
}

/** Lista todas as fórmulas salvas (mais recentes primeiro). */
export function listSaved(): SavedFormula[] {
  return [...readSaved()].sort((a, b) => b.createdAt - a.createdAt);
}

/** Salva a fórmula atual sob um nome e devolve o registro criado. */
export function saveFormula(name: string, items: FormulaItemData[]): SavedFormula {
  const rec: SavedFormula = {
    id: genId(),
    name: name.trim() || "Sem nome",
    items: items.map(cleanItem),
    createdAt: Date.now(),
  };
  writeSaved([rec, ...readSaved()]);
  return rec;
}

/** Atualiza uma fórmula salva (nome e/ou itens). Devolve o registro ou null. */
export function updateFormula(
  id: string,
  patch: { name?: string; items?: FormulaItemData[] },
): SavedFormula | null {
  const list = readSaved();
  const idx = list.findIndex((f) => f.id === id);
  if (idx < 0) return null;
  const cur = list[idx];
  const updated: SavedFormula = {
    ...cur,
    name: patch.name != null ? patch.name.trim() || "Sem nome" : cur.name,
    items: patch.items != null ? patch.items.map(cleanItem) : cur.items,
    updatedAt: Date.now(),
  };
  list[idx] = updated;
  writeSaved(list);
  return updated;
}

/** Remove uma fórmula salva por id. */
export function deleteFormula(id: string): void {
  writeSaved(readSaved().filter((f) => f.id !== id));
}

/** Serializa todas as fórmulas salvas em JSON (para download). */
export function exportJSON(): string {
  return JSON.stringify(listSaved(), null, 2);
}

/**
 * Importa fórmulas de um JSON (aceita um array de SavedFormula ou uma única).
 * Cada uma vira um novo registro (re-gera ids). Devolve quantas entraram; lança
 * se o JSON for inválido / não tiver fórmula válida.
 */
export function importJSON(text: string): number {
  const parsed = JSON.parse(text);
  const incoming: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
  const valid: SavedFormula[] = [];
  for (const raw of incoming) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Partial<SavedFormula>;
    if (!Array.isArray(o.items)) continue;
    valid.push({
      id: genId(),
      name: typeof o.name === "string" && o.name.trim() ? o.name : "Importada",
      items: o.items.map(cleanItem),
      createdAt: typeof o.createdAt === "number" ? o.createdAt : Date.now(),
    });
  }
  if (valid.length === 0) throw new Error("Nenhuma fórmula válida no JSON.");
  writeSaved([...valid, ...readSaved()]);
  return valid.length;
}

// --------------------------------------------------------------------------
// "Fórmula atual" — handoff entre telas (detalhe/reverso -> direto)
// --------------------------------------------------------------------------

/** Lê a fórmula atual (itens pendentes de handoff), ou [] se não houver. */
export function getCurrent(): FormulaItemData[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(CURRENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(cleanItem) : [];
  } catch {
    return [];
  }
}

/** Substitui a fórmula atual. */
export function setCurrent(items: FormulaItemData[]): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(CURRENT_KEY, JSON.stringify(items));
  } catch {
    /* ignora */
  }
}

/** Limpa a fórmula atual (após o Direto consumi-la). */
export function clearCurrent(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(CURRENT_KEY);
  } catch {
    /* ignora */
  }
}

/** Adiciona um material à fórmula atual (usado pelo botão do detalhe). */
export function addToCurrent(item: FormulaItemData): FormulaItemData[] {
  const cur = getCurrent();
  cur.push(cleanItem(item));
  setCurrent(cur);
  return cur;
}
