/**
 * validate-real.ts — Validação do motor heurístico com FÓRMULAS REAIS
 * (lib/data/recipes.json), não com os acordes de auto-calibração.
 *
 * Rode com:  cd web && npx tsx scripts/validate-real.ts
 *
 * Para CADA recipe com confidence='documented', family != null e ao menos um
 * ingrediente com `parts`:
 *   1) monta um FormulaItem[] — 1 MaterialInput SINTÉTICO por ingrediente. O
 *      mapeamento ingrediente -> material é APROXIMADO:
 *        - família do ingrediente derivada de: o texto do campo `note` do
 *          ingrediente (via mapToCanonFamily), depois o NOME do material, depois a
 *          família da própria recipe como fallback;
 *        - nota (topo/coração/base) de: `note` normalizado -> pertença à pirâmide
 *          da recipe -> nota típica da família;
 *        - MW/BP/vapor/força típicos da família (mesmo perfil de scripts/calibrate.ts);
 *        - dose (gramas) = `parts` (parts null => 1); diluição = parse do texto.
 *   2) roda predictForward;
 *   3) compara a FAMÍLIA DOMINANTE prevista (canônica) com a família da recipe
 *      (também canonizada via mapToCanonFamily).
 *
 * Reporta a taxa de acerto e 5 exemplos (esperado vs previsto).
 *
 * HONESTO: o mapeamento ingrediente->material é APROXIMADO (nomes genéricos, sem
 * física real por material). Isto é um SINAL de validação com dados REAIS —
 * diferente da auto-calibração por acordes — e NÃO uma verdade absoluta. Muitas
 * famílias das recipes são rótulos livres compostos ("floral chypre", "gourmand /
 * vanilla accord"), que o mapToCanonFamily reduz a uma família canônica dominante.
 */

import { predictForward, type MaterialInput, type FormulaItem } from "../lib/engine";
import { mapToCanonFamily } from "../lib/accords";
import {
  listRecipes,
  normalizeIngredientNote,
  type Recipe,
  type RecipeIngredient,
} from "../lib/recipes";

// ---------------------------------------------------------------------------
// PERFIL FÍSICO/FORÇA TÍPICO POR FAMÍLIA CANÔNICA (mesmo de scripts/calibrate.ts)
// ---------------------------------------------------------------------------
interface FamProfile {
  note: "topo" | "coracao" | "base";
  strength: "baixa" | "média" | "alta";
  mw: number;
  bp: number;
  vp: number;
}
const FAM_PROFILE: Record<string, FamProfile> = {
  citrus: { note: "topo", strength: "média", mw: 140, bp: 180, vp: 1.0 },
  verde: { note: "topo", strength: "alta", mw: 120, bp: 170, vp: 0.8 },
  aromatico: { note: "topo", strength: "média", mw: 150, bp: 190, vp: 0.5 },
  aquatico: { note: "topo", strength: "alta", mw: 170, bp: 210, vp: 0.2 },
  aldeidico: { note: "topo", strength: "alta", mw: 160, bp: 200, vp: 0.3 },
  floral: { note: "coracao", strength: "média", mw: 200, bp: 250, vp: 0.02 },
  frutado: { note: "coracao", strength: "média", mw: 200, bp: 245, vp: 0.03 },
  especiado: { note: "coracao", strength: "alta", mw: 180, bp: 250, vp: 0.05 },
  woody: { note: "base", strength: "média", mw: 235, bp: 300, vp: 0.0008 },
  amber: { note: "base", strength: "média", mw: 240, bp: 300, vp: 0.0006 },
  chypre: { note: "base", strength: "alta", mw: 210, bp: 315, vp: 0.0002 },
  fougere: { note: "base", strength: "média", mw: 150, bp: 300, vp: 0.0009 },
  leather: { note: "base", strength: "alta", mw: 190, bp: 300, vp: 0.0004 },
  musk: { note: "base", strength: "média", mw: 255, bp: 325, vp: 0.00006 },
  gourmand: { note: "base", strength: "alta", mw: 165, bp: 285, vp: 0.0003 },
  animalico: { note: "coracao", strength: "alta", mw: 130, bp: 260, vp: 0.02 },
  desconhecida: { note: "coracao", strength: "média", mw: 190, bp: 240, vp: 0.05 },
};
function fam(f: string): FamProfile {
  return FAM_PROFILE[f] ?? FAM_PROFILE.desconhecida;
}

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

// ---------------------------------------------------------------------------
// mapeamento ingrediente REAL -> MaterialInput sintético (APROXIMADO)
// ---------------------------------------------------------------------------
let nextId = 1;

/** Família canônica do ingrediente: texto do `note` -> nome do material -> família da recipe. */
function ingredientFamily(ing: RecipeIngredient, recipeFamilyCanon: string): string {
  return (
    mapToCanonFamily(ing.note) ??
    mapToCanonFamily(ing.material) ??
    recipeFamilyCanon
  );
}

