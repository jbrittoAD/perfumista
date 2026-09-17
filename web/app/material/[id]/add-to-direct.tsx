"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addToCurrent } from "@/lib/formula";

/**
 * Botão "+ Adicionar ao Modo Direto": grava o material na "fórmula atual"
 * (localStorage via formula.ts) e navega para /direto, que lê o handoff ao
 * montar. grams=1 / diluição=100% como padrão editável no Direto.
 */
export default function AddToDirect({ materialId, name }: { materialId: number; name: string }) {
  const router = useRouter();
  const [done, setDone] = useState(false);

  function handle() {
    addToCurrent({ materialId, name, grams: 1, dilutionPct: 100 });
    setDone(true);
    router.push("/direto");
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={done}
      className="text-xs uppercase tracking-wide px-3 py-1.5 rounded-lg border border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)]/25 transition-colors disabled:opacity-60"
    >
      {done ? "Adicionado…" : "+ Adicionar ao Modo Direto"}
    </button>
  );
}
