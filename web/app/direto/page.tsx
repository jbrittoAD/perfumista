import type { Metadata } from "next";
import DiretoClient from "./direto-client";

export const metadata: Metadata = {
  title: "Modo Direto — Perfumista",
};

export default function DiretoPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Modo Direto — Previsão Olfativa</h1>
        <p className="text-[var(--muted)] text-sm mt-1">
          Monte uma fórmula (materiais + gramas + diluição) e veja pirâmide, acordes, projeção,
          longevidade e avisos previstos ao vivo.
        </p>
      </div>
      <DiretoClient />
    </div>
  );
}
