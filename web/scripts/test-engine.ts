/**
 * test-engine.ts — Demonstração runnable do motor heurístico.
 *
 * Rode com:  cd web && npx tsx scripts/test-engine.ts
 *
 * NÃO acessa banco: define MaterialInput sintéticos realistas (valores físicos
 * aproximados da Base §2.3 / §7 + campos IFRA da aroma-chemicals.json) e demonstra
 * predictForward + suggestReverse, incluindo IFRA (proibido/excesso) e a
 * decomposição de OE via essential-oils.json.
 */

import {
  predictForward,
  suggestReverse,
  type MaterialInput,
  type FormulaItem,
  type Prediction,
} from "../lib/engine";

// Base para os campos novos: a maioria dos materiais não tem teto IFRA fixo.
const NO_IFRA = { ifra_limit_pct: null as number | null, typical_use_pct: null as string | null };

// ---------------------------------------------------------------------------
// CATÁLOGO SINTÉTICO (valores aproximados da base de conhecimento)
// ---------------------------------------------------------------------------
const CATALOG: MaterialInput[] = [
  {
    id: 1,
    name: "Limoneno",
    note_type: "topo",
    odor_family: "citrus",
    odor_description: "casca de laranja cítrico fresco",
    odor_strength: "média",
    molecular_weight: 136.23, // Base §2.3
    boiling_point_c: 176,
    vapor_pressure: 1.5,
    logp: 4.2,
    min_price: 18.9,
    min_price_per_g: null,
    material_kind: "aroma_chemical",
    ...NO_IFRA,
  },
  {
    id: 2,
    name: "Linalool",
    note_type: "coracao",
    odor_family: "floral",
    odor_description: "floral amadeirado cítrico suave",
    odor_strength: "média",
    molecular_weight: 154.25, // Base §2.3
    boiling_point_c: 198,
    vapor_pressure: 0.16,
    logp: 2.97,
    min_price: 22.5,
    min_price_per_g: null,
    material_kind: "aroma_chemical",
    ...NO_IFRA,
  },
  {
    id: 3,
    name: "Iso E Super",
    note_type: "base",
    odor_family: "amadeirado",
    odor_description: "âmbar-amadeirado cedro radiante, halo aveludado",
    odor_strength: "média",
    molecular_weight: 234, // Base §2.3 fixadores
    boiling_point_c: 305,
    vapor_pressure: 0.0009,
    logp: 5.2,
    min_price: 29.0,
    min_price_per_g: null,
    material_kind: "aroma_chemical",
    ...NO_IFRA,
  },
  {
    id: 4,
    name: "Vanillin",
    note_type: "base",
    odor_family: "baunilha",
    odor_description: "baunilha doce cremosa gourmand",
    odor_strength: "alta",
    molecular_weight: 152.15,
    boiling_point_c: 285,
    vapor_pressure: 0.0002,
    logp: 1.2,
    min_price: 15.0,
    min_price_per_g: null,
    material_kind: "aroma_chemical",
    ...NO_IFRA,
  },
  {
    id: 5,
    name: "Hedione",
    note_type: "coracao",
    odor_family: "floral",
    odor_description: "jasmim radiante transparente, efeito fixador",
    odor_strength: "baixa",
    molecular_weight: 226.31,
    boiling_point_c: 300,
    vapor_pressure: 0.001,
    logp: 2.4,
    min_price: 34.0,
    min_price_per_g: null,
    material_kind: "aroma_chemical",
    ...NO_IFRA,
  },
  {
    id: 6,
    name: "Galaxolide",
    note_type: "base",
    odor_family: "musk",
    odor_description: "almíscar doce limpo woody, lavanderia/linho passado",
    odor_strength: "média",
    molecular_weight: 258, // Base §2.3
    boiling_point_c: 326,
    vapor_pressure: 0.00005,
    logp: 5.9,
    min_price: 27.5,
    min_price_per_g: null,
    material_kind: "aroma_chemical",
    ...NO_IFRA,
  },
  {
    id: 7,
    name: "Bergamota",
    note_type: "topo",
    odor_family: "citrus",
    odor_description: "cítrico-floral suave hespéride",
    odor_strength: "média",
    molecular_weight: 150,
    boiling_point_c: 185,
    vapor_pressure: 0.4,
    logp: 4.0,
    min_price: 39.9,
    min_price_per_g: null,
    material_kind: "aroma_chemical",
    ...NO_IFRA,
  },
  {
    id: 8,
    name: "Cumarina",
    note_type: "base",
    odor_family: "fougère",
    odor_description: "feno tonka doce cumarínico",
    odor_strength: "média",
    molecular_weight: 146.14,
    boiling_point_c: 301,
    vapor_pressure: 0.0009,
    logp: 1.4,
    min_price: 12.0,
    min_price_per_g: null,
    material_kind: "aroma_chemical",
    ...NO_IFRA,
  },
  {
    id: 9,
    name: "Oakmoss abs",
    note_type: "base",
    odor_family: "chypre",
    odor_description: "musgoso terroso chão de floresta mossy",
    odor_strength: "alta",
    molecular_weight: 200,
    boiling_point_c: 320,
    vapor_pressure: 0.0001,
    logp: 3.5,
    min_price: 45.0,
    min_price_per_g: null,
    material_kind: "aroma_chemical",
    // Oakmoss absolute: IFRA-restrito, teto baixo (~0.1% Cat 4). Base §13.
    ifra_limit_pct: 0.1,
    typical_use_pct: "0.01-0.1",
  },
  {
    id: 10,
    name: "Patchouli",
    note_type: "base",
    odor_family: "woody",
    odor_description: "amadeirado terroso balsâmico patchoulol",
    odor_strength: "média",
    molecular_weight: 222.37, // Base §2.3
    boiling_point_c: 287,
    vapor_pressure: 0.0004,
    logp: 4.8,
    min_price: 33.0,
    min_price_per_g: null,
    material_kind: "aroma_chemical",
    ...NO_IFRA,
  },
  {
    // SOLVENTE / carreador — SEM odor. Não entra na pirâmide/famílias/acordes;
    // só dilui a fórmula (Base §6.1: DPG é o diluente padrão DIY).
    id: 11,
    name: "Dipropileno Glicol (DPG)",
    note_type: null,
    odor_family: null,
    odor_description: null, // sem odor
    odor_strength: null,
    molecular_weight: 134.17,
    boiling_point_c: 232,
    vapor_pressure: null,
    logp: null,
    min_price: 8.0,
    min_price_per_g: null,
    material_kind: "solvent",
    ...NO_IFRA,
  },
  {
    // ÓLEO ESSENCIAL catalogado no essential-oils.json ("Lavender (true)"): será
    // decomposto pelos main_constituents reais (linalyl acetate, linalol, ocimeno...).
    id: 12,
    name: "Lavender (true)",
    note_type: "topo",
    odor_family: "aromatic-herbal",
    odor_description: "lavanda aromática herbal fresca",
    odor_strength: "média",
    molecular_weight: null,
    boiling_point_c: null,
    vapor_pressure: null,
    logp: null,
    min_price: 48.0,
    min_price_per_g: null,
    material_kind: "essential_oil",
    ...NO_IFRA,
  },
  {
    // MATERIAL PROIBIDO pela IFRA (ifra_limit_pct === 0): Lyral/HICC. Deve gerar
    // aviso forte "não usar" (Base §13).
    id: 13,
    name: "Lyral / HICC (PROHIBITED)",
    note_type: "coracao",
    odor_family: "floral",
    odor_description: "muguet lírio-do-vale floral fresco",
    odor_strength: "média",
    molecular_weight: 210,
    boiling_point_c: 290,
    vapor_pressure: 0.0006,
    logp: 3.0,
    min_price: null,
    min_price_per_g: null,
    material_kind: "aroma_chemical",
    ifra_limit_pct: 0,
    typical_use_pct: null,
  },
  {
    // Aldeído C-12 MNA: teto IFRA baixo (usamos 0.25% Cat 4) — usado em EXCESSO
    // abaixo para disparar o WARNING de IFRA.
    id: 14,
    name: "Aldeído C-12 MNA",
    note_type: "topo",
    odor_family: "aldehydic",
    odor_description: "aldeídico ceroso brilho sabão metálico",
    odor_strength: "alta",
    molecular_weight: 184.32,
    boiling_point_c: 245,
    vapor_pressure: 0.02,
    logp: 4.5,
    min_price: 25.0,
    min_price_per_g: null,
    material_kind: "aroma_chemical",
    ifra_limit_pct: 0.25,
    typical_use_pct: "0.01-0.1",
  },
  {
    // Material NEUTRO de volume (força baixa) — serve de "bulk" no teste de traço
    // ultra-potente: sozinho a 97% NÃO deve definir o caráter aquático.
    id: 15,
    name: "Solvente amadeirado neutro (bulk)",
    note_type: "base",
    odor_family: "woody",
    odor_description: "amadeirado neutro difuso de volume, força baixa",
    odor_strength: "baixa",
    molecular_weight: 220,
    boiling_point_c: 295,
    vapor_pressure: 0.0008,
    logp: 4.5,
    min_price: 10.0,
    min_price_per_g: null,
    material_kind: "aroma_chemical",
    ...NO_IFRA,
  },
  {
    // CALONE 1951 — traço ULTRA-POTENTE (ODT extremo, uso 0,2-0,8%). Deve DEFINIR
    // o caráter aquático mesmo a 3% da fórmula (blending-rules §3).
    id: 16,
    name: "Calone 1951",
    note_type: "topo",
    odor_family: "aquatic",
    odor_description: "marinho ozônico melão calone aquático",
    odor_strength: "alta",
    molecular_weight: 190.24,
    boiling_point_c: 270,
    vapor_pressure: 0.01,
    logp: 2.1,
    min_price: 55.0,
    min_price_per_g: null,
    material_kind: "aroma_chemical",
    ...NO_IFRA,
  },
];

