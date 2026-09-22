/**
 * leitor.tsx — a leitura.
 *
 * Três coisas que o uso real (avião, tablet, sem rede) exige:
 *  1. Retomar exatamente onde parou — restaura a rolagem ao abrir.
 *  2. Salvar sozinho, sem botão — grava durante a rolagem (throttle) e ao sair.
 *  3. Nunca perder — grava também em `visibilitychange`, que é o evento que
 *     dispara quando o app vai para segundo plano no iOS/Android.
 *
 * O progresso é por LIVRO (pct + posição + seção), guardado em
 * `perfumista:livros`. Não encosta na paleta de químicos.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getLivro, getProgresso, salvarProgresso } from "@/lib/livros";

export default function Leitor({ slug }: { slug: string }) {
  const livro = getLivro(slug)!;
  const [pct, setPct] = useState(0);
  const [indice, setIndice] = useState(false);
  const [restaurado, setRestaurado] = useState(false);
  const secaoRef = useRef<string>(livro.secoes[0]?.id ?? "abertura");
  // Em 9 dos 17 livros a "Abertura" é só o <h1> — no seletor ela vira uma
  // entrada que não leva a lugar nenhum. Filtra no índice, e NÃO nos dados: o
  // progresso de leitura guarda o id da seção, e renumerar perderia onde você
  // parou.
  const secoesDoIndice = livro.secoes.filter(
    (s) => s.html.replace(/<[^>]+>/g, " ").trim().length > 60,
  );
  const ultimoSalvo = useRef(0);
  // último estado REAL medido com a página montada. Na saída gravamos isto, e
  // não uma medição nova: ao desmontar, o documento já está encolhendo e o
  // cálculo daria ~100% — marcaria como lido um livro que ficou pela metade.
  const ultimoEstado = useRef<{ pct: number; y: number; secao: string } | null>(null);

  /* ---- retomar onde parou -------------------------------------- */
  useEffect(() => {
    const p = getProgresso(slug);
    if (p && p.y > 0) {
      // dois frames: o layout precisa existir antes de rolar
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, p.y)));
      setPct(p.pct);
      secaoRef.current = p.secao;
    }
    setRestaurado(true);
  }, [slug]);

  /* ---- qual seção está na tela --------------------------------- */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) if (e.isIntersecting) secaoRef.current = e.target.id;
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    document.querySelectorAll("[data-secao]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [slug]);

  const salvar = useCallback(() => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    // página curta demais ou ainda sem layout: não dá para medir, não grava
    if (total < 200) return;
    const y = window.scrollY;
    const p = Math.min(100, (y / total) * 100);
    setPct(Math.round(p));
    ultimoEstado.current = { pct: p, y, secao: secaoRef.current };
    salvarProgresso(slug, ultimoEstado.current);
  }, [slug]);

  /** Na saída: grava o que foi medido por último, sem recalcular. */
  const salvarNaSaida = useCallback(() => {
    if (ultimoEstado.current) salvarProgresso(slug, ultimoEstado.current);
  }, [slug]);

  /* ---- salvar durante a rolagem, e ao sair --------------------- */
  useEffect(() => {
    if (!restaurado) return;
    const onScroll = () => {
      const agora = Date.now();
      if (agora - ultimoSalvo.current < 400) return; // throttle: não escreve a cada pixel
      ultimoSalvo.current = agora;
      salvar();
    };
    const onHide = () => { if (document.visibilityState === "hidden") salvar(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", salvar);
    return () => {
      salvarNaSaida();
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", salvar);
    };
  }, [restaurado, salvar, salvarNaSaida]);

  return (
    <div>
      {/* barra fixa: voltar, progresso e índice */}
      <div className="sticky top-0 z-30 border-b border-[var(--border-soft)] bg-[var(--bg)]/92 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/livros" aria-label="Voltar para a estante" className="text-[var(--fg-dim)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{livro.titulo}</p>
          <button
            onClick={() => setIndice((v) => !v)}
            aria-expanded={indice}
            className="rounded-[var(--r-sm)] px-2 py-1 text-xs font-semibold"
            style={{ color: "var(--fam)", background: "var(--fam-soft)" }}
          >
            Índice
          </button>
        </div>
        <div className="h-1 w-full bg-[var(--surface-2)]">
          <div className="h-full transition-[width] duration-200" style={{ width: `${pct}%`, background: "var(--fam)" }} />
        </div>
      </div>

      {indice && (
        <nav className="border-b border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3">
          <ul className="space-y-1.5">
            {secoesDoIndice.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={() => setIndice(false)}
                  className="block truncate text-sm text-[var(--fg-dim)]"
                >
                  {s.titulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <article className="prose-livro px-4 py-5">
        {livro.secoes.map((s) => (
          <section key={s.id} id={s.id} data-secao dangerouslySetInnerHTML={{ __html: s.html }} />
        ))}
        <footer className="mt-10 border-t border-[var(--border-soft)] pt-5 text-sm text-[var(--muted)]">
          <p>Fim de “{livro.titulo}”.</p>
          <Link href="/livros" className="mt-2 inline-block font-semibold" style={{ color: "var(--fam)" }}>
            ← Voltar para a estante
          </Link>
        </footer>
      </article>
    </div>
  );
}
