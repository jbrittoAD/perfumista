"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  type Recipe,
  type RecipeSource,
  type RecipeConfidence,
  type RecipeFacets,
  SOURCE_LABEL,
  CONFIDENCE_LABEL,
} from "@/lib/recipes";

const CONFIDENCE_STYLE: Record<RecipeConfidence, string> = {
  documented: "text-emerald-300 border-emerald-400/40 bg-emerald-400/10",
  partial: "text-amber-300 border-amber-400/40 bg-amber-400/10",
  structure_only: "text-[var(--muted)] border-[var(--border)] bg-[var(--surface-2)]",
};

const SOURCE_STYLE: Record<RecipeSource, string> = {
  diy: "text-sky-300 border-sky-400/40 bg-sky-400/10",
  published: "text-violet-300 border-violet-400/40 bg-violet-400/10",
  classic: "text-[var(--accent)] border-[var(--accent)]/40 bg-[var(--accent)]/10",
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={`ui-chip ${active ? "ui-chip-on" : "ui-chip-off"}`}>
      {children}
    </button>
  );
}

export default function FormulasClient({
  recipes,
  facets,
}: {
  recipes: Recipe[];
  facets: RecipeFacets;
}) {
  const [q, setQ] = useState("");
  const [family, setFamily] = useState<string | null>(null);
  const [source, setSource] = useState<RecipeSource | null>(null);
  const [confidence, setConfidence] = useState<RecipeConfidence | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return recipes.filter((r) => {
      if (family && r.family !== family) return false;
      if (source && r.source !== source) return false;
      if (confidence && r.confidence !== confidence) return false;
      if (needle) {
        const hay = [r.name, r.smells_like ?? "", r.what_it_does ?? "", r.family ?? ""]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [recipes, q, family, source, confidence]);

  return (
    <div>
      {/* Busca */}
      <div className="mb-4">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, o que se sente ou o que faz…"
          className="ui-input"
        />
      </div>

      {/* Filtros de fonte */}
      <div className="ui-chip-row mb-2.5">
        <Chip active={!source} onClick={() => setSource(null)}>
          Todas as fontes
        </Chip>
        {facets.sources.map((s) => (
          <Chip key={s.v} active={source === s.v} onClick={() => setSource(source === s.v ? null : s.v)}>
            {SOURCE_LABEL[s.v]} ({s.n})
          </Chip>
        ))}
      </div>

      {/* Filtros de confiança */}
      <div className="ui-chip-row mb-2.5">
        <Chip active={!confidence} onClick={() => setConfidence(null)}>
          Qualquer confiança
        </Chip>
        {facets.confidences.map((c) => (
          <Chip
            key={c.v}
            active={confidence === c.v}
            onClick={() => setConfidence(confidence === c.v ? null : c.v)}
          >
            {CONFIDENCE_LABEL[c.v]} ({c.n})
          </Chip>
        ))}
      </div>

      {/* Filtros de família (todas, é longo mas rolável) */}
      <div className="flex flex-wrap gap-2 mb-6 max-h-32 overflow-y-auto">
        <Chip active={!family} onClick={() => setFamily(null)}>
          Todas as famílias
        </Chip>
        {facets.families.map((f) => (
          <Chip key={f.v} active={family === f.v} onClick={() => setFamily(family === f.v ? null : f.v)}>
            {f.v} ({f.n})
          </Chip>
        ))}
      </div>

      <p className="text-xs text-[var(--muted)] mb-3">
        {filtered.length} de {recipes.length} fórmulas
      </p>

      {filtered.length === 0 ? (
        <p className="text-[var(--muted)]">Nenhuma fórmula encontrada.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <Link key={r.id} href={`/formulas/${r.id}`} className="ui-card-link flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium leading-tight">{r.name}</h3>
                <span
                  className={`shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${CONFIDENCE_STYLE[r.confidence]}`}
                >
                  {CONFIDENCE_LABEL[r.confidence]}
                </span>
              </div>
              {r.family && <div className="text-sm text-[var(--muted)]">{r.family}</div>}
              {r.smells_like && (
                <p className="text-xs text-[var(--muted)] line-clamp-2">{r.smells_like}</p>
              )}
              <div className="mt-auto flex items-center justify-between pt-1 gap-2">
                <span
                  className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${SOURCE_STYLE[r.source]}`}
                >
                  {SOURCE_LABEL[r.source]}
                </span>
                <span className="text-[11px] text-[var(--muted)]">
                  {r.ingredients.length}{" "}
                  {r.ingredients.length === 1 ? "ingrediente" : "ingredientes"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
