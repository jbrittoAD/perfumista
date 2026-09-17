"use client";

import { useEffect, useState } from "react";
import * as buylist from "@/lib/buylist";
import * as compareset from "@/lib/compareset";

/** Botão "lista de compras": mesma buylist (localStorage) usada em /fragrancias. */
export function BuylistButton({ materialId }: { materialId: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(buylist.has(materialId)), [materialId]);

  return (
    <button
      type="button"
      onClick={() => setOn(buylist.toggle(materialId))}
      aria-pressed={on}
      className={`text-xs uppercase tracking-wide px-3 py-1.5 rounded-lg border transition-colors ${
        on
          ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]"
          : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/50 hover:text-[var(--foreground)]"
      }`}
    >
      {on ? "✓ na lista de compras" : "➕ lista de compras"}
    </button>
  );
}

/** Checkbox "comparar": grava em compareset (localStorage), até compareset.MAX itens. */
export function CompareButton({ materialId }: { materialId: number }) {
  const [on, setOn] = useState(false);
  const [full, setFull] = useState(false);
  useEffect(() => setOn(compareset.has(materialId)), [materialId]);

  function handle() {
    const res = compareset.toggle(materialId);
    setOn(res.on);
    setFull(!res.ok);
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={handle}
        aria-pressed={on}
        className={`text-xs uppercase tracking-wide px-3 py-1.5 rounded-lg border transition-colors ${
          on
            ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]"
            : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/50 hover:text-[var(--foreground)]"
        }`}
      >
        {on ? "✓ comparando" : `⚖️ comparar (máx. ${compareset.MAX})`}
      </button>
      {full && <span className="text-[11px] text-amber-300">cheio — remova um antes</span>}
    </span>
  );
}