const byName = (n: string): MaterialInput => {
  const m = CATALOG.find((x) => x.name === n);
  if (!m) throw new Error("material não encontrado: " + n);
  return m;
};

// ---------------------------------------------------------------------------
// MINI-HARNESS DE ASSERTS (sai com código != 0 se algum falhar)
// ---------------------------------------------------------------------------
let assertPass = 0;
let assertFail = 0;
function assert(name: string, cond: boolean, detail = "") {
  if (cond) {
    assertPass++;
    console.log(`  [PASS] ${name}${detail ? "  — " + detail : ""}`);
  } else {
    assertFail++;
    console.error(`  [FAIL] ${name}${detail ? "  — " + detail : ""}`);
  }
}

// ---------------------------------------------------------------------------
// helpers de impressão
// ---------------------------------------------------------------------------
function line(char = "-", n = 72): string {
  return char.repeat(n);
}
function printPrediction(title: string, p: Prediction) {
  console.log("\n" + line("="));
  console.log(title);
  console.log(line("="));

  console.log("\nPIRÂMIDE OLFATIVA (intensidade percebida 0-100):");
  for (const layer of ["topo", "coracao", "base"] as const) {
    const hits = p.pyramid[layer];
    const rendered = hits.length
      ? hits.map((h) => `${h.material} [${h.family ?? "?"}] ${h.intensity}`).join("  |  ")
      : "(vazio)";
    console.log(`  ${layer.toUpperCase().padEnd(8)}: ${rendered}`);
  }

  console.log("\nFAMÍLIAS (peso %):");
  console.log("  " + (p.families.map((f) => `${f.name} ${f.weight}%`).join("  ") || "(nenhuma)"));

  console.log("\nACORDES DETECTADOS (score 0-100):");
  console.log("  " + (p.accords.map((a) => `${a.name}: ${a.score}`).join("  |  ") || "(nenhum)"));

  console.log(`\nPROJEÇÃO/SILLAGE: ${p.projection}/100     LONGEVIDADE: ~${p.longevityHours} h`);

  console.log("\nTIMELINE DE EVAPORAÇÃO:");
  for (const t of p.timeline) {
    console.log(`  [${String(t.fromMin).padStart(3)}-${String(t.toMin).padStart(3)} min] ${t.label}: ${t.notes.join(", ")}`);
  }

  console.log("\nAVISOS:");
  if (p.warnings.length === 0) console.log("  (nenhum)");
  else for (const w of p.warnings) console.log("  - " + w);
}

