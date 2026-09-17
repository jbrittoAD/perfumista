"use client";

import { useMemo, useState } from "react";
import { type Combination } from "@/lib/recipes";

export default function CombinacoesClient({ combinations }: { combinations: Combination[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return combinations;
    return combinations.filter((c) => {
      const hay = [
        c.combo.join(" "),
        c.perception ?? "",
        c.mechanism ?? "",
        c.family_result ?? "",
        c.notes_layer ?? "",
        Object.entries(c.role)
          .map(([k, v]) => `${k} ${v}`)
          .join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [combinations, q]);

  return (
    <div>
      <div className="mb-4">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por material, percepção ou mecanismo…"
          className="ui-input"
        />
      </div>

      <p className="text-xs text-[var(--muted)] mb-3">
        {filtered.length} de {combinations.length} combinações
      </p>

      {filtered.length === 0 ? (
        <p className="text-[var(--muted)]">Nenhuma combinação encontrada.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c, i) => (
            <article key={i} className="ui-card flex flex-col gap-3 p-4">
              {/* Combo */}
              <div className="flex flex-wrap items-center gap-1.5">
                {c.combo.map((m, j) => (
                  <span key={j} className="flex items-center gap-1.5">
                    {j > 0 && <span className="text-[var(--muted)]">+</span>}
                    <span className="text-sm font-medium rounded-md border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-2 py-0.5 text-[var(--foreground)]">
                      {m}
                    </span>
                  </span>
                ))}
              </div>

              {c.perception && <p className="text-sm">{c.perception}</p>}

              {c.mechanism && (
                <p className="text-xs text-[var(--muted)]">
                  <span className="uppercase tracking-wide">Mecanismo:</span> {c.mechanism}
                </p>
              )}

              {/* Papel de cada material */}
              {Object.keys(c.role).length > 0 && (
                <dl className="text-xs space-y-1">
                  {Object.entries(c.role).map(([material, papel]) => (
                    <div key={material} className="flex gap-2">
                      <dt className="text-[var(--foreground)] shrink-0">{material}:</dt>
                      <dd className="text-[var(--muted)]">{papel}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {/* Metadados */}
              <div className="mt-auto flex flex-wrap gap-2 pt-1">
                {c.family_result && (
                  <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
                    {c.family_result}
                  </span>
                )}
                {c.notes_layer && (
                  <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
                    {c.notes_layer}
                  </span>
                )}
                {c.typical_ratio && (
                  <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-[var(--accent)]/40 text-[var(--accent)] bg-[var(--accent)]/10">
                    {c.typical_ratio}
                  </span>
                )}
              </div>

              {c.source_url && (
                <a
                  href={c.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] underline break-all"
                >
                  fonte
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
