"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setCurrent, type FormulaItemData } from "@/lib/formula";

export interface SimIngredient {
  material: string;
  parts: number | null;
  /** id do material do catálogo que casou por nome normalizado, ou null. */
  matchedId: number | null;
  matchedName: string | null;
  dilutionPct: number;
}

/**
 * "Simular no Modo Direto": pega os ingredientes que casaram com o catálogo,
 * monta a FormulaItemData[] (grams ∝ parts; parts null => 1) via setCurrent e
 * navega para /direto, que consome o handoff ao montar. Ingredientes sem match
 * são ignorados (avisamos quantos casaram / ficaram de fora).
 */
export default function SimulateButton({ ingredients }: { ingredients: SimIngredient[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const matched = ingredients.filter((i) => i.matchedId != null);
  const total = ingredients.length;
  const missing = total - matched.length;

  function handle() {
    if (matched.length === 0 || busy) return;
    setBusy(true);
    const items: FormulaItemData[] = matched.map((i) => ({
      materialId: i.matchedId as number,
      name: i.matchedName ?? i.material,
      grams: i.parts != null && i.parts > 0 ? i.parts : 1,
      dilutionPct: i.dilutionPct,
    }));
    setCurrent(items);
    router.push("/direto");
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handle}
        disabled={matched.length === 0 || busy}
        className="text-xs uppercase tracking-wide px-3 py-1.5 rounded-lg border border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)]/25 transition-colors disabled:opacity-50"
      >
        {busy ? "Enviando…" : "▶ Simular no Modo Direto"}
      </button>
      <p className="text-[11px] text-[var(--muted)] text-right">
        {matched.length}/{total} ingredientes casaram com o catálogo
        {missing > 0 ? ` · ${missing} sem correspondência` : ""}
      </p>
      {matched.length === 0 && (
        <p className="text-[11px] text-amber-300/90 text-right">
          Nenhum ingrediente desta fórmula existe no catálogo BR — nada a simular.
        </p>
      )}
    </div>
  );
}
