"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { QuizQuestion } from "@/lib/course";
import { QUIZ_PASS_RATIO, setQuizResult } from "@/lib/course-progress";
import { schedule } from "@/lib/srs";

type Props = {
  moduleId: string;
  questions: QuizQuestion[];
};

export default function QuizRunner({ moduleId, questions }: Props) {
  const total = questions.length;
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    Array.from({ length: total }, () => null),
  );
  const [graded, setGraded] = useState(false);

  const correct = useMemo(
    () => questions.reduce((acc, q, i) => (answers[i] === q.answer ? acc + 1 : acc), 0),
    [answers, questions],
  );

  const allAnswered = answers.every((a) => a !== null);
  const passed = total > 0 && correct / total >= QUIZ_PASS_RATIO;

  function choose(qi: number, oi: number) {
    if (graded) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[qi] = oi;
      return next;
    });
  }

  function grade() {
    setGraded(true);
    // registra a tentativa (aprovado ou não) para mostrar o placar na lista
    setQuizResult(moduleId, correct, total);
    // alimenta o SRS: erradas voltam ao início e entram na fila de /revisar;
    // certas também são espaçadas para revisitar o conceito no futuro.
    questions.forEach((q, i) => {
      schedule(`quiz:${moduleId}:${i}`, answers[i] === q.answer ? "bom" : "errei");
    });
  }

  function retry() {
    setAnswers(Array.from({ length: total }, () => null));
    setGraded(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-5">
      <ol className="space-y-5">
        {questions.map((q, qi) => {
          const chosen = answers[qi];
          return (
            <li
              key={qi}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"
            >
              <fieldset>
                <legend className="text-base font-medium leading-relaxed mb-3">
                  <span className="text-[var(--muted)] font-normal">{qi + 1}.</span> {q.question}
                </legend>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => {
                    const selected = chosen === oi;
                    const isAnswer = q.answer === oi;
                    let stateClass =
                      "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)]";
                    if (graded) {
                      if (isAnswer) {
                        stateClass = "border-emerald-500/60 bg-emerald-500/15 text-emerald-100";
                      } else if (selected) {
                        stateClass = "border-rose-500/60 bg-rose-500/15 text-rose-100";
                      } else {
                        stateClass = "border-[var(--border)] bg-[var(--surface-2)] opacity-70";
                      }
                    } else if (selected) {
                      stateClass = "border-[var(--accent)] bg-[var(--accent)]/10";
                    }
                    return (
                      <label
                        key={oi}
                        className={`flex min-h-[40px] cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm leading-relaxed transition-colors ${stateClass} ${
                          graded ? "cursor-default" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${qi}`}
                          value={oi}
                          checked={selected}
                          disabled={graded}
                          onChange={() => choose(qi, oi)}
                          className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                        />
                        <span className="flex-1">{opt}</span>
                        {graded && isAnswer && (
                          <span className="shrink-0 text-emerald-300" aria-label="Correta">
                            ✓
                          </span>
                        )}
                        {graded && selected && !isAnswer && (
                          <span className="shrink-0 text-rose-300" aria-label="Sua resposta (errada)">
                            ✗
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
                {graded && (
                  <p className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--muted)] leading-relaxed">
                    <span className="font-medium text-[var(--foreground)]">Explicação: </span>
                    {q.explanation}
                  </p>
                )}
              </fieldset>
            </li>
          );
        })}
      </ol>

      {!graded ? (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={grade}
            disabled={!allAnswered}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-black transition-opacity enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Corrigir
          </button>
          {!allAnswered && (
            <p className="text-xs text-[var(--muted)]">Responda todas as perguntas para corrigir.</p>
          )}
        </div>
      ) : (
        <div
          className={`rounded-xl border p-5 text-center ${
            passed
              ? "border-emerald-500/50 bg-emerald-500/10"
              : "border-rose-500/50 bg-rose-500/10"
          }`}
        >
          <p className="text-lg font-medium">
            Você acertou {correct} de {total}
          </p>
          {passed ? (
            <p className="mt-1 text-sm text-emerald-200">
              Aprovado! Você domina este módulo. ✓
            </p>
          ) : (
            <p className="mt-1 text-sm text-rose-200">
              Você precisa de {Math.ceil(total * QUIZ_PASS_RATIO)} acertos para passar. Revise e
              tente de novo.
            </p>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {!passed && (
              <button
                type="button"
                onClick={retry}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
              >
                Tentar de novo
              </button>
            )}
            <Link
              href="/curso"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
            >
              Voltar ao curso
            </Link>
          </div>
        </div>
      )}

      <div className="border-t border-[var(--border)] pt-5 text-center">
        <Link
          href="/curso"
          className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          ← Voltar ao curso
        </Link>
      </div>
    </div>
  );
}
