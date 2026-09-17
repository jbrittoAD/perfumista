import type { Metadata } from "next";
import ReviewSession from "./review-session";

export const metadata: Metadata = {
  title: "Revisar — Perfumista",
  description:
    "Sessão de revisão espaçada: flashcards de materiais e questões que você errou, na hora certa.",
};

export default function RevisarPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Revisar</h1>
        <p className="text-[var(--muted)] text-sm mt-1">
          Recordação ativa + repetição espaçada. Responda de memória antes de conferir; o app agenda
          a próxima revisão sozinho.
        </p>
      </div>
      <ReviewSession />
    </div>
  );
}
