/**
 * calibrate.ts — Calibração do motor heurístico contra os acordes de referência.
 *
 * Rode com:  cd web && npx tsx scripts/calibrate.ts
 *
 * Para CADA acorde do accords.json:
 *  1) Monta uma fórmula sintética — 1 MaterialInput por componente, com física
 *     (MW/BP/vapor), força e nota TÍPICAS da família do componente (derivadas do
 *     perfil médio de aroma-chemicals.json). A dose (gramas) = proporção do acorde.
 *  2) Roda predictForward.
 *  3) Verifica (a) família dominante prevista == acorde.familia (canônica) e
 *     (b) coerência da distribuição topo/coração/base com notes_expected.
 *
 * Reporta a taxa de acerto de FAMÍLIA (alvo >70%) e a de PIRÂMIDE. Serve para
 * ajustar as constantes de accords.ts. LIMITAÇÃO: é um sanity check ESTRUTURAL
 * contra receitas de referência — não é validação clínica/perceptual.
 */

import { predictForward, type MaterialInput, type FormulaItem } from "../lib/engine";
import { ACCORDS, mapToCanonFamily } from "../lib/accords";

// ---------------------------------------------------------------------------
// PERFIL FÍSICO/FORÇA TÍPICO POR FAMÍLIA CANÔNICA
// Derivado do perfil médio observável em aroma-chemicals.json (nota dominante da
// família + volatilidade típica). Usado só para dar a cada componente sintético
// valores plausíveis de MW/BP/vapor/força para que classifyNote/strength operem.
// ---------------------------------------------------------------------------
interface FamProfile {
  note: "topo" | "coracao" | "base";
  strength: "baixa" | "média" | "alta";
  mw: number;
  bp: number; // boiling point °C
  vp: number; // vapor pressure mmHg
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

// Um componente marcado como "trace, powerful"/"IFRA-restricted" no papel entra
// como força ALTA (limiar baixo -> dose pequena, impacto grande).
function strengthForComponent(role: string, base: "baixa" | "média" | "alta"): "baixa" | "média" | "alta" {
  const r = role.toLowerCase();
  if (r.includes("powerful") || r.includes("trace") || r.includes("ifra")) return "alta";
  return base;
}

let nextId = 1;
function synthMaterial(role: string, family: string, materialName?: string): MaterialInput {
  const p = fam(family);
  return {
    id: nextId++,
    // Usa o NOME REAL do material de referência do acorde (ex.: "Calone 1951"),
    // para que a detecção de materiais ULTRA-POTENTES por nome (accords.ts) opere
    // como operaria em produção. Cai no rótulo role[family] se o nome faltar.
    name: materialName ?? `${role} [${family}]`,
    note_type: p.note,
    odor_family: family,
    odor_description: `${role} ${materialName ?? ""}`.trim(),
    odor_strength: strengthForComponent(role, p.strength),
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
// avaliação de um acorde
// ---------------------------------------------------------------------------
interface Eval {
  nome: string;
  esperado: string;
  previsto: string;
  familiaOk: boolean;
  piramideScore: number; // 0..1 fração de notes_expected na camada certa
  piramideOk: boolean;
  topAccord: string | null;
  topAccordOk: boolean;
}

function evalAccord(acc: (typeof ACCORDS)[number]): Eval {
  const formula: FormulaItem[] = acc.componentes.map((c) => ({
    material: synthMaterial(c.papel, c.familia, c.material),
    grams: Math.max(0.5, c.proporcao * 100), // dose ∝ proporção
    dilutionPct: 100,
  }));
  const pred = predictForward(formula);
  const previsto = pred.families[0]?.name ?? "(nenhuma)";
  const familiaOk = previsto === acc.familia;

  // PIRÂMIDE (coerência estrutural): para cada token de notes_expected, mapeia sua
  // família canônica e verifica se essa família aparece na MESMA camada
  // (topo/coração/base) da pirâmide prevista. Mede se o motor distribuiu as famílias
  // nas camadas certas. (Os materiais sintéticos carregam o rótulo canônico da
  // família — por isso comparamos FAMÍLIAS, não os descritores PT do dataset.)
  const layerFamilies: Record<"topo" | "coracao" | "base", Set<string>> = {
    topo: new Set(pred.pyramid.topo.map((h) => h.family ?? "")),
    coracao: new Set(pred.pyramid.coracao.map((h) => h.family ?? "")),
    base: new Set(pred.pyramid.base.map((h) => h.family ?? "")),
  };
  let hit = 0;
  let tot = 0;
  for (const layer of ["topo", "coracao", "base"] as const) {
    for (const tok of acc.notesExpected[layer]) {
      const canon = mapToCanonFamily(tok);
      if (!canon) continue; // token sem família mapeável não conta
      tot++;
      if (layerFamilies[layer].has(canon)) hit++;
    }
  }
  const piramideScore = tot > 0 ? hit / tot : 1;

  const topAccord = pred.accords[0]?.name ?? null;
  return {
    nome: acc.nome,
    esperado: acc.familia,
    previsto,
    familiaOk,
    piramideScore,
    piramideOk: piramideScore >= 0.34, // ao menos ~1/3 das notas na camada certa
    topAccord,
    topAccordOk: topAccord === acc.nome,
  };
}

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------
const results = ACCORDS.map(evalAccord);
const n = results.length;
const famHits = results.filter((r) => r.familiaOk).length;
const pyrAvg = results.reduce((s, r) => s + r.piramideScore, 0) / n;
const pyrOk = results.filter((r) => r.piramideOk).length;
const selfHits = results.filter((r) => r.topAccordOk).length;

function line(c = "=", k = 78) {
  return c.repeat(k);
}
console.log(line());
console.log("CALIBRAÇÃO DO MOTOR — acordes de referência (accords.json)");
console.log(line());
console.log("");
console.log(
  "  " +
    "ACORDE".padEnd(40) +
    "ESPERADO".padEnd(14) +
    "PREVISTO".padEnd(14) +
    "FAM  PIR"
);
console.log("  " + line("-", 76));
for (const r of results) {
  console.log(
    "  " +
      r.nome.slice(0, 39).padEnd(40) +
      r.esperado.padEnd(14) +
      r.previsto.padEnd(14) +
      (r.familiaOk ? " ✓ " : " ✗ ") +
      `  ${(r.piramideScore * 100).toFixed(0)}%${r.piramideOk ? "" : "!"}`
  );
}
console.log("");
console.log(line());
console.log("RESUMO");
console.log(line());
console.log(`  Acordes avaliados:              ${n}`);
console.log(`  Acerto de FAMÍLIA dominante:    ${famHits}/${n}  = ${((famHits / n) * 100).toFixed(1)}%   (alvo > 70%)`);
console.log(`  Acerto de PIRÂMIDE (>=1/3):     ${pyrOk}/${n}  = ${((pyrOk / n) * 100).toFixed(1)}%`);
console.log(`  Cobertura média de PIRÂMIDE:    ${(pyrAvg * 100).toFixed(1)}%`);
console.log(`  Auto-detecção (acorde nº1 == ele mesmo): ${selfHits}/${n} = ${((selfHits / n) * 100).toFixed(1)}%`);
console.log("");
console.log("  FALHAS de família:");
for (const r of results.filter((x) => !x.familiaOk)) {
  console.log(`    - ${r.nome}: esperava "${r.esperado}", previu "${r.previsto}"`);
}
console.log("");
console.log("  LIMITAÇÃO: sanity check estrutural contra receitas de referência,");
console.log("  não validação clínica/perceptual. É heurística.");
console.log("");
