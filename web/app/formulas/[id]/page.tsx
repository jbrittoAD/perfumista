import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getRecipe,
  listRecipes,
  normalizeName,
  normalizeIngredientNote,
  NOTE_LABEL,
  SOURCE_LABEL,
  CONFIDENCE_LABEL,
  type RecipeConfidence,
} from "@/lib/recipes";
import { getAllMaterialsForEngine } from "@/lib/catalog";
import SimulateButton, { type SimIngredient } from "./simulate-button";

/** Pré-renderiza TODAS as fórmulas de referência no build (export estático). */
export function generateStaticParams(): { id: string }[] {
  return listRecipes().map((r) => ({ id: String(r.id) }));
}

const NOTE_META: Record<"topo" | "coracao" | "base", { text: string; border: string; bg: string }> = {
  topo: { text: "text-amber-300", border: "border-amber-400/40", bg: "bg-amber-400/10" },
  coracao: { text: "text-rose-300", border: "border-rose-400/40", bg: "bg-rose-400/10" },
  base: { text: "text-orange-300", border: "border-orange-500/40", bg: "bg-orange-500/10" },
};

const CONFIDENCE_STYLE: Record<RecipeConfidence, string> = {
  documented: "text-emerald-300 border-emerald-400/40 bg-emerald-400/10",
  partial: "text-amber-300 border-amber-400/40 bg-amber-400/10",
  structure_only: "text-[var(--muted)] border-[var(--border)] bg-[var(--surface-2)]",
};

/**
 * Extrai um percentual de diluição do texto livre ("10%", "neat", "50% in IPM",
 * null…). Default 100 (puro) quando não há número. Serve tanto ao dilutionPct do
 * handoff quanto à exibição.
 */
