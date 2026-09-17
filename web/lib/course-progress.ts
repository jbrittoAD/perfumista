import { markDirty } from "@/lib/sync";

const STORAGE_KEY = "perfumista:course-progress";

function read(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.filter((x): x is string => typeof x === "string"));
    return new Set();
  } catch {
    return new Set();
  }
}

function write(set: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
    markDirty();
  } catch {
    // ignora quota / modo privado
  }
}

/** Conjunto de ids de aulas concluídas. */
export function getDone(): Set<string> {
  return read();
}

export function isDone(lessonId: string): boolean {
  return read().has(lessonId);
}

export function countDone(): number {
  return read().size;
}

/** Alterna o estado de conclusão e retorna o novo estado (true = concluída). */
export function toggle(lessonId: string): boolean {
  const set = read();
  let done: boolean;
  if (set.has(lessonId)) {
    set.delete(lessonId);
    done = false;
  } else {
    set.add(lessonId);
    done = true;
  }
  write(set);
  return done;
}

/* ------------------------------------------------------------------ */
/* Quizzes                                                            */
/* ------------------------------------------------------------------ */

const QUIZ_STORAGE_KEY = "perfumista:quiz-results";

export type QuizResult = { correct: number; total: number };

/** Percentual mínimo de acerto para considerar o quiz aprovado. */
export const QUIZ_PASS_RATIO = 0.7;

function readQuizzes(): Record<string, QuizResult> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(QUIZ_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Record<string, QuizResult> = {};
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (
          value &&
          typeof value === "object" &&
          typeof (value as QuizResult).correct === "number" &&
          typeof (value as QuizResult).total === "number"
        ) {
          out[key] = { correct: (value as QuizResult).correct, total: (value as QuizResult).total };
        }
      }
      return out;
    }
    return {};
  } catch {
    return {};
  }
}

function writeQuizzes(results: Record<string, QuizResult>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(results));
    markDirty();
  } catch {
    // ignora quota / modo privado
  }
}

/** Grava (ou substitui) o resultado do quiz de um módulo. */
export function setQuizResult(moduleId: string, correct: number, total: number): void {
  const results = readQuizzes();
  results[moduleId] = { correct, total };
  writeQuizzes(results);
}

/** Resultado salvo do quiz de um módulo, ou null se nunca respondido. */
export function getQuizResult(moduleId: string): QuizResult | null {
  const results = readQuizzes();
  return results[moduleId] ?? null;
}

/** True se o quiz do módulo foi aprovado (acerto >= 70%). */
export function isQuizPassed(moduleId: string): boolean {
  const result = getQuizResult(moduleId);
  if (!result || result.total <= 0) return false;
  return result.correct / result.total >= QUIZ_PASS_RATIO;
}
