/**
 * deck-engine.ts — Ponte entre a carta do baralho e o motor heurístico.
 *
 * O motor (lib/engine.ts) já existia no app anterior e continua valendo: prevê
 * pirâmide, famílias dominantes, projeção, duração e avisos de IFRA a partir da
 * física (massa molar, ponto de ebulição, logP) e da força do odor. Aqui só se
 * traduz `Ingredient` (o modelo da carta) para `MaterialInput` (o modelo do
 * motor) — nenhuma regra de perfumaria mora neste arquivo.
 *
 * Nota: a previsão é ESTIMATIVA estrutural, calibrada contra acordes de
 * referência. Não substitui cheirar a fita.
 */

import { familyMeta, type Ingredient } from "./deck";
import { predictForward, type FormulaItem, type MaterialInput, type Prediction } from "./engine";

export function toMaterialInput(card: Ingredient): MaterialInput {
  const fam = familyMeta(card.family);
  return {
    id: card.id,
    name: card.name,
    note_type: card.note,
    // O motor casa família por alias/descritor: mandar o rótulo PT + as facetas
    // dá mais superfície de casamento do que o slug sozinho.
    odor_family: fam.label,
    odor_description: [card.smell, ...card.facets].join(", "),
    odor_strength: card.strength,
    molecular_weight: card.tech.mw,
    boiling_point_c: card.tech.bp,
    vapor_pressure: null,
    logp: card.tech.logp,
    min_price: card.price.min,
    min_price_per_g: card.price.perG,
    cheapest_source: card.price.source,
    material_kind: card.kind,
    ifra_limit_pct: card.tech.ifra,
    typical_use_pct: card.dose.label,
  };
}

/** Simula o acorde. `parts` são proporções — o motor normaliza por massa. */
export function simulate(items: { card: Ingredient; parts: number }[]): Prediction | null {
  const formula: FormulaItem[] = items
    .filter((i) => i.parts > 0)
    .map((i) => ({ material: toMaterialInput(i.card), grams: i.parts, dilutionPct: 100 }));
  if (formula.length === 0) return null;
  return predictForward(formula);
}
