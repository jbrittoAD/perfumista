/**
 * livros/audio/page.tsx — o audiolivro.
 *
 * Um player só, com a lista de capítulos embaixo. Decisões que vêm do uso real
 * (fone, tablet, avião):
 *   - a posição é salva a cada 5 s e ao pausar, e o capítulo reabre onde parou;
 *   - dá para guardar capítulo a capítulo ou tudo de uma vez — o áudio não entra
 *     no precache porque são ~50 MB;
 *   - velocidade de leitura ajustável: livro técnico se ouve devagar na primeira
 *     vez e rápido na revisão.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FAIXAS, guardar, guardarTudo, jaGuardado, posicao, salvarPosicao,
  tamanhoGuardado, ultimaOuvida, type Faixa,
} from "@/lib/audiolivro";

const VELOCIDADES = [0.9, 1, 1.15, 1.3, 1.5];

export default function Audiolivro() {
  const audio = useRef<HTMLAudioElement>(null);
  const [atual, setAtual] = useState<Faixa | null>(null);
  const [tocando, setTocando] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [vel, setVel] = useState(1);
  const [guardadas, setGuardadas] = useState<Set<string>>(new Set());
  const [baixando, setBaixando] = useState<string | null>(null);
  const [mb, setMb] = useState(0);
  // posição a aplicar quando os metadados chegarem: definir currentTime logo
  // após trocar o src é ignorado pelo navegador (readyState ainda 0), e era
  // isso que fazia o "continuar de onde parou" falhar.
  const retomarEm = useRef(0);

  useEffect(() => {
    (async () => {
      const s = new Set<string>();
      for (const f of FAIXAS) if (await jaGuardado(f.url)) s.add(f.slug);
      setGuardadas(s);
      setMb((await tamanhoGuardado()) / 1048576);
      const u = ultimaOuvida();
      if (u) { setAtual(u.faixa); setT(u.s); }
    })();
  }, []);

  const tocar = useCallback((f: Faixa) => {
    setAtual(f);
    requestAnimationFrame(() => {
      const el = audio.current;
      if (!el) return;
      el.src = f.url;
      retomarEm.current = posicao(f.slug);
      el.playbackRate = vel;
      el.play().then(() => setTocando(true)).catch(() => setTocando(false));
    });
  }, [vel]);

  // salva a cada 5 s: frequente o bastante para não perder, raro o bastante para não pesar
  useEffect(() => {
    if (!atual || !tocando) return;
    const id = setInterval(() => {
      if (audio.current) salvarPosicao(atual.slug, audio.current.currentTime);
    }, 5000);
    return () => clearInterval(id);
  }, [atual, tocando]);

  async function baixar(f: Faixa) {
    setBaixando(f.slug);
    if (await guardar(f.url)) setGuardadas((s) => new Set(s).add(f.slug));
    setMb((await tamanhoGuardado()) / 1048576);
    setBaixando(null);
  }

  async function baixarTudo() {
    setBaixando("tudo");
    await guardarTudo((feitas, total) => setBaixando(`tudo:${feitas}/${total}`));
    const s = new Set<string>();
    for (const f of FAIXAS) if (await jaGuardado(f.url)) s.add(f.slug);
    setGuardadas(s);
    setMb((await tamanhoGuardado()) / 1048576);
    setBaixando(null);
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <header className="mb-4 flex items-center gap-3">
        <Link href="/livros" aria-label="Voltar" className="text-[var(--fg-dim)]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Audiolivro</h1>
          <p className="text-xs text-[var(--fg-dim)]">
            {FAIXAS.length} capítulos · voz Francisca · {guardadas.size}/{FAIXAS.length} no aparelho
            {mb > 0 && ` (${mb.toFixed(0)} MB)`}
          </p>
        </div>
      </header>

      {/* player */}
      <div className="sticky top-0 z-30 mb-4 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="truncate text-sm font-semibold">{atual ? atual.titulo : "Escolha um capítulo"}</p>
        <input
          type="range" min={0} max={dur || 0} value={t} aria-label="Posição"
          onChange={(e) => { const v = Number(e.target.value); setT(v); if (audio.current) audio.current.currentTime = v; }}
          className="mt-3 w-full accent-[var(--fam)]"
        />
        <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
          <span>{hhmm(t)}</span><span>{hhmm(dur)}</span>
        </div>
        <div className="mt-2 flex items-center justify-center gap-4">
          <button onClick={() => audio.current && (audio.current.currentTime -= 15)} className="text-xs font-bold text-[var(--fg-dim)]">−15s</button>
          <button
            onClick={() => {
              const el = audio.current; if (!el || !atual) return;
              // Ao reabrir o app, o capítulo aparece no player mas o <audio>
              // ainda não tem src (só o estado foi restaurado). Sem isto, o
              // primeiro toque no play não fazia nada.
              if (!el.currentSrc) { tocar(atual); return; }
              if (el.paused) { el.play().then(() => setTocando(true)).catch(() => setTocando(false)); }
              else { el.pause(); setTocando(false); salvarPosicao(atual.slug, el.currentTime); }
            }}
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "var(--fam)", color: "#000" }}
            aria-label={tocando ? "Pausar" : "Tocar"}
          >
            {tocando
              ? <svg width="20" height="20" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" fill="currentColor"/><rect x="14" y="5" width="4" height="14" fill="currentColor"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24"><path d="M7 4l12 8-12 8z" fill="currentColor"/></svg>}
          </button>
          <button onClick={() => audio.current && (audio.current.currentTime += 30)} className="text-xs font-bold text-[var(--fg-dim)]">+30s</button>
        </div>
        <div className="mt-3 flex justify-center gap-1.5">
          {VELOCIDADES.map((v) => (
            <button key={v} onClick={() => { setVel(v); if (audio.current) audio.current.playbackRate = v; }}
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={v === vel ? { background: "var(--fam-soft)", color: "var(--fam)" } : { color: "var(--muted)" }}>
              {v}×
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={baixarTudo}
        disabled={!!baixando}
        className="mb-4 w-full rounded-[var(--r-sm)] border border-[var(--border)] px-3 py-2.5 text-xs font-bold text-[var(--fg-dim)] disabled:opacity-60"
      >
        {baixando?.startsWith("tudo")
          ? `Guardando ${baixando.split(":")[1] ?? ""}…`
          : guardadas.size === FAIXAS.length ? "Tudo guardado no aparelho ✓" : "Guardar todos os capítulos no aparelho"}
      </button>

      <ul className="space-y-1.5 pb-6">
        {FAIXAS.map((f) => (
          <li key={f.slug} className="flex items-center gap-2 rounded-[var(--r-sm)] border border-[var(--border-soft)] bg-[var(--surface)] p-3">
            <button onClick={() => tocar(f)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm" style={{ color: atual?.slug === f.slug ? "var(--fam)" : "var(--fg)" }}>{f.titulo}</p>
              {posicao(f.slug) > 0 && <p className="text-[11px] text-[var(--muted)]">parou em {hhmm(posicao(f.slug))}</p>}
            </button>
            <button
              onClick={() => baixar(f)}
              disabled={guardadas.has(f.slug) || baixando === f.slug}
              aria-label={`Guardar ${f.titulo}`}
              className="shrink-0 rounded px-2 py-1 text-[11px] font-bold"
              style={guardadas.has(f.slug) ? { color: "var(--like)" } : { color: "var(--muted)" }}
            >
              {guardadas.has(f.slug) ? "✓" : baixando === f.slug ? "…" : "↓"}
            </button>
          </li>
        ))}
      </ul>

      <audio
        ref={audio}
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          setDur(e.currentTarget.duration);
          if (retomarEm.current > 0) {
            e.currentTarget.currentTime = retomarEm.current;
            retomarEm.current = 0;
          }
        }}
        onEnded={() => { setTocando(false); if (atual) salvarPosicao(atual.slug, 0); }}
        preload="metadata"
      />
    </div>
  );
}

function hhmm(s: number) {
  if (!s || !isFinite(s)) return "0:00";
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}