/** Nota (topo/coração/base) do ingrediente: `note` canônico -> pirâmide da recipe -> nota típica da família. */
function ingredientNote(
  ing: RecipeIngredient,
  recipe: Recipe,
  family: string,
): "topo" | "coracao" | "base" {
  const fromNote = normalizeIngredientNote(ing.note);
  if (fromNote) return fromNote;
  if (recipe.pyramid.top?.includes(ing.material)) return "topo";
  if (recipe.pyramid.heart?.includes(ing.material)) return "coracao";
  if (recipe.pyramid.base?.includes(ing.material)) return "base";
  return fam(family).note;
}

function synthMaterial(ing: RecipeIngredient, recipe: Recipe, recipeFamilyCanon: string): MaterialInput {
  const family = ingredientFamily(ing, recipeFamilyCanon);
  const p = fam(family);
  const note = ingredientNote(ing, recipe, family);
  return {
    id: nextId++,
    name: ing.material, // nome real (habilita detecção de ultra-potentes por nome)
    note_type: note,
    odor_family: family,
    odor_description: `${ing.note ?? ""} ${ing.material}`.trim(),
    odor_strength: p.strength,
    molecular_weight: p.mw,
    boiling_point_c: p.bp,
    vapor_pressure: p.vp,
    logp: null,
    min_price: null,
    min_price_per_g: null,
    material_kind: "aroma_chemical",
    ifra_limit_pct: null,
    typical_use_pct: null,
  };
}

// ---------------------------------------------------------------------------
// avaliação de uma recipe
// ---------------------------------------------------------------------------
interface Eval {
  id: number;
  nome: string;
  esperadoRaw: string;
  esperado: string;
  previsto: string;
  ok: boolean;
}

function evalRecipe(recipe: Recipe): Eval | null {
  if (recipe.confidence !== "documented") return null;
  if (!recipe.family) return null;
  const withParts = recipe.ingredients.filter((i) => i.parts != null);
  if (withParts.length === 0) return null;

  const esperado = mapToCanonFamily(recipe.family) ?? "desconhecida";
  const recipeFamilyCanon = esperado;

  const formula: FormulaItem[] = withParts.map((ing) => ({
    material: synthMaterial(ing, recipe, recipeFamilyCanon),
    grams: ing.parts != null && ing.parts > 0 ? ing.parts : 1,
    dilutionPct: parseDilutionPct(ing.dilution),
  }));

  const pred = predictForward(formula);
  const previsto = pred.families[0]?.name ?? "(nenhuma)";
  return {
    id: recipe.id,
    nome: recipe.name,
    esperadoRaw: recipe.family,
    esperado,
    previsto,
    ok: previsto === esperado,
  };
}

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------
const all = listRecipes();
const results: Eval[] = [];
for (const r of all) {
  const e = evalRecipe(r);
  if (e) results.push(e);
}

const n = results.length;
const hits = results.filter((r) => r.ok).length;

function line(c = "=", k = 84) {
  return c.repeat(k);
}

console.log(line());
console.log("VALIDAÇÃO COM FÓRMULAS REAIS (recipes.json) — família dominante prevista");
console.log(line());
console.log("");
console.log(`  Total de fórmulas no dataset:            ${all.length}`);
console.log(`  Elegíveis (documented + family + parts): ${n}`);
console.log(
  `  Acerto de FAMÍLIA canônica dominante:    ${hits}/${n}  = ${
    n > 0 ? ((hits / n) * 100).toFixed(1) : "0.0"
  }%`,
);
console.log("");

console.log("  Tabela completa (esperado canônico <- rótulo original  |  previsto):");
console.log("  " + line("-", 82));
console.log(
  "  " +
    "#".padEnd(4) +
    "FÓRMULA".padEnd(34) +
    "ESPERADO".padEnd(14) +
    "PREVISTO".padEnd(14) +
    "OK",
);
console.log("  " + line("-", 82));
for (const r of results) {
  console.log(
    "  " +
      String(r.id).padEnd(4) +
      r.nome.slice(0, 33).padEnd(34) +
      r.esperado.padEnd(14) +
      r.previsto.padEnd(14) +
      (r.ok ? "✓" : "✗"),
  );
}
console.log("");

console.log(line());
console.log("5 EXEMPLOS (esperado vs previsto)");
console.log(line());
for (const r of results.slice(0, 5)) {
  console.log(`  [${r.ok ? "✓" : "✗"}] "${r.nome}"`);
  console.log(`      família da fórmula: "${r.esperadoRaw}"  ->  canônica esperada: ${r.esperado}`);
  console.log(`      previsto pelo motor: ${r.previsto}`);
}
console.log("");

console.log("  FALHAS:");
const fails = results.filter((r) => !r.ok);
if (fails.length === 0) {
  console.log("    (nenhuma)");
} else {
  for (const r of fails) {
    console.log(`    - #${r.id} "${r.nome}": esperava "${r.esperado}", previu "${r.previsto}"`);
  }
}
console.log("");
console.log("  HONESTIDADE: o mapeamento ingrediente->material é APROXIMADO (nomes genéricos,");
console.log("  física por família, não por molécula). Isto é um SINAL de validação com dados");
console.log("  REAIS (distinto da auto-calibração por acordes), não uma verdade absoluta.");
console.log("");
