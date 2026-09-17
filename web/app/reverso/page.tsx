import type { Metadata } from "next";
import ReversoClient from "./reverso-client";

export const metadata: Metadata = {
  title: "Modo Reverso — Perfumista",
};

export default function ReversoPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Modo Reverso — Sugestão de Ingredientes</h1>
        <p className="text-[var(--muted)] text-sm mt-1">
          Descreva os alvos olfativos (família, nota, descrição + intensidade) e receba materiais
          sugeridos do catálogo, com percentual inicial, preço e justificativa.
        </p>
      </div>
      <ReversoClient />
    </div>
  );
}
