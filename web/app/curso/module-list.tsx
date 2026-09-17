"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDone, getQuizResult, isQuizPassed, type QuizResult } from "@/lib/course-progress";
import { levelStyle, type CourseModule } from "@/lib/course";

export default function ModuleList({ modules }: { modules: CourseModule[] }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [quizzes, setQuizzes] = useState<Record<string, { result: QuizResult | null; passed: boolean }>>(
    {},
  );

  useEffect(() => {
    const sync = () => {
      setDone(getDone());
      const map: Record<string, { result: QuizResult | null; passed: boolean }> = {};
      for (const m of modules) {
        map[m.id] = { result: getQuizResult(m.id), passed: isQuizPassed(m.id) };
      }
      setQuizzes(map);
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, [modules]);

  return (
    <div className="space-y-4">
      {modules.map((module, i) => {
        const badge = levelStyle(module.level);
        const hasQuiz = (module.quiz?.length ?? 0) > 0;
        const quiz = quizzes[module.id];
        return (
          <section
            key={module.id}
            id={module.id}
            className="scroll-mt-20 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
          >
            <header className="p-4 sm:p-5 border-b border-[var(--border)]">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-medium tracking-tight">
                  <span className="text-[var(--muted)] font-normal">Módulo {i + 1}.</span>{" "}
                  {module.title}
                </h2>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
              <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">{module.summary}</p>
            </header>
            <ul className="divide-y divide-[var(--border)]">
              {module.lessons.map((lesson, li) => {
                const isDone = done.has(lesson.id);
                return (
                  <li key={lesson.id}>
                    <Link
                      href={`/curso/${encodeURIComponent(lesson.id)}`}
                      className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-[var(--surface-2)] transition-colors"
                    >
                      <span
                        className={`grid place-items-center h-5 w-5 shrink-0 rounded-full border text-[10px] ${
                          isDone
                            ? "border-[var(--accent)] bg-[var(--accent)] text-black"
                            : "border-[var(--border)] text-transparent"
                        }`}
                        aria-hidden
                      >
                        ✓
                      </span>
                      <span className="text-sm flex-1">
                        <span className="text-[var(--muted)]">{li + 1}.</span> {lesson.title}
                      </span>
                      <span className="text-xs text-[var(--muted)] shrink-0">
                        {lesson.duration_min} min
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {hasQuiz && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-4 sm:px-5 py-3">
                <Link
                  href={`/curso/quiz/${encodeURIComponent(module.id)}`}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2 text-sm font-medium transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  <span aria-hidden>❓</span>
                  Testar conhecimento
                </Link>
                {quiz?.result && (
                  <div className="flex items-center gap-2 text-xs">
                    {quiz.passed && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 font-medium text-emerald-300">
                        <span aria-hidden>✓</span> Aprovado
                      </span>
                    )}
                    <span className="text-[var(--muted)]">
                      {quiz.result.correct}/{quiz.result.total}
                    </span>
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
