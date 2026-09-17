/**
 * compareset.ts — seleção temporária de materiais para a tela /comparar
 * ("qual a diferença entre estes dois?"). Mesmo padrão de lib/buylist.ts
 * (Set<number> no localStorage), mas é uma ferramenta de sessão, não progresso
 * do usuário — por isso NÃO aciona o sync entre aparelhos (lib/sync.ts).
 *
 * Limite de MAX itens: a tabela de comparação é lado a lado, mais que isso
 * fica ilegível. `toggle`/`add` recusam silenciosamente (ok:false) ao tentar
 * ultrapassar o limite; quem chama decide se avisa o usuário.
 *
 * Funções SÍNCRONAS; acesso a localStorage guardado com `typeof window` pra
 * não quebrar no pré-render (build estático). ESM, sem extensão nos imports.
 */

const STORAGE_KEY = "perfumista:compareset";

/** Máximo de materiais comparáveis ao mesmo tempo (legibilidade da tabela). */
export const MAX = 4;

export interface ToggleResult {
  /** true se o material terminou SELECIONADO após a chamada. */
  on: boolean;
  /** false quando a operação foi recusada (ex.: tentou adicionar com o set cheio). */
  ok: boolean;
  list: number[];
}

function hasStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function read(): number[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(Number).filter((x) => Number.isFinite(x));
  } catch {
    return [];
  }
}

function write(ids: number[]): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignora quota / modo privado
  }
}

/** Ids selecionados, na ordem em que foram adicionados. */
export function list(): number[] {
  return read();
}

/** true se o material está na seleção. */
export function has(id: number): boolean {
  return read().includes(id);
}

/** Quantos itens selecionados. */
export function count(): number {
  return read().length;
}

/** Adiciona um material. `ok:false` (sem alterar nada) se já está cheio. */
export function add(id: number): ToggleResult {
  const ids = read();
  if (ids.includes(id)) return { on: true, ok: true, list: ids };
  if (ids.length >= MAX) return { on: false, ok: false, list: ids };
  const next = [...ids, id];
  write(next);
  return { on: true, ok: true, list: next };
}

/** Remove um material da seleção (idempotente). */
export function remove(id: number): number[] {
  const next = read().filter((x) => x !== id);
  write(next);
  return next;
}

/** Alterna a seleção. Recusa (ok:false) ao tentar adicionar com o set cheio. */
export function toggle(id: number): ToggleResult {
  if (has(id)) return { on: false, ok: true, list: remove(id) };
  return add(id);
}

/** Esvazia a seleção. */
export function clear(): void {
  write([]);
}