// ===========================================================================
// (a) predictForward — fórmula exemplo estilo Fougère/Chypre
// ===========================================================================
const formula: FormulaItem[] = [
  { material: byName("Bergamota"), grams: 12, dilutionPct: 100 },
  { material: byName("Limoneno"), grams: 6, dilutionPct: 100 },
  { material: byName("Linalool"), grams: 8, dilutionPct: 100 },
  { material: byName("Hedione"), grams: 10, dilutionPct: 100 },
  { material: byName("Cumarina"), grams: 4, dilutionPct: 10 }, // diluída a 10%
  { material: byName("Oakmoss abs"), grams: 1, dilutionPct: 10 }, // traço, IFRA 0,10%
  { material: byName("Patchouli"), grams: 3, dilutionPct: 100 },
  { material: byName("Iso E Super"), grams: 8, dilutionPct: 100 },
  { material: byName("Vanillin"), grams: 2, dilutionPct: 10 },
];

const pred = predictForward(formula);
printPrediction("(a) predictForward — fórmula exemplo (topo cítrico + coração floral + base fougère/chypre)", pred);

// ===========================================================================
// (a2) SOLVENTE — mesma fórmula SEM e COM DPG (mostra a queda de intensidade/projeção)
// ===========================================================================
const baseBlend: FormulaItem[] = [
  { material: byName("Bergamota"), grams: 10, dilutionPct: 100 },
  { material: byName("Linalool"), grams: 6, dilutionPct: 100 },
  { material: byName("Iso E Super"), grams: 8, dilutionPct: 100 },
  { material: byName("Vanillin"), grams: 2, dilutionPct: 10 },
];
// Mesmos odorantes, agora afogados em 74 g de solvente (concentrado ~26%).
const dilutedBlend: FormulaItem[] = [
  ...baseBlend,
  { material: byName("Dipropileno Glicol (DPG)"), grams: 74, dilutionPct: 100 },
];

