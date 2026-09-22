/**
 * livros.ts — o ebook dentro do app.
 *
 * Os textos vêm de `lib/data/books.json`, gerado por `scripts/build_books.py`
 * a partir de knowledge/ebook/*.md. O JSON é importado ESTATICAMENTE (entra no
 * bundle) porque o requisito é ler no avião: nada pode depender de rede.
 *
 * O progresso de leitura mora numa chave PRÓPRIA do localStorage
 * (`perfumista:livros`), separada do estado do deck (`perfumista:deck-state`).
 * São dois assuntos independentes — perder um nunca pode derrubar o outro.
 */

import data from "./data/books.json";

export type Secao = { id: string; titulo: string; html: string };
export type Livro = {
  slug: string;
  titulo: string;
  subtitulo: string;
  palavras: number;
  minutos: number;
  secoes: Secao[];
};

export const LIVROS: Livro[] = (data as { livros: Livro[] }).livros;
export const getLivro = (slug: string) => LIVROS.find((l) => l.slug === slug);

export const TOTAL_PALAVRAS = LIVROS.reduce((a, l) => a + l.palavras, 0);
export const TOTAL_MINUTOS = LIVROS.reduce((a, l) => a + l.minutos, 0);

/* ------------------------------------------------------------------ */
/* Progresso de leitura                                                */
/* ------------------------------------------------------------------ */

export type Progresso = {
  /** 0–100, quanto do livro já passou pela tela */
  pct: number;
  /** posição de rolagem, para reabrir exatamente onde parou */
  y: number;
  /** id da última seção vista — é o que a lista mostra */
  secao: string;
  /** timestamp da última leitura */
  at: number;
};

const LS_KEY = "perfumista:livros";
type Mapa = Record<string, Progresso>;

function ler(): Mapa {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Mapa) : {};
  } catch {
    /* localStorage bloqueado (aba privada): o app segue, só não lembra */
    return {};
  }
}

function gravar(mapa: Mapa) {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(mapa));
  } catch {
    /* sem espaço ou sem permissão: não é motivo para quebrar a leitura */
  }
}

export function getProgresso(slug: string): Progresso | null {
  return ler()[slug] ?? null;
}

export function getTodos(): Mapa {
  return ler();
}

/** Grava o avanço. Só sobe o pct — voltar no texto não apaga o que já foi lido. */
export function salvarProgresso(slug: string, p: Omit<Progresso, "at">) {
  const mapa = ler();
  const anterior = mapa[slug];
  mapa[slug] = {
    pct: Math.max(anterior?.pct ?? 0, Math.min(100, Math.round(p.pct))),
    y: Math.max(0, Math.round(p.y)),
    secao: p.secao,
    at: Date.now(),
  };
  gravar(mapa);
}

export function limparProgresso(slug: string) {
  const mapa = ler();
  delete mapa[slug];
  gravar(mapa);
}

/** Resumo para a tela inicial da aba: quanto do ebook inteiro já foi lido. */
export function resumoGeral(mapa: Mapa) {
  const lidos = LIVROS.reduce((acc, l) => acc + ((mapa[l.slug]?.pct ?? 0) / 100) * l.palavras, 0);
  return {
    pct: TOTAL_PALAVRAS ? Math.round((lidos / TOTAL_PALAVRAS) * 100) : 0,
    comecados: LIVROS.filter((l) => (mapa[l.slug]?.pct ?? 0) > 0).length,
    terminados: LIVROS.filter((l) => (mapa[l.slug]?.pct ?? 0) >= 95).length,
  };
}

/** O livro que o usuário deve retomar: o mais recente que não terminou. */
export function proximoLivro(mapa: Mapa): { livro: Livro; p: Progresso } | null {
  const abertos = LIVROS.map((l) => ({ livro: l, p: mapa[l.slug] }))
    .filter((x): x is { livro: Livro; p: Progresso } => !!x.p && x.p.pct < 95)
    .sort((a, b) => b.p.at - a.p.at);
  return abertos[0] ?? null;
}
