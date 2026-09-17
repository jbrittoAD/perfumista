/**
 * buylist.ts — "Minha lista de compras" MANUAL (a que o usuário monta em
 * /fragrancias, escolhendo materiais por cor). Diferente de /compras, que é a
 * sugestão pronta (lotes de 20 por cor).
 *
 * OFFLINE-FIRST: vive no localStorage do aparelho (a PWA é estática, sem
 * servidor). Guarda apenas os IDs marcados. Funções SÍNCRONAS; todo acesso a
 * localStorage é guardado com `typeof window` para não quebrar no pré-render
 * (build). ESM, sem extensão nos imports.
 */

import { markDirty } from "@/lib/sync";

const STORAGE_KEY = "perfumista:buylist";

function hasStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

/** Lê os IDs marcados (Set), tolerante a lixo. */
function read(): Set<number> {
  if (!hasStorage()) return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.map(Number).filter((x) => Number.isFinite(x)));
    }
    return new Set();
  } catch {
    return new Set();
  }
}

function write(set: Set<number>): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
    markDirty();
  } catch {
    // ignora quota / modo privado
  }
}

/** Todos os IDs marcados para comprar (ordem de inserção não garantida). */
export function list(): number[] {
  return [...read()];
}

/** true se o material está marcado. */
export function has(id: number): boolean {
  return read().has(id);
}

/** Marca um material. Retorna a lista atualizada de IDs. */
export function add(id: number): number[] {
  const set = read();
  set.add(id);
  write(set);
  return [...set];
}

/** Desmarca um material. Retorna a lista atualizada de IDs. */
export function remove(id: number): number[] {
  const set = read();
  set.delete(id);
  write(set);
  return [...set];
}

/** Alterna a marcação. Retorna true se ficou marcado. */
export function toggle(id: number): boolean {
  const set = read();
  const nowOn = !set.has(id);
  if (nowOn) set.add(id);
  else set.delete(id);
  write(set);
  return nowOn;
}

/** Esvazia a lista. */
export function clear(): void {
  write(new Set());
}

/** Quantos itens marcados. */
export function count(): number {
  return read().size;
}
