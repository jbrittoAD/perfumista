"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { allLessons, modules, totalLessons } from "@/lib/course";
import { getDone, isQuizPassed } from "@/lib/course-progress";
import { getDue } from "@/lib/srs";
import { flashcardKeys } from "@/lib/review";
import metodo from "@/lib/data/metodo.json";
import SyncPanel from "./sync-panel";

const treinoNariz = (metodo as { treino_nariz: string[] }).treino_nariz;

const allQuizKeys: string[] = modules.flatMap((m) =>
  (m.quiz ?? []).map((_, i) => `quiz:${m.id}:${i}`),
);

const modulesWithQuiz = modules.filter((m) => (m.quiz?.length ?? 0) > 0);

/** Índice estável por dia: rotaciona o array pelo dia do ano. */
function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

type State = {
  doneCount: number;
  nextLesson: { id: string; title: string; module: string; position: number } | null;
  reviewsDue: number;
  quizzesPassed: number;
};

export default function TodayPanel() {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    const sync = () => {
      const done = getDone();
      const nextEntry = allLessons.find((e) => !done.has(e.lesson.id)) ?? null;
      // Considera flashcards já vistos (due) + questões erradas due; se nunca
      // estudou flashcards, propõe começar (0 due, mas mostramos CTA).
      const due = getDue([...flashcardKeys, ...allQuizKeys]).length;
      const quizzesPassed = modulesWithQuiz.reduce(
        (acc, m) => (isQuizPassed(m.id) ? acc + 1 : acc),
        0,
      );
      setState({
        doneCount: done.size,
        nextLesson: nextEntry
          ? {
              id: nextEntry.lesson.id,
              title: nextEntry.lesson.title,
              module: nextEntry.module.title,
              position: nextEntry.index + 1,
            }
          : null,
        reviewsDue: due,
        quizzesPassed,
      });
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  // exercício de nariz do dia (estável por data, roda pelo array)
  const noseExercise =
    treinoNariz.length > 0 ? treinoNariz[dayOfYear(new Date()) % treinoNariz.length] : null;

  if (!state) {
    return (
      <div className="space-y-4">
        <div className="ui-card h-32 animate-pulse bg-[var(--surface-2)]/40" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="ui-card h-40 animate-pulse bg-[var(--surface-2)]/40" />
          <div className="ui-card h-40 animate-pulse bg-[var(--surface-2)]/40" />
        </div>
      </div>
    );
  }

  const lessonPct = totalLessons > 0 ? Math.round((state.doneCount / totalLessons) * 100) : 0;
  const quizPct =
    modulesWithQuiz.length > 0
      ? Math.round((state.quizzesPassed / modulesWithQuiz.length) * 100)
      : 0;

  const started = state.doneCount > 0 || state.reviewsDue > 0;

  return (
    <div className="ui-rise space-y-5">
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[var(--accent)]/15 blur-3xl"
        />
        <p className="ui-eyebrow">{greeting()} · seu plano de hoje</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Bom te ver 👋
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">
          {started
            ? "Continue de onde parou — em ~30 min você limpa as revisões, avança uma aula e treina o nariz."
            : "Bora começar? Em ~30 min por dia você aprende perfumaria de verdade: revise, faça uma aula e treine o nariz."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link href="/revisar" className="ui-btn ui-btn-primary">
            {state.reviewsDue > 0 ? `Revisar ${state.reviewsDue} ${state.reviewsDue === 1 ? "item" : "itens"}` : "Estudar flashcards"}
          </Link>
          {state.nextLesson && (
            <Link
              href={`/curso/${encodeURIComponent(state.nextLesson.id)}`}
              className="ui-btn ui-btn-secondary"
            >
              Continuar aula
            </Link>
          )}
        </div>
      </section>

      {/* ---------- CARDS PRINCIPAIS ---------- */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* (b) Revisões due — destaque quando há pendências */}
        <section
          className={`ui-card p-5 ${
            state.reviewsDue > 0 ? "border-[var(--accent)]/50 bg-[var(--accent)]/[0.06]" : ""
          }`}
        >
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-lg">🔁</span>
            <h2 className="ui-section-title">Revisão espaçada</h2>
          </div>
          {state.reviewsDue > 0 ? (
            <p className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-[var(--accent)]">{state.reviewsDue}</span>
              <span className="text-sm text-[var(--muted)]">
                {state.reviewsDue === 1 ? "item vencendo hoje" : "itens vencendo hoje"}
              </span>
            </p>
          ) : (
            <p className="mt-3 text-sm text-emerald-300">Nada vencendo hoje — você está em dia. ✓</p>
          )}
          <Link
            href="/revisar"
            className={`mt-4 w-full sm:w-auto ${state.reviewsDue > 0 ? "ui-btn ui-btn-primary" : "ui-btn ui-btn-secondary"}`}
          >
            {state.reviewsDue > 0 ? "Revisar agora" : "Estudar flashcards"}
          </Link>
        </section>

        {/* (a) Próxima aula */}
        <section className="ui-card p-5">
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-lg">🎓</span>
            <h2 className="ui-section-title">Próxima aula</h2>
          </div>
          {state.nextLesson ? (
            <div className="mt-3">
              <p className="truncate text-xs uppercase tracking-wide text-[var(--muted)]">
                {state.nextLesson.module}
              </p>
              <p className="mt-1 font-medium leading-snug">
                <span className="text-[var(--muted)]">Aula {state.nextLesson.position}.</span>{" "}
                {state.nextLesson.title}
              </p>
              <Link
                href={`/curso/${encodeURIComponent(state.nextLesson.id)}`}
                className="ui-btn ui-btn-secondary mt-4 w-full sm:w-auto"
              >
                Continuar aula
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-emerald-300">
              Todas as {totalLessons} aulas concluídas! 🎉 Foque nas revisões e nos projetos.
            </p>
          )}
        </section>
      </div>

      {/* (c) Exercício de nariz do dia */}
      {noseExercise && (
        <section className="ui-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span aria-hidden className="text-lg">👃</span>
              <h2 className="ui-section-title">Exercício de nariz do dia</h2>
            </div>
            <Link
              href="/metodo"
              className="text-xs text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
            >
              ver todos →
            </Link>
          </div>
          <p className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm leading-relaxed">
            {noseExercise}
          </p>
        </section>
      )}

      {/* (d) Progresso geral */}
      <section className="ui-card p-5">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-lg">📈</span>
          <h2 className="ui-section-title">Seu progresso</h2>
        </div>
        <div className="mt-4 space-y-4">
          <ProgressRow
            label="Aulas concluídas"
            value={`${state.doneCount} / ${totalLessons}`}
            pct={lessonPct}
          />
          <ProgressRow
            label="Quizzes aprovados"
            value={`${state.quizzesPassed} / ${modulesWithQuiz.length}`}
            pct={quizPct}
          />
        </div>
      </section>

      {/* Sincronização entre aparelhos (opcional, offline-first) */}
      <SyncPanel />

      {/* Atalhos rápidos */}
      <section>
        <p className="ui-eyebrow mb-3 px-0.5">Explorar</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_LINKS.map((q) => (
            <Link key={q.href} href={q.href} className="ui-card-link flex flex-col gap-1.5 p-4">
              <span aria-hidden className="text-xl">{q.icon}</span>
              <span className="text-sm font-medium">{q.label}</span>
              <span className="text-xs leading-snug text-[var(--muted)]">{q.desc}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

const QUICK_LINKS = [
  { href: "/", icon: "🧪", label: "Catálogo", desc: "Materiais, preços e dados" },
  { href: "/direto", icon: "🎯", label: "Modo Direto", desc: "Monte e preveja fórmulas" },
  { href: "/formulas", icon: "📋", label: "Fórmulas", desc: "Receitas de referência" },
  { href: "/metodo", icon: "📐", label: "Método", desc: "Como aprender rápido" },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function ProgressRow({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-[var(--muted)]">{label}</span>
        <span className="text-sm">
          <span className="text-[var(--foreground)]">{value}</span>{" "}
          <span className="text-[var(--accent)] font-medium">{pct}%</span>
        </span>
      </div>
      <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
