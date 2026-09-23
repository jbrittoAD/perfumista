/**
 * audiolivro.ts — o áudio dentro do app.
 *
 * Os mp3 NÃO entram no precache de instalação: são ~113 MB contra 2,7 MB do app
 * inteiro, e obrigar todo mundo a baixar isso na primeira abertura seria
 * grosseiro. Eles ficam sob demanda, guardados no Cache Storage quando o
 * usuário pede — e aí tocam em modo avião. O tamanho exato sai do build, em
 * `data/tamanhos.json`; escrito na mão aqui ele envelhece.
 *
 * A posição de escuta mora em `perfumista:audio`, chave própria, separada do
 * progresso de leitura e do estado do deck.
 */

import { LIVROS } from "./livros";
import TAM from "./data/tamanhos.json";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const CACHE_AUDIO = "perfumista-audio";

/**
 * Quais livros têm narração vem do BUILD (ele lê a pasta de mp3), não de uma
 * lista escrita aqui. A lista à mão já ficou para trás quando entrou livro
 * novo, e a tela passou a oferecer uma faixa que dá 404.
 */
const COM_AUDIO = new Set(TAM.comAudio as string[]);

export type Faixa = { slug: string; titulo: string; url: string };

export const FAIXAS: Faixa[] = LIVROS.filter((l) => COM_AUDIO.has(l.slug)).map((l) => ({
  slug: l.slug,
  titulo: l.titulo,
  url: `${BASE}/audio/${l.slug}.mp3`,
}));

/* ---------------- posição de escuta ---------------- */

const LS = "perfumista:audio";
type Posicoes = Record<string, { s: number; at: number }>;

function ler(): Posicoes {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(LS) || "{}") as Posicoes;
  } catch {
    return {};
  }
}

export function posicao(slug: string): number {
  return ler()[slug]?.s ?? 0;
}

export function salvarPosicao(slug: string, segundos: number) {
  try {
    const m = ler();
    m[slug] = { s: Math.max(0, Math.round(segundos)), at: Date.now() };
    window.localStorage.setItem(LS, JSON.stringify(m));
  } catch {
    /* sem localStorage: a escuta funciona, só não lembra */
  }
}

/** A última faixa ouvida, para o botão "continuar". */
export function ultimaOuvida(): { faixa: Faixa; s: number } | null {
  const m = ler();
  const ordenado = Object.entries(m).sort((a, b) => b[1].at - a[1].at);
  for (const [slug, v] of ordenado) {
    const faixa = FAIXAS.find((f) => f.slug === slug);
    if (faixa) return { faixa, s: v.s };
  }
  return null;
}

/* ---------------- guardar no aparelho ---------------- */

export async function jaGuardado(url: string): Promise<boolean> {
  try {
    return !!(await (await caches.open(CACHE_AUDIO)).match(url));
  } catch {
    return false;
  }
}

export async function guardar(url: string): Promise<boolean> {
  try {
    await (await caches.open(CACHE_AUDIO)).add(url);
    return true;
  } catch {
    return false;
  }
}

export async function guardarTudo(aoProgredir: (feitas: number, total: number) => void) {
  const c = await caches.open(CACHE_AUDIO);
  let n = 0;
  for (const f of FAIXAS) {
    try { await c.add(f.url); } catch { /* uma faixa que falha não derruba as outras */ }
    aoProgredir(++n, FAIXAS.length);
  }
}

export async function tamanhoGuardado(): Promise<number> {
  try {
    const c = await caches.open(CACHE_AUDIO);
    let total = 0;
    for (const req of await c.keys()) {
      const r = await c.match(req);
      if (r) total += (await r.blob()).size;
    }
    return total;
  } catch {
    return 0;
  }
}
