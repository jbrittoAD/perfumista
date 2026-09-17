import metodo from "@/lib/data/metodo.json";
import { markDirty } from "@/lib/sync";

/**
 * Motor de repetição espaçada (SRS) — sem libs externas.
 *
 * Modelo de degraus (Leitner simplificado): cada item vive em um "box"
 * (índice na escada de intervalos de metodo.srs_config.intervalos_dias).
 * Acertar avança um degrau; errar volta ao degrau 1 (índice 0).
 * A próxima revisão vence hoje + intervalos_dias[box].
 *
 * Datas são normalizadas por DIA (YYYY-MM-DD) para que "vencendo hoje"
 * seja estável independentemente do horário.
 */

const STORAGE_KEY = "perfumista:srs";

/** Escada de intervalos, em dias, vinda da metodologia. */
export const INTERVALS: number[] =
  (metodo as { srs_config?: { intervalos_dias?: number[] } }).srs_config?.intervalos_dias ?? [
    1, 3, 7, 16, 35, 90,
  ];

export type Grade = "errei" | "dificil" | "bom" | "facil";

export type SrsItem = {
  /** Degrau atual na escada de intervalos (0-based). */
  box: number;
  /** Data da próxima revisão (YYYY-MM-DD). */
  dueDate: string;
  /** Última nota atribuída pelo aluno. */
  lastGrade: Grade | null;
};

type SrsStore = Record<string, SrsItem>;

/* ------------------------------------------------------------------ */
/* Datas por dia                                                       */
/* ------------------------------------------------------------------ */

/** Retorna YYYY-MM-DD (hora local) para uma data (default: hoje). */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** dayKey de hoje + n dias. */
function addDays(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return dayKey(d);
}

/** True se a data (YYYY-MM-DD) é hoje ou anterior. */
function isDue(dueDate: string): boolean {
  return dueDate <= dayKey();
}

/* ------------------------------------------------------------------ */
/* Persistência                                                        */
/* ------------------------------------------------------------------ */

function read(): SrsStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: SrsStore = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        value &&
        typeof value === "object" &&
        typeof (value as SrsItem).box === "number" &&
        typeof (value as SrsItem).dueDate === "string"
      ) {
        const v = value as SrsItem;
        out[key] = {
          box: Math.max(0, Math.min(INTERVALS.length - 1, Math.floor(v.box))),
          dueDate: v.dueDate,
          lastGrade: v.lastGrade ?? null,
        };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function write(store: SrsStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    markDirty();
  } catch {
    // ignora quota / modo privado
  }
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Agenda um item após uma revisão.
 * - "errei"   → volta ao degrau 1 (box 0), vence amanhã (INTERVALS[0]).
 * - "dificil" → mantém o degrau atual (repete o mesmo intervalo, sem subir).
 * - "bom"     → sobe um degrau.
 * - "facil"   → sobe dois degraus (pula um).
 * Retorna o item atualizado.
 */
export function schedule(key: string, grade: Grade): SrsItem {
  const store = read();
  const current = store[key];
  const prevBox = current ? current.box : 0;

  let box: number;
  switch (grade) {
    case "errei":
      box = 0;
      break;
    case "dificil":
      box = prevBox;
      break;
    case "bom":
      box = prevBox + 1;
      break;
    case "facil":
      box = prevBox + 2;
      break;
    default:
      box = prevBox;
  }
  box = Math.max(0, Math.min(INTERVALS.length - 1, box));

  const item: SrsItem = {
    box,
    dueDate: addDays(INTERVALS[box]),
    lastGrade: grade,
  };
  store[key] = item;
  write(store);
  return item;
}

/**
 * Garante que cada chave exista no store. Chaves novas nascem "vencendo hoje"
 * (box 0, dueDate = hoje), portanto entram já na fila de revisão.
 * Retorna quantas chaves novas foram criadas.
 */
export function ensureSeeded(keys: string[]): number {
  if (typeof window === "undefined") return 0;
  const store = read();
  let added = 0;
  const today = dayKey();
  for (const key of keys) {
    if (!store[key]) {
      store[key] = { box: 0, dueDate: today, lastGrade: null };
      added++;
    }
  }
  if (added > 0) write(store);
  return added;
}

/** Subconjunto de `keys` que está vencendo hoje (ou atrasado). */
export function getDue(keys: string[]): string[] {
  const store = read();
  return keys.filter((k) => {
    const item = store[k];
    return item != null && isDue(item.dueDate);
  });
}

/** Nº de chaves due dentro de `keys`. */
export function dueCount(keys: string[]): number {
  return getDue(keys).length;
}

/** Estado bruto de um item (ou null se nunca visto). */
export function getItem(key: string): SrsItem | null {
  return read()[key] ?? null;
}

export type SrsStats = {
  /** Itens conhecidos pelo SRS. */
  total: number;
  /** Itens vencendo hoje (ou atrasados). */
  due: number;
  /** Itens que já subiram pelo menos um degrau (box > 0). */
  learning: number;
  /** Itens no último degrau da escada. */
  mature: number;
};

/** Estatísticas globais (todos os itens no store). */
export function stats(): SrsStats {
  const store = read();
  const items = Object.values(store);
  const last = INTERVALS.length - 1;
  return {
    total: items.length,
    due: items.filter((i) => isDue(i.dueDate)).length,
    learning: items.filter((i) => i.box > 0).length,
    mature: items.filter((i) => i.box >= last).length,
  };
}
