/**
 * livros/page.tsx — a estante.
 *
 * Lista os livros com a barra de progresso de cada um e um bloco "continuar
 * lendo" no topo, que é o que interessa em viagem: abrir o app e cair de volta
 * onde parou, sem rede.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Baixar from "./baixar";
import {
  LIVROS, TOTAL_MINUTOS, TOTAL_PALAVRAS, getTodos, proximoLivro, resumoGeral,
  type Progresso,
} from "@/lib/livros";
import { FAIXAS } from "@/lib/audiolivro";

export default function Estante() {
  const [mapa, setMapa] = useState<Record<string, Progresso>>({});

  // localStorage só existe no cliente: lê depois da montagem para não quebrar o export estático.
  useEffect(() => setMapa(getTodos()), []);

  const resumo = resumoGeral(mapa);
  const retomar = proximoLivro(mapa);

  return (
    <div className="px-4 pt-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Livros</h1>
        <p className="mt-1 text-sm text-[var(--fg-dim)]">
          Do químico aromático ao produto — {LIVROS.length} livros, {(TOTAL_PALAVRAS / 1000).toFixed(0)} mil
          palavras, ~{Math.round(TOTAL_MINUTOS / 60)} h de leitura. Funciona sem internet.
        </p>
      </header>

      <div className="mb-5 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold">Seu progresso</span>
          <span className="text-sm font-bold" style={{ color: "var(--fam)" }}>{resumo.pct}%</span>
        </div>
        <Barra pct={resumo.pct} />
        <p className="mt-2 text-xs text-[var(--muted)]">
          {resumo.comecados} começado{resumo.comecados === 1 ? "" : "s"} · {resumo.terminados} terminado
          {resumo.terminados === 1 ? "" : "s"}
        </p>
      </div>

      <Link
        href="/livros/audio"
        className="mb-4 flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ background: "var(--fam-soft)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M8 5l11 7-11 7z" fill="var(--fam)" />
          </svg>
        </span>
        <span className="min-w-0">
          <span className="block font-semibold">Ouvir o audiolivro</span>
          <span className="block text-xs text-[var(--fg-dim)]">
            {FAIXAS.length} capítulos narrados · dá para guardar no aparelho
          </span>
        </span>
      </Link>

      <Baixar />

      {retomar && (
        <Link
          href={`/livros/${retomar.livro.slug}`}
          className="mb-5 block rounded-[var(--r-md)] border p-4"
          style={{ borderColor: "var(--fam)", background: "var(--fam-soft)" }}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--fam)" }}>
            Continuar lendo
          </span>
          <p className="mt-1 font-semibold">{retomar.livro.titulo}</p>
          <p className="mt-0.5 text-xs text-[var(--fg-dim)]">
            {retomar.p.pct}% lido · parou em “{secaoTitulo(retomar.livro.slug, retomar.p.secao)}”
          </p>
        </Link>
      )}

      <ul className="space-y-2.5 pb-8">
        {LIVROS.map((l) => {
          const p = mapa[l.slug];
          const pct = p?.pct ?? 0;
          return (
            <li key={l.slug}>
              <Link
                href={`/livros/${l.slug}`}
                className="block rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-4
                           transition-colors active:bg-[var(--surface-2)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug">{l.titulo}</p>
                    <p className="mt-0.5 text-xs text-[var(--fg-dim)]">{l.subtitulo}</p>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold text-[var(--muted)]">
                    {l.minutos} min
                  </span>
                </div>
                {pct > 0 && (
                  <div className="mt-3">
                    <Barra pct={pct} />
                    <p className="mt-1 text-[11px] text-[var(--muted)]">
                      {pct >= 95 ? "Lido" : `${pct}% lido`}
                    </p>
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Barra({ pct }: { pct: number }) {
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${Math.max(2, pct)}%`, background: "var(--fam)" }}
      />
    </div>
  );
}

function secaoTitulo(slug: string, id: string) {
  const l = LIVROS.find((x) => x.slug === slug);
  return l?.secoes.find((s) => s.id === id)?.titulo ?? "abertura";
}
