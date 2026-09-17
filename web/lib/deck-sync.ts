/**
 * deck-sync.ts — Backup e sincronização do progresso entre aparelhos (opcional).
 *
 * OFFLINE-FIRST, sem exceção: o IndexedDB local é a fonte de verdade e o app
 * funciona 100% sem rede. A nuvem é só espelho — se ela estiver fora, nada na
 * UI trava ou some.
 *
 * O merge é sempre UNIÃO / "melhor de cada", nunca sobrescrita cega:
 *   swipes  → por carta, vence o registro com timestamp mais novo;
 *   cursor  → por família, vence o índice maior (quem avançou mais);
 *   blends  → por id, vence o updatedAt mais novo.
 * Assim dois aparelhos usados em paralelo convergem sem perder decisão.
 *
 * Backend: o mesmo projeto Supabase e as mesmas RPC (`perfumista_get`/`_set`)
 * que o app anterior já usava, com o mesmo código fixo — por isso a linha remota
 * é lida e reescrita PRESERVANDO campos desconhecidos (ex.: progresso do curso
 * antigo). Nada do histórico é destruído por este app.
 *
 * Arquitetura preparada para login de verdade: basta trocar `resolveCode()` por
 * um id de usuário vindo de OAuth (Google/Apple) — o resto do fluxo não muda.
 */

"use client";

import { createClient } from "@supabase/supabase-js";
import {
  currentState, replaceState, setCommitHook,
  type Blend, type DeckState, type SwipeRecord,
} from "./deck-store";

const SUPABASE_URL = "https://tgbnxnftahjrphxpazvz.supabase.co";
// Chave "publishable": é client-side por design, pode ir no bundle.
const SUPABASE_PUBLISHABLE = "sb_publishable_2xyzNzjovJcz2diJwJRL4Q_O4SyGomI";

const SYNC_CODE_KEY = "perfumista:sync-code";
const LAST_SYNC_KEY = "perfumista:sync-last";
// Projeto de um usuário só: todo aparelho adota este código no 1º load e passa a
// sincronizar sozinho, sem o usuário digitar nada.
const DEFAULT_CODE = "PERF-JB29-K7M4-Q8XR-N6TZ-A5HD-W3PY";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  realtime: { params: { eventsPerSecond: 0 } },
});

/** Payload remoto: o que este app escreve fica sob a chave `deck`. */
interface RemoteRow {
  deck?: Partial<DeckState>;
  [other: string]: unknown;
}

function resolveCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(SYNC_CODE_KEY);
    if (saved && saved.trim()) return saved;
    window.localStorage.setItem(SYNC_CODE_KEY, DEFAULT_CODE);
    return DEFAULT_CODE;
  } catch {
    return null;
  }
}

function markSynced() {
  try {
    window.localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
  } catch {
    /* modo privado */
  }
}

export function lastSyncAt(): number | null {
  if (typeof window === "undefined") return null;
  const n = Number(window.localStorage.getItem(LAST_SYNC_KEY));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/* ------------------------------------------------------------------ */
/* Merge                                                               */
/* ------------------------------------------------------------------ */

function mergeDeck(local: DeckState, remote: Partial<DeckState> | undefined): DeckState {
  if (!remote) return local;

  const swipes: Record<number, SwipeRecord> = { ...local.swipes };
  for (const [k, v] of Object.entries(remote.swipes ?? {})) {
    const id = Number(k);
    const r = v as SwipeRecord;
    if (!r || (r.dir !== "like" && r.dir !== "pass")) continue;
    const mine = swipes[id];
    if (!mine || (r.at ?? 0) > mine.at) swipes[id] = { id, dir: r.dir, at: r.at ?? 0 };
  }

  const cursor = { ...local.cursor };
  for (const [fam, idx] of Object.entries(remote.cursor ?? {})) {
    const key = fam as keyof DeckState["cursor"];
    const n = Number(idx);
    if (Number.isFinite(n) && n > (cursor[key] ?? -1)) cursor[key] = n;
  }

  const byId = new Map<string, Blend>();
  for (const b of [...(remote.blends ?? []), ...local.blends]) {
    const prev = byId.get(b.id);
    if (!prev || (b.updatedAt ?? 0) > (prev.updatedAt ?? 0)) byId.set(b.id, b);
  }

  const remoteNewer = (remote.updatedAt ?? 0) > local.updatedAt;
  return {
    swipes,
    cursor,
    last: remoteNewer ? (remote.last ?? local.last) : local.last,
    blends: [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt),
    updatedAt: Math.max(local.updatedAt, remote.updatedAt ?? 0),
    ready: true,
  };
}

/* ------------------------------------------------------------------ */
/* Ciclo                                                               */
/* ------------------------------------------------------------------ */

/** pull → merge → push. Nunca lança; devolve false quando a nuvem não respondeu. */
export async function syncNow(): Promise<boolean> {
  const code = resolveCode();
  if (!code) return false;

  let row: RemoteRow = {};
  try {
    const { data, error } = await supabase.rpc("perfumista_get", { p_code: code });
    if (error) return false;
    if (data && typeof data === "object") row = data as RemoteRow;
  } catch {
    return false;
  }

  const merged = mergeDeck(currentState(), row.deck);
  replaceState(merged);

  try {
    // Preserva o que não é nosso (progresso do curso do app anterior, p.ex.).
    const { error } = await supabase.rpc("perfumista_set", {
      p_code: code,
      p_state: { ...row, deck: { ...merged, ready: undefined } },
    });
    if (error) return false;
  } catch {
    return false;
  }

  markSynced();
  return true;
}

let timer: ReturnType<typeof setTimeout> | null = null;
let attached = false;

/** Agenda um envio com debounce — chamado depois de cada rajada de swipes. */
export function scheduleSync(): void {
  if (typeof window === "undefined") return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void syncNow();
  }, 4000);
}

/** Dispara um sync em background na abertura e ao sair da tela. Não bloqueia a UI. */
export function initDeckSync(): void {
  if (typeof window === "undefined" || attached) return;
  attached = true;
  setCommitHook(scheduleSync);

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    void syncNow();
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);

  void syncNow();
}