const predSem = predictForward(baseBlend);
const predCom = predictForward(dilutedBlend);
printPrediction("(a2-i) SEM solvente — concentrado puro", predSem);
printPrediction("(a2-ii) COM 74g de DPG (solvente/diluente) — mesma mistura odorante", predCom);
console.log(`\n>>> EFEITO DO SOLVENTE:  projeção/sillage ${predSem.projection} -> ${predCom.projection}  (queda por diluição, Base §6.1)`);
console.log(
  ">>> A pirâmide mostra intensidades RELATIVAS (normalizadas ao pico=100), por isso o balanço interno não muda;\n" +
    ">>> o efeito físico da diluição aparece na PROJEÇÃO (menos moléculas no ar). O solvente NÃO entra em pirâmide/famílias/acordes."
);

// ===========================================================================
// (a3) ÓLEO ESSENCIAL — decomposto pelos main_constituents REAIS do dataset
// ===========================================================================
const oilBlend: FormulaItem[] = [
  { material: byName("Lavender (true)"), grams: 20, dilutionPct: 100 },
  { material: byName("Iso E Super"), grams: 5, dilutionPct: 100 },
];
const predOil = predictForward(oilBlend);
printPrediction("(a3) ÓLEO ESSENCIAL — Lavanda decomposta pelos constituintes reais (essential-oils.json)", predOil);
const oilHits = [...predOil.pyramid.topo, ...predOil.pyramid.coracao, ...predOil.pyramid.base].filter((h) =>
  h.material.startsWith("Lavender (true)")
);
console.log(`\n>>> O OE gerou ${oilHits.length} sub-notas a partir do JSON: ${oilHits.map((h) => `${h.material.split("·")[1]?.trim()} [${h.family}]`).join(", ")}`);
if (oilHits.length < 2) console.error("!!! ESPERADO: o OE catalogado deveria gerar >=2 sub-notas do dataset.");

