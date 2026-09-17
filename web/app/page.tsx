/**
 * page.tsx — "Descobrir": o deck de swipe. É a tela principal do app.
 *
 * MECÂNICA
 *   arrasta para a direita  → vai para o Meu Laboratório (quero/tenho interesse)
 *   arrasta para a esquerda → descarta (reversível: dá para desfazer e para
 *                             revisar tudo depois)
 *   toque na carta          → ficha completa
 *
 * ORDEM DO BARALHO (não é aleatório, de propósito)
 *   As cartas vêm agrupadas por FAMÍLIA OLFATIVA e, dentro da família, na ordem
 *   de proximidade de cheiro calculada no build — todos os limões, depois as
 *   bergamotas, depois as laranjas. Estudar a família inteira de uma vez é o que
 *   treina o nariz; sortear embaralha referência com referência e não ensina.
 *   O usuário pode escolher qual família "jogar" na barra de cima.
 *
 * IMPLEMENTAÇÃO DO ARRASTO
 *   Pointer Events + escrita DIRETA no style durante o movimento (sem setState
 *   por frame): é o que segura 60fps em celular. O React só entra quando a
 *   carta é efetivamente decidida.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Card from "./card";
import Detail from "./detail";
import {
  CARDS, FAMILIES, TOTAL, cardsOfFamily, familyMeta,
  type FamilySlug, type Ingredient,
} from "@/lib/deck";
import {
  recordSwipe, clearSwipe, setCursor, resetPassed, resetAll,
  useDeckState, type SwipeDir,
} from "@/lib/deck-store";

const ALL = "all" as const;
type Selection = FamilySlug | typeof ALL;

const FLY_MS = 280;

export default function Discover() {
  const state = useDeckState();
  const [selection, setSelection] = useState<Selection>(ALL);
  const [epoch, setEpoch] = useState(0); // força remontagem da fila
  const [idx, setIdx] = useState(0);
  const [flying, setFlying] = useState<SwipeDir | null>(null);
  const [detail, setDetail] = useState<Ingredient | null>(null);
  const [lastDecided, setLastDecided] = useState<number | null>(null);

  const decided = state.swipes;

  /* --------------------------------------------------------------
     A fila é um SNAPSHOT: montada quando a família muda (ou no reset),
     nunca no meio do swipe. Se ela mudasse a cada decisão, a carta de
     baixo trocaria embaixo do dedo do usuário.
     -------------------------------------------------------------- */
  const queue = useMemo<Ingredient[]>(() => {
    if (!state.ready) return [];
    const pool = selection === ALL ? CARDS : cardsOfFamily(selection);
    return pool.filter((c) => !decided[c.id]);
    // `decided` de propósito fora das deps: só reavalia em troca de família/epoch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, epoch, state.ready]);

  // Ao (re)montar a fila, retoma de onde parou naquela família.
  useEffect(() => {
    if (!state.ready) return;
    setIdx(0);
    setFlying(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, epoch, state.ready]);

  const current = queue[idx] ?? null;
  const next = queue[idx + 1] ?? null;
  const after = queue[idx + 2] ?? null;

  // Guarda a carta em tela como "última vista" (o app reabre por ela).
  useEffect(() => {
    if (!current) return;
    setCursor(current.family, current.seq, current.id);
  }, [current]);

  const fam = familyMeta(current?.family ?? (selection === ALL ? "citrus" : selection));

  /* ---------------- gestos ---------------- */
  const topRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);
  const likeRef = useRef<HTMLDivElement>(null);
  const passRef = useRef<HTMLDivElement>(null);
  // `axis` trava o gesto no primeiro movimento: horizontal é swipe, vertical é
  // leitura da ficha dentro da carta. Sem isso, rolar o texto jogava a carta fora.
  const drag = useRef({
    on: false, x0: 0, y0: 0, dx: 0, dy: 0, t0: 0, moved: false,
    axis: null as null | "x" | "y",
  });

  const paint = useCallback((dx: number, dy: number, instant = true) => {
    const el = topRef.current;
    if (!el) return;
    const rot = Math.max(-15, Math.min(15, dx * 0.055));
    el.style.transition = instant ? "none" : `transform ${FLY_MS}ms ease-out, opacity ${FLY_MS}ms ease-out`;
    el.style.transform = `translate3d(${dx}px, ${dy * 0.32}px, 0) rotate(${rot}deg)`;
    const p = Math.min(1, Math.abs(dx) / 110);
    if (likeRef.current) likeRef.current.style.opacity = dx > 0 ? String(p) : "0";
    if (passRef.current) passRef.current.style.opacity = dx < 0 ? String(p) : "0";
    if (nextRef.current) {
      nextRef.current.style.transform = `scale(${0.945 + 0.055 * p}) translateY(${(1 - p) * 10}px)`;
    }
  }, []);

  const reset = useCallback(() => {
    const el = topRef.current;
    if (el) {
      el.style.transition = "transform 220ms cubic-bezier(.2,.8,.3,1)";
      el.style.transform = "translate3d(0,0,0) rotate(0deg)";
    }
    if (likeRef.current) likeRef.current.style.opacity = "0";
    if (passRef.current) passRef.current.style.opacity = "0";
    if (nextRef.current) nextRef.current.style.transform = "scale(0.945) translateY(10px)";
  }, []);

  const commit = useCallback(
    (dir: SwipeDir) => {
      const card = queue[idx];
      if (!card || flying) return;
      setFlying(dir);
      const el = topRef.current;
      if (el) {
        const w = (el.offsetWidth || 340) * 1.6;
        el.style.transition = `transform ${FLY_MS}ms ease-out, opacity ${FLY_MS}ms ease-out`;
        el.style.transform = `translate3d(${dir === "like" ? w : -w}px, 40px, 0) rotate(${dir === "like" ? 22 : -22}deg)`;
        el.style.opacity = "0";
      }
      if (nextRef.current) nextRef.current.style.transform = "scale(1) translateY(0)";
      window.setTimeout(() => {
        recordSwipe(card.id, dir);
        setLastDecided(card.id);
        setIdx((i) => i + 1);
        setFlying(null);
        if (el) {
          el.style.transition = "none";
          el.style.transform = "translate3d(0,0,0)";
          el.style.opacity = "1";
        }
        if (likeRef.current) likeRef.current.style.opacity = "0";
        if (passRef.current) passRef.current.style.opacity = "0";
      }, FLY_MS);
    },
    [queue, idx, flying],
  );

  const undo = useCallback(() => {
    if (lastDecided == null || flying) return;
    clearSwipe(lastDecided);
    setLastDecided(null);
    setIdx((i) => Math.max(0, i - 1));
  }, [lastDecided, flying]);

  function onDown(e: React.PointerEvent) {
    if (flying || !current) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = {
      on: true, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0,
      t0: performance.now(), moved: false, axis: null,
    };
  }

  function onMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d.on) return;
    d.dx = e.clientX - d.x0;
    d.dy = e.clientY - d.y0;

    if (!d.axis) {
      if (Math.abs(d.dx) < 8 && Math.abs(d.dy) < 8) return; // ainda indefinido
      d.axis = Math.abs(d.dx) > Math.abs(d.dy) ? "x" : "y";
      if (d.axis === "y") {
        // é rolagem da ficha: solta o gesto e deixa o navegador cuidar
        d.on = false;
        return;
      }
      d.moved = true;
    }
    d.moved = true;
    paint(d.dx, d.dy);
  }

  function onUp() {
    const d = drag.current;
    if (!d.on) {
      // gesto virou rolagem vertical: nada a decidir
      drag.current.axis = null;
      return;
    }
    d.on = false;
    const dt = performance.now() - d.t0;
    const vel = d.dx / Math.max(1, dt); // px/ms
    const el = topRef.current;
    const threshold = (el?.offsetWidth ?? 340) * 0.3;
    if (Math.abs(d.dx) > threshold || Math.abs(vel) > 0.6) {
      commit(d.dx > 0 ? "like" : "pass");
    } else if (!d.moved && dt < 400) {
      reset();
      if (current) setDetail(current);
    } else {
      reset();
    }
  }

  // Teclado (útil no desktop e para acessibilidade).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (detail) return;
      if (e.key === "ArrowRight") commit("like");
      else if (e.key === "ArrowLeft") commit("pass");
      else if (e.key === "Enter" && current) setDetail(current);
      else if (e.key === "Backspace") undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit, undo, current, detail]);

  /* ---------------- contadores ---------------- */
  const seenCount = Object.keys(decided).length;
  const remainingBySelection = useMemo(() => {
    const map = new Map<Selection, number>();
    map.set(ALL, CARDS.filter((c) => !decided[c.id]).length);
    for (const f of FAMILIES) {
      map.set(f.slug, cardsOfFamily(f.slug).filter((c) => !decided[c.id]).length);
    }
    return map;
  }, [decided]);

  const famDone = selection === ALL ? seenCount : cardsOfFamily(selection).filter((c) => decided[c.id]).length;
  const famTotal = selection === ALL ? TOTAL : cardsOfFamily(selection).length;

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        ["--fam" as string]: fam.hex,
        // A altura é travada na viewport útil (menos a tab bar): o deck não rola,
        // então os botões de ação nunca saem da tela nem no aparelho mais baixo.
        height: "calc(100dvh - var(--tab-h) - env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* ---------- barra de famílias ---------- */}
      <header className="sticky top-0 z-20 bg-[var(--bg)]/92 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl">
        <div className="flex items-baseline justify-between px-4 pt-3">
          <h1 className="text-[15px] font-bold tracking-tight">Descobrir</h1>
          <span className="text-[11.5px] text-[var(--muted)]">
            {famDone} de {famTotal} vistos
          </span>
        </div>

        <div className="mt-2 px-4">
          <div className="h-[3px] overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${famTotal ? (famDone / famTotal) * 100 : 0}%`, background: "var(--fam)" }}
            />
          </div>
        </div>

        <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto px-4 pb-3">
          <FamilyPill
            active={selection === ALL}
            label="Tudo"
            emoji="✨"
            hex="#d9a441"
            count={remainingBySelection.get(ALL) ?? 0}
            onClick={() => setSelection(ALL)}
          />
          {FAMILIES.map((f) => (
            <FamilyPill
              key={f.slug}
              active={selection === f.slug}
              label={f.label}
              emoji={f.emoji}
              hex={f.hex}
              count={remainingBySelection.get(f.slug) ?? 0}
              onClick={() => setSelection(f.slug)}
            />
          ))}
        </div>
      </header>

      {/* ---------- deck ---------- */}
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-3">
        {!state.ready ? (
          <div className="grid flex-1 place-items-center text-[13px] text-[var(--muted)]">
            Carregando seu progresso…
          </div>
        ) : current ? (
          <>
            {selection !== ALL && current.seq === 0 && (
              <p className="mb-2 shrink-0 text-[12px] leading-snug text-[var(--muted)]">
                <span style={{ color: "var(--fam)" }}>●</span> {fam.blurb}
              </p>
            )}

            <div className="relative mx-auto w-full min-h-0 max-w-[26rem] flex-1">
              {/* 3ª carta: só profundidade */}
              {after && (
                <div
                  className="absolute inset-0"
                  style={{ transform: "scale(0.89) translateY(20px)", filter: "brightness(0.55)" }}
                >
                  <Card card={after} dimmed />
                </div>
              )}
              {/* 2ª carta */}
              {next && (
                <div
                  ref={nextRef}
                  className="absolute inset-0"
                  style={{ transform: "scale(0.945) translateY(10px)", transition: "transform 160ms ease-out" }}
                >
                  <Card card={next} eager dimmed />
                </div>
              )}
              {/* carta ativa */}
              <div
                ref={topRef}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                role="button"
                tabIndex={0}
                aria-label={`${current.name}. Arraste para a direita para salvar no laboratório, para a esquerda para descartar. Toque para ver ofertas e ficha técnica.`}
                className="absolute inset-0 cursor-grab active:cursor-grabbing"
                style={{ touchAction: "pan-y" }}
              >
                <Card card={current} eager />
                <div
                  ref={likeRef}
                  className="stamp left-6 -rotate-12"
                  style={{ opacity: 0, color: "var(--like)", borderColor: "var(--like)", background: "rgb(0 0 0 / .35)" }}
                >
                  Gostei
                </div>
                <div
                  ref={passRef}
                  className="stamp right-6 rotate-12"
                  style={{ opacity: 0, color: "var(--pass)", borderColor: "var(--pass)", background: "rgb(0 0 0 / .35)" }}
                >
                  Descartado
                </div>
              </div>
            </div>

            {/* ---------- ações ---------- */}
            <div className="mt-3.5 flex shrink-0 items-center justify-center gap-4">
              <ActionButton label="Descartar" onClick={() => commit("pass")} color="var(--pass)" size="lg">
                ✕
              </ActionButton>
              <ActionButton
                label="Desfazer"
                onClick={undo}
                color="var(--muted)"
                size="sm"
                disabled={lastDecided == null}
              >
                ↺
              </ActionButton>
              <ActionButton label="Ofertas e ficha técnica" onClick={() => setDetail(current)} color="var(--fam)" size="sm">
                ℹ
              </ActionButton>
              <ActionButton label="Gostei" onClick={() => commit("like")} color="var(--like)" size="lg">
                ♥
              </ActionButton>
            </div>
          </>
        ) : (
          <EmptyState
            selection={selection}
            famLabel={selection === ALL ? "o baralho inteiro" : fam.label}
            passedCount={Object.values(decided).filter((s) => s.dir === "pass").length}
            onReviewPassed={() => {
              resetPassed();
              setEpoch((e) => e + 1);
            }}
            onResetAll={() => {
              resetAll();
              setEpoch((e) => e + 1);
            }}
            onNextFamily={() => {
              const order = FAMILIES.map((f) => f.slug);
              const start = selection === ALL ? -1 : order.indexOf(selection);
              for (let i = 1; i <= order.length; i++) {
                const cand = order[(start + i) % order.length];
                if ((remainingBySelection.get(cand) ?? 0) > 0) {
                  setSelection(cand);
                  return;
                }
              }
              setSelection(ALL);
            }}
            hasNextFamily={FAMILIES.some((f) => (remainingBySelection.get(f.slug) ?? 0) > 0)}
          />
        )}
      </div>

      {detail && (
        <Detail
          card={detail}
          liked={decided[detail.id] ? decided[detail.id].dir === "like" : null}
          onClose={() => setDetail(null)}
          onLike={() => {
            recordSwipe(detail.id, "like");
            setLastDecided(detail.id);
            if (current?.id === detail.id) setIdx((i) => i + 1);
            setDetail(null);
          }}
          onPass={() => {
            recordSwipe(detail.id, "pass");
            setLastDecided(detail.id);
            if (current?.id === detail.id) setIdx((i) => i + 1);
            setDetail(null);
          }}
          onRemove={() => {
            clearSwipe(detail.id);
            setDetail(null);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function FamilyPill({
  active, label, emoji, hex, count, onClick,
}: {
  active: boolean; label: string; emoji: string; hex: string; count: number; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px]
                 font-semibold transition-colors"
      style={{
        borderColor: active ? hex : "var(--border)",
        background: active ? `color-mix(in srgb, ${hex} 18%, transparent)` : "var(--surface)",
        color: active ? `color-mix(in srgb, ${hex} 75%, white)` : "var(--muted)",
        opacity: count === 0 && !active ? 0.45 : 1,
      }}
    >
      <span aria-hidden>{emoji}</span>
      {label}
      <span className="text-[10.5px] font-normal opacity-70">{count}</span>
    </button>
  );
}

function ActionButton({
  children, label, onClick, color, size, disabled,
}: {
  children: React.ReactNode; label: string; onClick: () => void;
  color: string; size: "sm" | "lg"; disabled?: boolean;
}) {
  const dim = size === "lg" ? "h-[58px] w-[58px] text-[24px]" : "h-[46px] w-[46px] text-[18px]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`${dim} grid place-items-center rounded-full border-2 bg-[var(--surface)]
                  transition-transform active:scale-90 disabled:opacity-30`}
      style={{ borderColor: color, color }}
    >
      {children}
    </button>
  );
}

function EmptyState({
  selection, famLabel, passedCount, onReviewPassed, onResetAll, onNextFamily, hasNextFamily,
}: {
  selection: Selection; famLabel: string; passedCount: number;
  onReviewPassed: () => void; onResetAll: () => void; onNextFamily: () => void; hasNextFamily: boolean;
}) {
  return (
    <div className="grid flex-1 place-items-center py-10">
      <div className="panel w-full max-w-sm p-6 text-center">
        <p className="text-3xl" aria-hidden>🎉</p>
        <h2 className="mt-3 text-[17px] font-bold">
          Você passou por {selection === ALL ? "todo o baralho" : `toda a família ${famLabel}`}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
          Nada mais para decidir aqui. Os favoritos estão no Laboratório; os descartes
          continuam guardados e dá para revê-los quando quiser.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          {hasNextFamily && (
            <button type="button" onClick={onNextFamily} className="btn-fam">
              Próxima família com cartas
            </button>
          )}
          <Link href="/lab" className="btn-ghost">Ver meu laboratório</Link>
          {passedCount > 0 && (
            <button type="button" onClick={onReviewPassed} className="btn-ghost">
              Revisar os {passedCount} descartados
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Zerar todos os swipes? Os favoritos também somem.")) onResetAll();
            }}
            className="mt-1 text-[12px] text-[var(--muted)] underline"
          >
            Recomeçar do zero
          </button>
        </div>
      </div>
    </div>
  );
}
