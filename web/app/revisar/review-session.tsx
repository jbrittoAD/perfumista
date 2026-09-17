"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ensureSeeded,
  getDue,
  schedule,
  type Grade,
} from "@/lib/srs";
import {
  buildQueue,
  flashcardKeys,
  type ReviewCard,
} from "@/lib/review";
import { modules } from "@/lib/course";

/** Todas as chaves de quiz existentes (só entram na fila se estiverem no SRS). */
const allQuizKeys: string[] = modules.flatMap((m) =>
  (m.quiz ?? []).map((_, i) => `quiz:${m.id}:${i}`),
);

type Phase = "loading" | "session" | "empty" | "done";

const GRADE_LABELS: { grade: Grade; label: string; hint: string; className: string }[] = [
  { grade: "errei", label: "Errei", hint: "volta ao início", className: "border-rose-500/50 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20" },
  { grade: "dificil", label: "Difícil", hint: "repete o intervalo", className: "border-amber-500/50 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20" },
  { grade: "bom", label: "Bom", hint: "sobe 1 degrau", className: "border-sky-500/50 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20" },
  { grade: "facil", label: "Fácil", hint: "sobe 2 degraus", className: "border-emerald-500/50 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20" },
];

export default function ReviewSession() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [queue, setQueue] = useState<ReviewCard[]>([]);
  const [pos, setPos] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [correct, setCorrect] = useState(0);

  // Estado por-card
  const [revealed, setRevealed] = useState(false); // flashcard: verso à mostra
  const [picked, setPicked] = useState<number | null>(null); // quiz: opção escolhida

  const startSession = useCallback((includeNewFlashcards: boolean) => {
    if (includeNewFlashcards) {
      // Semeia flashcards ainda não vistos como "vencendo hoje".
      ensureSeeded(flashcardKeys);
    }
    // Junta chaves que estão due: flashcards já semeados + quizzes errados.
    const dueKeys = getDue([...flashcardKeys, ...allQuizKeys]);
    const q = buildQueue(dueKeys);
    setQueue(q);
    setPos(0);
    setReviewed(0);
    setCorrect(0);
    setRevealed(false);
    setPicked(null);
    setPhase(q.length > 0 ? "session" : "empty");
  }, []);

  useEffect(() => {
    startSession(false);
  }, [startSession]);

  const current = queue[pos] ?? null;
  const remaining = queue.length - pos;

  const advance = useCallback(() => {
    setRevealed(false);
    setPicked(null);
    setPos((p) => {
      const next = p + 1;
      if (next >= queue.length) {
        setPhase("done");
        return p;
      }
      return next;
    });
  }, [queue.length]);

  const gradeFlashcard = useCallback(
    (grade: Grade) => {
      if (!current || current.kind !== "flashcard") return;
      schedule(current.key, grade);
      setReviewed((n) => n + 1);
      if (grade !== "errei") setCorrect((n) => n + 1);
      advance();
    },
    [current, advance],
  );

  const answerQuiz = useCallback(
    (optionIndex: number) => {
      if (!current || current.kind !== "quiz" || picked !== null) return;
      setPicked(optionIndex);
      const isRight = optionIndex === current.entry.question.answer;
      // Certa espaça (sobe); errada volta ao início e permanece na fila.
      schedule(current.key, isRight ? "bom" : "errei");
      setReviewed((n) => n + 1);
      if (isRight) setCorrect((n) => n + 1);
    },
    [current, picked],
  );

  if (phase === "loading") {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
        Carregando sua fila…
      </div>
    );
  }

  if (phase === "empty") {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <p className="text-lg font-medium">Você está em dia. ✓</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Nenhuma revisão vencendo hoje. Volte amanhã ou adiante estudando materiais novos.
        </p>
        <button
          type="button"
          onClick={() => startSession(true)}
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
        >
          Estudar flashcards novos
        </button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-6 text-center">
        <p className="text-lg font-medium">Sessão concluída! 🎉</p>
        <p className="mt-1 text-sm text-emerald-200">
          {reviewed} {reviewed === 1 ? "revisão" : "revisões"} — {correct} sem tropeço.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => startSession(false)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
          >
            Verificar novas pendências
          </button>
          <button
            type="button"
            onClick={() => startSession(true)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
          >
            Estudar flashcards novos
          </button>
          <Link
            href="/hoje"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
          >
            Voltar ao painel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* progresso da sessão */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-[var(--muted)]">
          <span className="font-medium text-[var(--foreground)]">{remaining}</span>{" "}
          {remaining === 1 ? "revisão restante" : "revisões restantes"}
        </span>
        <span className="text-xs text-[var(--muted)]">{reviewed} feitas</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
          style={{ width: `${queue.length > 0 ? (pos / queue.length) * 100 : 0}%` }}
        />
      </div>

      {current?.kind === "flashcard" && (
        <FlashcardView
          key={current.key}
          front={current.card.front}
          pt={current.card.pt}
          family={current.card.family}
          back={current.card.back}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
          onGrade={gradeFlashcard}
        />
      )}

      {current?.kind === "quiz" && (
        <QuizView
          key={current.key}
          moduleId={current.entry.moduleId}
          question={current.entry.question.question}
          options={current.entry.question.options}
          answer={current.entry.question.answer}
          explanation={current.entry.question.explanation}
          picked={picked}
          onAnswer={answerQuiz}
          onNext={advance}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Flashcard                                                           */
/* ------------------------------------------------------------------ */

function FlashcardView({
  front,
  pt,
  family,
  back,
  revealed,
  onReveal,
  onGrade,
}: {
  front: string;
  pt: string;
  family: string;
  back: string;
  revealed: boolean;
  onReveal: () => void;
  onGrade: (g: Grade) => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <span className="inline-block rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-0.5 text-xs text-[var(--muted)]">
        {family}
      </span>
      <p className="mt-4 text-2xl font-medium tracking-tight">{front}</p>
      {pt && <p className="mt-1 text-sm text-[var(--muted)]">{pt}</p>}

      {!revealed ? (
        <div className="mt-6">
          <p className="text-sm text-[var(--muted)]">
            Qual a família, nota e perfil odorífero? Diga em voz alta antes de virar.
          </p>
          <button
            type="button"
            onClick={onReveal}
            className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-6 py-3 text-sm font-medium text-black transition-opacity hover:opacity-90 sm:w-auto"
          >
            Mostrar resposta
          </button>
        </div>
      ) : (
        <div className="mt-5">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm leading-relaxed">
            {back}
          </div>
          <p className="mt-4 text-sm text-[var(--muted)]">Como foi lembrar?</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GRADE_LABELS.map(({ grade, label, hint, className }) => (
              <button
                key={grade}
                type="button"
                onClick={() => onGrade(grade)}
                className={`flex min-h-[44px] flex-col items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${className}`}
              >
                {label}
                <span className="text-[10px] font-normal opacity-70">{hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Quiz (questão errada re-perguntada)                                 */
/* ------------------------------------------------------------------ */

function QuizView({
  moduleId,
  question,
  options,
  answer,
  explanation,
  picked,
  onAnswer,
  onNext,
}: {
  moduleId: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  picked: number | null;
  onAnswer: (i: number) => void;
  onNext: () => void;
}) {
  const moduleTitle = useMemo(
    () => modules.find((m) => m.id === moduleId)?.title ?? moduleId,
    [moduleId],
  );
  const graded = picked !== null;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <span className="inline-block rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-0.5 text-xs text-[var(--muted)]">
        Quiz · {moduleTitle}
      </span>
      <p className="mt-4 text-base font-medium leading-relaxed">{question}</p>
      <div className="mt-4 space-y-2">
        {options.map((opt, oi) => {
          const selected = picked === oi;
          const isAnswer = answer === oi;
          let stateClass =
            "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)]";
          if (graded) {
            if (isAnswer) stateClass = "border-emerald-500/60 bg-emerald-500/15 text-emerald-100";
            else if (selected) stateClass = "border-rose-500/60 bg-rose-500/15 text-rose-100";
            else stateClass = "border-[var(--border)] bg-[var(--surface-2)] opacity-70";
          }
          return (
            <button
              key={oi}
              type="button"
              disabled={graded}
              onClick={() => onAnswer(oi)}
              className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm leading-relaxed transition-colors ${stateClass} ${
                graded ? "cursor-default" : "cursor-pointer"
              }`}
            >
              <span className="flex-1">{opt}</span>
              {graded && isAnswer && <span className="shrink-0 text-emerald-300">✓</span>}
              {graded && selected && !isAnswer && <span className="shrink-0 text-rose-300">✗</span>}
            </button>
          );
        })}
      </div>
      {graded && (
        <>
          <p className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--muted)] leading-relaxed">
            <span className="font-medium text-[var(--foreground)]">Explicação: </span>
            {explanation}
          </p>
          <button
            type="button"
            onClick={onNext}
            className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-6 py-3 text-sm font-medium text-black transition-opacity hover:opacity-90 sm:w-auto"
          >
            Continuar
          </button>
        </>
      )}
    </div>
  );
}