// ===========================================================================
// (a4) IFRA — material PROIBIDO (ifra 0) e material EXCEDENDO o teto
// ===========================================================================
const ifraBlend: FormulaItem[] = [
  { material: byName("Bergamota"), grams: 20, dilutionPct: 100 },
  { material: byName("Lyral / HICC (PROHIBITED)"), grams: 2, dilutionPct: 100 }, // proibido (ifra 0)
  { material: byName("Aldeído C-12 MNA"), grams: 1, dilutionPct: 100 }, // ~4.5% >> teto 0.25%
  { material: byName("Iso E Super"), grams: 3, dilutionPct: 100 },
];
const predIfra = predictForward(ifraBlend);
printPrediction("(a4) IFRA — proibido (Lyral/HICC) + excesso (Aldeído C-12 MNA acima de 0,25%)", predIfra);
const proibido = predIfra.warnings.some((w) => w.includes("PROIBIDO"));
const excesso = predIfra.warnings.some((w) => w.includes("acima do teto IFRA"));
console.log(`\n>>> IFRA checks:  proibido detectado = ${proibido}   |   excesso detectado = ${excesso}`);
if (!proibido) console.error("!!! ESPERADO: aviso de material PROIBIDO (ifra 0).");
if (!excesso) console.error("!!! ESPERADO: aviso de material acima do teto IFRA.");

// ===========================================================================
// (b) suggestReverse — pedido: floral intenso + base amadeirada média
// ===========================================================================
console.log("\n" + line("="));
console.log("(b) suggestReverse — alvo: [{family:'floral', intensity:70}, {note:'base', family:'amadeirado', intensity:50}]");
console.log(line("="));

const rev = suggestReverse(
  [
    { family: "floral", intensity: 70 },
    { note: "base", family: "amadeirado", intensity: 50 },
  ],
  CATALOG
);

console.log("\nMATERIAIS SUGERIDOS (concentrado, % somam ~100):");
for (const it of rev.items) {
  console.log(`  • [${it.noteType.toUpperCase().padEnd(7)}] ${it.material.name}  ->  ${it.suggestedPct}%  (${it.role})`);
  console.log(`      ${it.reason}`);
}
console.log(`\nBALANÇO DA PIRÂMIDE:  topo ${rev.pyramidBalance.topo}%  /  coração ${rev.pyramidBalance.coracao}%  /  base ${rev.pyramidBalance.base}%`);
console.log(`\nDILUENTE SUGERIDO:  ${rev.solvent.name}  @ ~${rev.solvent.concentrationPct}%`);
console.log(`  ${rev.solvent.note}`);
console.log("\nNOTAS DE EQUILÍBRIO:");
for (const n of rev.notes) console.log("  - " + n);

// ===========================================================================
// ASSERTS — casos-limite (o script sai com código != 0 se algum falhar)
// ===========================================================================
console.log("\n" + line("="));
console.log("ASSERTS — casos-limite");
console.log(line("="));

// (a) fórmula vazia
{
  const p = predictForward([]);
  assert(
    "(a) fórmula vazia",
    p.pyramid.topo.length === 0 && p.pyramid.coracao.length === 0 && p.pyramid.base.length === 0 &&
      p.families.length === 0 && p.accords.length === 0 && p.projection === 0 && p.longevityHours === 0 &&
      p.warnings.some((w) => w.toLowerCase().includes("vazia")),
    `projeção=${p.projection}, avisos=[${p.warnings.join("; ")}]`
  );
}

// (b) só solvente
{
  const p = predictForward([{ material: byName("Dipropileno Glicol (DPG)"), grams: 50, dilutionPct: 100 }]);
  assert(
    "(b) só solvente (sem odorante)",
    p.families.length === 0 && p.projection === 0 && p.pyramid.topo.length === 0 &&
      p.warnings.some((w) => w.toLowerCase().includes("solvente")),
    `avisos=[${p.warnings.join("; ")}]`
  );
}

