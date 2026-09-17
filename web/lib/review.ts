import flashcardsData from "@/lib/data/flashcards.json";
import { modules } from "@/lib/course";
import type { QuizQuestion } from "@/lib/course";

/**
 * Fontes de itens revisáveis e montagem da fila para /revisar e /hoje.
 * Chaves de SRS:
 *   - flashcard de material: "fc:{id}"      (ex. "fc:mat12")
 *   - questão de quiz errada: "quiz:{m}:{i}" (ex. "quiz:m3:2")
 */

export type Flashcard = {
  id: string;
  type: string;
  front: string;
  back: string;
  family: string;
  note: string;
  pt: string;
};

export const flashcards: Flashcard[] = flashcardsData as Flashcard[];

/** Todas as chaves de SRS dos flashcards de materiais. */
export const flashcardKeys: string[] = flashcards.map((f) => `fc:${f.id}`);

const flashcardByKey = new Map(flashcards.map((f) => [`fc:${f.id}`, f]));

export function flashcardForKey(key: string): Flashcard | null {
  return flashcardByKey.get(key) ?? null;
}

/** Índice de questões de quiz por chave "quiz:{moduleId}:{index}". */
type QuizEntry = { moduleId: string; index: number; question: QuizQuestion };
const quizByKey = new Map<string, QuizEntry>();
for (const m of modules) {
  (m.quiz ?? []).forEach((q, i) => {
    quizByKey.set(`quiz:${m.id}:${i}`, { moduleId: m.id, index: i, question: q });
  });
}

export function quizForKey(key: string): QuizEntry | null {
  return quizByKey.get(key) ?? null;
}

export type ReviewCard =
  | { kind: "flashcard"; key: string; card: Flashcard }
  | { kind: "quiz"; key: string; entry: QuizEntry };

/**
 * Monta a fila de revisão a partir das chaves que estão due.
 * Intercala famílias (interleaving): reordena os flashcards para que
 * itens da mesma família não fiquem adjacentes; questões de quiz são
 * distribuídas ao longo da fila.
 */
export function buildQueue(dueKeys: string[]): ReviewCard[] {
  const fcCards: ReviewCard[] = [];
  const quizCards: ReviewCard[] = [];
  for (const key of dueKeys) {
    if (key.startsWith("fc:")) {
      const card = flashcardForKey(key);
      if (card) fcCards.push({ kind: "flashcard", key, card });
    } else if (key.startsWith("quiz:")) {
      const entry = quizForKey(key);
      if (entry) quizCards.push({ kind: "quiz", key, entry });
    }
  }

  const interleavedFc = interleaveByFamily(fcCards);
  return distribute(interleavedFc, quizCards);
}

/** Reordena flashcards evitando duas famílias iguais em sequência. */
function interleaveByFamily(cards: ReviewCard[]): ReviewCard[] {
  const buckets = new Map<string, ReviewCard[]>();
  for (const c of cards) {
    if (c.kind !== "flashcard") continue;
    const fam = c.card.family || "outros";
    const list = buckets.get(fam) ?? [];
    list.push(c);
    buckets.set(fam, list);
  }
  const result: ReviewCard[] = [];
  let lastFamily = "";
  // Round-robin ponderado: sempre puxa da maior pilha que não seja a última família.
  while (result.length < cards.length) {
    const entries = [...buckets.entries()].filter(([, list]) => list.length > 0);
    if (entries.length === 0) break;
    entries.sort((a, b) => b[1].length - a[1].length);
    const pick = entries.find(([fam]) => fam !== lastFamily) ?? entries[0];
    const [fam, list] = pick;
    result.push(list.shift() as ReviewCard);
    lastFamily = fam;
  }
  return result;
}

/** Distribui os quiz cards uniformemente entre os flashcards. */
function distribute(base: ReviewCard[], extra: ReviewCard[]): ReviewCard[] {
  if (extra.length === 0) return base;
  if (base.length === 0) return extra;
  const result: ReviewCard[] = [];
  const gap = Math.max(1, Math.floor(base.length / (extra.length + 1)));
  let ei = 0;
  for (let i = 0; i < base.length; i++) {
    result.push(base[i]);
    if (ei < extra.length && (i + 1) % gap === 0) {
      result.push(extra[ei++]);
    }
  }
  while (ei < extra.length) result.push(extra[ei++]);
  return result;
}