function parseDilutionPct(dilution: string | null): number {
  if (!dilution) return 100;
  const d = dilution.toLowerCase();
  if (d.includes("neat") || d.includes("high-proof")) return 100;
  const m = d.match(/(\d+(?:\.\d+)?)\s*%/);
  if (m) {
    const v = Number(m[1]);
    if (v > 0 && v <= 100) return v;
  }
  return 100;
}

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = getRecipe(id);
  if (!recipe) notFound();

  // Índice nome-normalizado -> material do catálogo (só o necessário p/ o botão).
  const catalog = getAllMaterialsForEngine();
  const byNorm = new Map<string, { id: number; name: string }>();
  for (const m of catalog) {
    const key = normalizeName(m.name);
    if (!byNorm.has(key)) byNorm.set(key, { id: m.id, name: m.name });
  }

  // Casa cada ingrediente com o catálogo (por nome normalizado).
  const simIngredients: SimIngredient[] = recipe.ingredients.map((ing) => {
    const hit = byNorm.get(normalizeName(ing.material));
    return {
      material: ing.material,
      parts: ing.parts,
      matchedId: hit?.id ?? null,
      matchedName: hit?.name ?? null,
      dilutionPct: parseDilutionPct(ing.dilution),
    };
  });
  const matchedIds = new Set(simIngredients.filter((s) => s.matchedId != null).map((s) => s.material));

  const pyramid: { key: "topo" | "coracao" | "base"; items: string[] }[] = [
    { key: "topo", items: recipe.pyramid.top ?? [] },
    { key: "coracao", items: recipe.pyramid.heart ?? [] },
    { key: "base", items: recipe.pyramid.base ?? [] },
  ];

  const incompleteProportions = recipe.confidence !== "documented";

  return (
    <div>
      <Link href="/formulas" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        ← Fórmulas
      </Link>

      {/* Cabeçalho */}
      <div className="mt-3 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-light tracking-tight">{recipe.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {recipe.family && (
              <span className="text-sm text-[var(--muted)]">{recipe.family}</span>
            )}
            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
              {SOURCE_LABEL[recipe.source]}
            </span>
            <span
              className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${CONFIDENCE_STYLE[recipe.confidence]}`}
            >
              {CONFIDENCE_LABEL[recipe.confidence]}
            </span>
            {recipe.concentration && (
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-[var(--accent)]/40 text-[var(--accent)] bg-[var(--accent)]/10">
                {recipe.concentration}
              </span>
            )}
          </div>
        </div>
        <SimulateButton ingredients={simIngredients} />
      </div>

      {/* Aviso de confiança */}
      {incompleteProportions && (
        <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-xs text-amber-200/90">
          {recipe.confidence === "structure_only" ? (
            <p>
              Esta fórmula é <strong>só estrutura</strong>: os ingredientes e a pirâmide são
              conhecidos, mas <strong>as proporções não são documentadas</strong>. Use como esqueleto
              de referência, não como receita pronta.
            </p>
          ) : (
            <p>
              Esta fórmula é <strong>parcial</strong>: parte das proporções/diluições pode faltar ou
              ser aproximada. Trate os números como ponto de partida.
            </p>
          )}
        </div>
      )}

      {/* Ingredientes */}
      <section className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-sm uppercase tracking-wide text-[var(--muted)] mb-4">
          Ingredientes ({recipe.ingredients.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--muted)] text-xs uppercase tracking-wide">
                <th className="py-2 pr-4">Material</th>
                <th className="py-2 pr-4">Partes</th>
                <th className="py-2 pr-4">Diluição</th>
                <th className="py-2 pr-4">Nota</th>
                <th className="py-2">Catálogo</th>
              </tr>
            </thead>
            <tbody>
              {recipe.ingredients.map((ing, i) => {
                const note = normalizeIngredientNote(ing.note);
                const meta = note ? NOTE_META[note] : null;
                const inCatalog = matchedIds.has(ing.material);
                return (
                  <tr key={i} className="border-t border-[var(--border)]">
                    <td className="py-2 pr-4">
                      {ing.material}
                      {ing.cas && (
                        <span className="ml-2 text-[11px] font-mono text-[var(--muted)]">
                          CAS {ing.cas}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-[var(--muted)]">
                      {ing.parts != null ? ing.parts : "—"}
                    </td>
                    <td className="py-2 pr-4 text-[var(--muted)]">{ing.dilution ?? "—"}</td>
                    <td className="py-2 pr-4">
                      {meta ? (
                        <span
                          className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${meta.border} ${meta.bg} ${meta.text}`}
                        >
                          {NOTE_LABEL[note!]}
                        </span>
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>
                    <td className="py-2">
                      {inCatalog ? (
                        <span className="text-[11px] text-emerald-300">✓ no catálogo</span>
                      ) : (
                        <span className="text-[11px] text-[var(--muted)]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pirâmide */}
      <section className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-sm uppercase tracking-wide text-[var(--muted)] mb-4">Pirâmide olfativa</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {pyramid.map(({ key, items }) => {
            const meta = NOTE_META[key];
            return (
              <div key={key} className={`rounded-lg border ${meta.border} ${meta.bg} p-3`}>
                <h3 className={`text-xs font-medium uppercase tracking-wide mb-2 ${meta.text}`}>
                  {NOTE_LABEL[key]}
                </h3>
                {items.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">—</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {items.map((it, i) => (
                      <li key={i}>{it}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* O que se sente / o que faz */}
      {(recipe.smells_like || recipe.what_it_does) && (
        <section className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {recipe.smells_like && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="text-sm uppercase tracking-wide text-[var(--muted)] mb-2">
                O que se sente
              </h2>
              <p className="text-sm">{recipe.smells_like}</p>
            </div>
          )}
          {recipe.what_it_does && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="text-sm uppercase tracking-wide text-[var(--muted)] mb-2">
                O que a combinação faz
              </h2>
              <p className="text-sm">{recipe.what_it_does}</p>
            </div>
          )}
        </section>
      )}

      {/* Fonte */}
      {recipe.source_url && (
        <section className="mt-5">
          <a
            href={recipe.source_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] underline break-all"
          >
            Fonte: {recipe.source_url}
          </a>
        </section>
      )}
    </div>
  );
}