// (c) traço ultra-potente definindo o caráter: 97% bulk neutro + 3% Calone
{
  const p = predictForward([
    { material: byName("Solvente amadeirado neutro (bulk)"), grams: 97, dilutionPct: 100 },
    { material: byName("Calone 1951"), grams: 3, dilutionPct: 100 },
  ]);
  const aqua = p.families.find((f) => f.name === "aquatico");
  assert(
    "(c) traço ultra-potente (3% Calone) faz 'aquatico' aparecer com peso relevante",
    !!aqua && aqua.weight >= 20,
    `famílias=[${p.families.map((f) => f.name + " " + f.weight + "%").join(", ")}]`
  );
}

// (d) IFRA proibido (ifra 0)
{
  const p = predictForward([
    { material: byName("Bergamota"), grams: 20, dilutionPct: 100 },
    { material: byName("Lyral / HICC (PROHIBITED)"), grams: 2, dilutionPct: 100 },
  ]);
  assert(
    "(d) IFRA proibido (ifra 0) gera aviso PROIBIDO",
    p.warnings.some((w) => w.includes("PROIBIDO")),
    `avisos IFRA=[${p.warnings.filter((w) => w.includes("IFRA") || w.includes("PROIBIDO")).join("; ")}]`
  );
}

// (e) IFRA excedido
{
  const p = predictForward([
    { material: byName("Bergamota"), grams: 20, dilutionPct: 100 },
    { material: byName("Aldeído C-12 MNA"), grams: 1, dilutionPct: 100 }, // ~4.8% >> teto 0.25%
  ]);
  assert(
    "(e) IFRA excedido gera aviso 'acima do teto IFRA'",
    p.warnings.some((w) => w.includes("acima do teto IFRA")),
    `avisos IFRA=[${p.warnings.filter((w) => w.includes("IFRA")).join("; ")}]`
  );
}

// (f) OE decomposto em >=2 sub-notas
{
  const p = predictForward([{ material: byName("Lavender (true)"), grams: 20, dilutionPct: 100 }]);
  const sub = [...p.pyramid.topo, ...p.pyramid.coracao, ...p.pyramid.base].filter((h) =>
    h.material.startsWith("Lavender (true)")
  );
  assert(
    "(f) óleo essencial decomposto em >=2 sub-notas",
    sub.length >= 2,
    `sub-notas=${sub.length}: [${sub.map((h) => h.material.split("·")[1]?.trim()).join(", ")}]`
  );
}

// (g) suggestReverse devolve topo + coração + base (completa lacunas)
{
  // Pede só floral (coração) + amadeirado base; DEVE completar TOPO sozinho.
  const r = suggestReverse(
    [
      { family: "floral", intensity: 70 },
      { note: "base", family: "amadeirado", intensity: 50 },
    ],
    CATALOG
  );
  const layers = new Set(r.items.map((i) => i.noteType));
  assert(
    "(g) suggestReverse cobre topo + coração + base",
    layers.has("topo") && layers.has("coracao") && layers.has("base"),
    `camadas=[${[...layers].join(", ")}]  itens=[${r.items.map((i) => `${i.material.name}(${i.noteType})`).join(", ")}]`
  );
  const soma = r.items.reduce((s, i) => s + i.suggestedPct, 0);
  assert(
    "(g2) suggestReverse: % do concentrado somam ~100",
    Math.abs(soma - 100) < 0.5,
    `soma=${soma.toFixed(2)}%`
  );
  assert(
    "(g3) suggestReverse: sugere diluente + diluição inicial",
    !!r.solvent && r.solvent.concentrationPct > 0 && r.solvent.name.length > 0,
    `${r.solvent?.name} @ ${r.solvent?.concentrationPct}%`
  );
}

console.log("\n" + line("="));
console.log(`RESULTADO DOS ASSERTS:  ${assertPass} passaram, ${assertFail} falharam.`);
console.log(line("=") + "\n");

if (assertFail > 0) {
  console.error(`FALHA: ${assertFail} assert(s) não passaram.`);
  process.exit(1);
}
console.log("OK — motor executado e todos os asserts passaram.\n");
