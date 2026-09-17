/**
 * engine.ts — Motor heurístico de previsão olfativa (funções puras, TS, ESM).
 *
 * Baseado em knowledge/base_conhecimento_perfumaria.md. Recebe os materiais como
 * parâmetro (sem acesso a banco): o webapp e os testes injetam os dados.
 *
 * Duas direções:
 *  - predictForward(formula): (ingredientes+gramas+diluição) -> pirâmide, famílias,
 *    acordes detectados, projeção, longevidade, timeline, avisos.
 *  - suggestReverse(targets, catálogo): (notas desejadas + intensidade) -> materiais
 *    sugeridos com % inicial e justificativa.
 *
 * Todas as fórmulas citam a seção da base. Cortes/expoentes vêm de accords.ts
 * (constantes calibráveis).
 */

import {
  ACCORDS,
  FAMILY_DESCRIPTORS,
  POTENCY_WEIGHT,
  POTENCY_WEIGHT_DEFAULT,
  ULTRA_POTENT_BOOST,
  ULTRA_POTENT_KEYWORDS,
  STEVENS_EXPONENT_DEFAULT,
  STEVENS_EXPONENT_BY_CLASS,
  BOILING_POINT_TOPO_MAX_C,
  BOILING_POINT_BASE_MIN_C,
  MW_TOPO_MAX,
  MW_CORACAO_MAX,
  VAPOR_PRESSURE_TOPO_MIN,
  VAPOR_PRESSURE_BASE_MAX,
  PROJECTION_NOTE_BOOST,
  ACCORD_W_COVERAGE,
  ACCORD_W_SIMILARITY,
  ACCORD_W_PYRAMID,
  EMERGENT_FAMILY_RULES,
  mapToCanonFamily,
} from "./accords";
import { decomposeOilFromDataset } from "./essential-oils";

// ============================================================================
// TIPOS PÚBLICOS (nomes exatos exigidos)
// ============================================================================
export type NoteType = "topo" | "coracao" | "base";
export type OdorStrength = "baixa" | "média" | "alta";

export interface MaterialInput {
  id: number;
  name: string;
  note_type: "topo" | "coracao" | "base" | null;
  odor_family: string | null;
  odor_description: string | null;
  odor_strength: "baixa" | "média" | "alta" | null;
  molecular_weight: number | null;
  boiling_point_c: number | null;
  vapor_pressure: number | null;
  logp: number | null;
  min_price: number | null;
  /** Menor preço por grama de material PURO (R$/g) entre as ofertas. */
  min_price_per_g: number | null;
  /** Fornecedor com o menor price_per_g (nome da source). */
  cheapest_source?: string | null;
  /**
   * Tipo do material (Base §6 diluição / §7): 'aroma_chemical' | 'essential_oil'
   * | 'solvent' | 'base_essencia'. Muda o tratamento no motor:
   *  - 'solvent': carreador/diluente, NÃO tem odor — dilui a fórmula (§6.1).
   *  - 'essential_oil': mistura multi-nota — decomposta em vários sub-hits (§1/§7).
   */
  material_kind: string | null;
  /**
   * Teto de segurança IFRA (Cat 4, leave-on) em % do produto final, se aplicável
   * (Base §13 / blending-rules §8). Semântica:
   *  - null  => sem limite fixo (ou não catalogado): nenhum aviso.
   *  - >0    => WARNING quando a concentração do material na fórmula excede o valor.
   *  - 0     => material PROIBIDO/banido (ex.: Lyral/HICC, Lilial): aviso forte.
   */
  ifra_limit_pct: number | null;
  /** Faixa de uso típico (% do concentrado), texto livre do dataset (ex.: "0.3-20"). */
  typical_use_pct: string | null;
}

export interface FormulaItem {
  material: MaterialInput;
  grams: number;
  dilutionPct: number; // 100 => puro
}

export interface NoteHit {
  material: string;
  family: string | null;
  intensity: number; // 0-100 percebida
}

export interface Prediction {
  pyramid: { topo: NoteHit[]; coracao: NoteHit[]; base: NoteHit[] };
  families: { name: string; weight: number }[];
  accords: { name: string; score: number }[];
  projection: number; // 0-100
  longevityHours: number;
  timeline: { phase: string; label: string; fromMin: number; toMin: number; notes: string[] }[];
  warnings: string[];
}

// ============================================================================
// HELPERS DE CLASSIFICAÇÃO
// ============================================================================

/** Normaliza string (minúsculas, sem acento) para casar descritores. */
function normStr(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // remove diacríticos combinantes
}

/**
 * Classifica um material em topo/coração/base.
 * Prioridade (Base §2.1): note_type explícito > boiling_point_c > vapor_pressure > MW.
 * MW/Torr são heurística SECUNDÁRIA (Base §8 caveat 1).
 */
export function classifyNote(m: MaterialInput): NoteType {
  if (m.note_type) return m.note_type;

  // Ponto de ebulição: <200 topo, 200–260 coração, >260 base (Base §2.1).
  if (m.boiling_point_c != null) {
    if (m.boiling_point_c < BOILING_POINT_TOPO_MAX_C) return "topo";
    if (m.boiling_point_c > BOILING_POINT_BASE_MIN_C) return "base";
    return "coracao";
  }

  // Pressão de vapor @25 °C (mmHg): >0,1 topo; 0,001–0,1 coração; <0,001 base (Base §2.1).
  if (m.vapor_pressure != null) {
    if (m.vapor_pressure > VAPOR_PRESSURE_TOPO_MIN) return "topo";
    if (m.vapor_pressure < VAPOR_PRESSURE_BASE_MAX) return "base";
    return "coracao";
  }

  // Peso molecular (regra prática): <160 topo; 160–220 coração; >220 base (Base §2.1).
  if (m.molecular_weight != null) {
    if (m.molecular_weight < MW_TOPO_MAX) return "topo";
    if (m.molecular_weight <= MW_CORACAO_MAX) return "coracao";
    return "base";
  }

  // Sem nenhum dado físico: assume coração (posição neutra).
  return "coracao";
}

/** Mapeia odor_family / odor_description livres para uma família canônica. */
export function classifyFamily(m: MaterialInput): string | null {
  // 1) mapeamento do odor_family (cobre rótulos hifenizados dos datasets)
  const byFamily = mapToCanonFamily(m.odor_family);
  if (byFamily) return byFamily;
  // 2) busca por descritores no odor_family + odor_description
  const hay = normStr([m.odor_family ?? "", m.odor_description ?? ""].join(" "));
  let best: string | null = null;
  let bestHits = 0;
  for (const [fam, kws] of Object.entries(FAMILY_DESCRIPTORS)) {
    let hits = 0;
    for (const kw of kws) if (hay.includes(normStr(kw))) hits++;
    if (hits > bestHits) {
      bestHits = hits;
      best = fam;
    }
  }
  return best;
}

/** True se o material é um solvente/carreador puro (sem odor). Base §6.1. */
export function isSolvent(m: MaterialInput): boolean {
  return normStr(m.material_kind ?? "") === "solvent";
}

/** True se o material é um óleo essencial (mistura multi-nota). Base §1/§7. */
export function isEssentialOil(m: MaterialInput): boolean {
  return normStr(m.material_kind ?? "") === "essential_oil";
}

/**
 * Faixa de nota típica de cada família ao decompor um óleo essencial (Base §2.1
 * volatilidade x §1 famílias): cítricos/verdes/aromáticos são voláteis (topo),
 * florais/frutados/especiarias ficam no coração, resinas/madeiras/almíscar/baunilha
 * ancoram na base. Usado só para distribuir os sub-hits de um OE na pirâmide.
 */
const FAMILY_DEFAULT_NOTE: Record<string, NoteType> = {
  citrus: "topo",
  verde: "topo",
  aromatico: "topo",
  aquatico: "topo",
  floral: "coracao",
  frutado: "coracao",
  especiado: "coracao",
  chypre: "base",
  woody: "base",
  amber: "base",
  musk: "base",
  gourmand: "base",
  leather: "base",
  animalico: "base",
  fougere: "base",
};

export interface OilComponent {
  family: string; // família canônica do descritor
  note: NoteType; // faixa plausível na pirâmide
  descriptor: string; // rótulo textual (palavra/família casada)
  weight: number; // peso relativo do componente dentro do OE (soma ~1)
}

/**
 * Decompõe um óleo essencial em vários componentes (sub-notas) a partir do
 * odor_description (parser simples: quebra a descrição em palavras e casa cada
 * uma contra FAMILY_DESCRIPTORS de accords.ts). Cada família encontrada vira um
 * componente distribuído em topo/coração/base por FAMILY_DEFAULT_NOTE
 * (Base §1 famílias + §2.1 volatilidade: cítricos=topo, especiarias=coração,
 * resinas/madeiras=base). Se nada casar, devolve [] (o chamador cai no
 * comportamento de nota única, marcado como mistura).
 */
export function decomposeEssentialOil(m: MaterialInput): OilComponent[] {
  const hay = normStr([m.odor_family ?? "", m.odor_description ?? ""].join(" "));
  if (!hay.trim()) return [];
  // Conta quantas palavras-chave de cada família aparecem (peso = nº de acertos).
  const famScore = new Map<string, number>();
  const famDescriptor = new Map<string, string>();
  for (const [fam, kws] of Object.entries(FAMILY_DESCRIPTORS)) {
    let hits = 0;
    let firstKw: string | null = null;
    for (const kw of kws) {
      if (hay.includes(normStr(kw))) {
        hits++;
        if (firstKw === null) firstKw = kw;
      }
    }
    if (hits > 0) {
      famScore.set(fam, hits);
      famDescriptor.set(fam, firstKw ?? fam);
    }
  }
  if (famScore.size === 0) return [];
  const total = Array.from(famScore.values()).reduce((s, v) => s + v, 0) || 1;
  return Array.from(famScore.entries()).map(([fam, hits]) => ({
    family: fam,
    note: FAMILY_DEFAULT_NOTE[fam] ?? "coracao",
    descriptor: famDescriptor.get(fam) ?? fam,
    weight: hits / total,
  }));
}

/**
 * Peso de POTÊNCIA odorífera (proxy inverso de ODT / OAV), Base §3.1/§3.4 e
 * blending-rules §3. É um FATOR MULTIPLICATIVO da intensidade percebida —
 * separado da compressão de Stevens — para que a dominância seja governada por
 * "força × dose" e não pela dose sozinha. Combina:
 *   POTENCY_WEIGHT[odor_strength]  (range amplo 1/6/30, proxy grosso de 1/ODT)
 * × ULTRA_POTENT_BOOST se o material é reconhecido como ultra-potente por nome/
 *   descritor (Calone, aldeídos de brilho, damasconas, IBQ, Ambrox, indol...).
 */
function potencyWeight(m: MaterialInput): number {
  const base =
    m.odor_strength && m.odor_strength in POTENCY_WEIGHT
      ? POTENCY_WEIGHT[m.odor_strength]
      : POTENCY_WEIGHT_DEFAULT;
  return base * ultraPotentBoost(m);
}

/** Fator de força numa escala 1..4 (0 baixa .. 1 alta) para heurísticas auxiliares
 * (projeção/longevidade) que ainda raciocinam em "quão forte é este material".
 * NÃO entra na loudness (essa usa potencyWeight). Mantido em 1/2/4 p/ não distorcer
 * as fórmulas de projeção/tenacidade calibradas nessa escala. */
function strengthLevel(m: MaterialInput): number {
  if (m.odor_strength === "alta") return 4;
  if (m.odor_strength === "média") return 2;
  if (m.odor_strength === "baixa") return 1;
  return 2;
}

/** Multiplicador extra p/ materiais ULTRA-POTENTES reconhecidos (ODT extremo). */
function ultraPotentBoost(m: MaterialInput): number {
  const hay = normStr([m.name ?? "", m.odor_family ?? "", m.odor_description ?? ""].join(" "));
  for (const kw of ULTRA_POTENT_KEYWORDS) {
    if (hay.includes(normStr(kw))) return ULTRA_POTENT_BOOST;
  }
  return 1;
}

/** Expoente de Stevens por família (Base §3.3), com default 0,5. */
function stevensExponent(family: string | null): number {
  if (family && family in STEVENS_EXPONENT_BY_CLASS) return STEVENS_EXPONENT_BY_CLASS[family];
  // aldeídos entram como "aldeidico" via família animálico/floral? tratamos por descritor:
  return STEVENS_EXPONENT_DEFAULT;
}

// ============================================================================
// predictForward — FORWARD (fórmula -> percepção)
// ============================================================================

/**
 * Loudness (intensidade percebida BRUTA) de um item — Base §3.4 passo 1-2, com a
 * potência SEPARADA da massa (corrige "trace-dominant"):
 *
 *   effConc  = gramas · (dilutionPct/100)            (concentração efetiva, ∝ massa)
 *   loudness = effConc^a · potencyWeight             (a = expoente de Stevens, <1)
 *
 * A massa entra COMPRIMIDA por Stevens (a<1, sub-linear); a POTÊNCIA entra como
 * fator LINEAR e de range amplo (1/6/30 × boost ultra). Assim um material de alta
 * potência em traço (Calone a 0,4%, oakmoss, aldeídos) produz loudness alta apesar
 * da massa minúscula — a assinatura deixa de ser "afogada" pelos materiais de
 * volume. É a implementação direta de OAV = conc/ODT (blending-rules §3): o termo
 * de potência é o proxy grosso de 1/ODT.
 */
function rawLoudness(item: FormulaItem, family: string | null): number {
  const effConc = Math.max(0, item.grams) * (item.dilutionPct / 100);
  const a = stevensExponent(family);
  return Math.pow(effConc, a) * potencyWeight(item.material);
}

export function predictForward(formula: FormulaItem[]): Prediction {
  const warnings: string[] = [];

  if (formula.length === 0) {
    return {
      pyramid: { topo: [], coracao: [], base: [] },
      families: [],
      accords: [],
      projection: 0,
      longevityHours: 0,
      timeline: [],
      warnings: ["Fórmula vazia."],
    };
  }

  // ---- 1) por item: nota, família, loudness bruta ----
  interface Row {
    item: FormulaItem;
    note: NoteType;
    family: string | null;
    loudness: number;
    effConc: number; // conc efetiva (para famílias/avisos)
    massFrac: number; // fração em peso (para avisos de dosagem)
    label: string; // nome exibido (OE anota o descritor do sub-hit)
    oilWeight?: number; // peso do sub-componente dentro do OE (só p/ OE decomposto)
  }

  // Massa efetiva por item (gramas · diluição). Inclui solventes: um material
  // diluído a 10% já carrega 90% de solvente embutido — mas aqui só contamos a
  // massa efetiva do CONCENTRADO odorante; o solvente explícito entra abaixo.
  const effMass = (f: FormulaItem) => Math.max(0, f.grams) * (f.dilutionPct / 100);

  // Separa solventes (carreadores sem odor) dos materiais odorantes (Base §6.1).
  const solventItems = formula.filter((f) => isSolvent(f.material));
  const odorItems = formula.filter((f) => !isSolvent(f.material));

  // Massa odorante efetiva (só materiais com odor).
  const odorMass = odorItems.reduce((s, f) => s + effMass(f), 0);
  // Massa de solvente EXPLÍCITO (materiais material_kind==='solvent', puros).
  const solventMass = solventItems.reduce((s, f) => s + Math.max(0, f.grams) * (f.dilutionPct / 100), 0);

  // Volume total da fórmula = odorante + solvente. A concentração odorante efetiva
  // (Base §3.4 passo 1: OAV ∝ fração_peso) cai proporcionalmente com mais solvente:
  //   dilutionFactor = massa_odorante / (massa_odorante + massa_solvente)
  // Aplicado à loudness de cada odorante (menos concentração => menor intensidade
  // percebida e menor projeção). Sem solvente => fator 1 (nada muda).
  const totalVolume = odorMass + solventMass;
  const dilutionFactor = totalVolume > 0 ? odorMass / totalVolume : 1;

  const totalGrams = odorMass || 1;

  const rows: Row[] = [];
  for (const item of odorItems) {
    const effConc = effMass(item);
    if (isEssentialOil(item.material)) {
      // Óleo essencial: mistura multi-nota. PRIMEIRO tenta o dataset real
      // (main_constituents com nota/família/%); se o OE não estiver catalogado,
      // cai no parser de palavras do odor_description (comportamento anterior).
      const dsComps = decomposeOilFromDataset(item.material.name);
      const comps = dsComps.length > 0 ? dsComps : decomposeEssentialOil(item.material);
      if (comps.length > 0) {
        for (const c of comps) {
          // loudness do sub-componente = fração·loudness do OE inteiro (com sua família).
          rows.push({
            item,
            note: c.note,
            family: c.family,
            loudness: rawLoudness(item, c.family) * c.weight * dilutionFactor,
            effConc: effConc * c.weight,
            massFrac: (effConc * c.weight) / totalGrams,
            label: `${item.material.name} · ${c.descriptor}`,
            oilWeight: c.weight,
          });
        }
        continue;
      }
      // Não decompôs: cai no comportamento de nota única, marcado como mistura.
      const family = classifyFamily(item.material);
      rows.push({
        item,
        note: classifyNote(item.material),
        family,
        loudness: rawLoudness(item, family) * dilutionFactor,
        effConc,
        massFrac: effConc / totalGrams,
        label: `${item.material.name} (mistura)`,
      });
      continue;
    }
    // Material comum (aroma chemical / base_essencia): 1 nota.
    const family = classifyFamily(item.material);
    rows.push({
      item,
      note: classifyNote(item.material),
      family,
      loudness: rawLoudness(item, family) * dilutionFactor,
      effConc,
      massFrac: effConc / totalGrams,
      label: item.material.name,
    });
  }

  // Fórmula só de solvente (ou vazia de odorantes): nada a prever.
  if (rows.length === 0) {
    if (solventMass > 0) warnings.push("Fórmula composta apenas por solvente (diluente) — sem material odorante.");
    return {
      pyramid: { topo: [], coracao: [], base: [] },
      families: [],
      accords: [],
      projection: 0,
      longevityHours: 0,
      timeline: buildTimeline({ topo: [], coracao: [], base: [] }),
      warnings,
    };
  }

  // ---- 2) normaliza loudness -> intensidade percebida 0-100 ----
  // Escala pela maior loudness (dominante = 100). Aplica desconto sub-aditivo
  // por camada (Base §3.4 / §8 caveat 4) ao agregar famílias, não ao pico.
  const maxLoud = Math.max(...rows.map((r) => r.loudness), 1e-9);
  const hits: (NoteHit & { note: NoteType; loudness: number })[] = rows.map((r) => ({
    material: r.label,
    family: r.family,
    intensity: Math.round((r.loudness / maxLoud) * 100),
    note: r.note,
    loudness: r.loudness,
  }));

  const pyramid = {
    topo: hits.filter((h) => h.note === "topo").map(stripHit).sort(byIntensityDesc),
    coracao: hits.filter((h) => h.note === "coracao").map(stripHit).sort(byIntensityDesc),
    base: hits.filter((h) => h.note === "base").map(stripHit).sort(byIntensityDesc),
  };

  // ---- 3) famílias ponderadas por loudness (com desconto sub-aditivo) ----
  const famLoud = aggregateFamilyLoudness(rows);
  const famTotal = Array.from(famLoud.values()).reduce((s, v) => s + v, 0) || 1;
  const families = Array.from(famLoud.entries())
    .map(([name, v]) => ({ name, weight: Math.round((v / famTotal) * 100) }))
    .sort((a, b) => b.weight - a.weight);

  // ---- 4) acordes detectados ----
  const accords = detectAccords(rows.map((r) => ({ family: r.family, loudness: r.loudness, note: r.note, label: r.label })));

  // ---- 5) projeção (0-100) — Base §5.1 ----
  // Dirigida por materiais de TOPO + ALTA FORÇA + volatilidade (baixo MW / alto
  // vapor_pressure / baixo boiling point). "Menor threshold + maior volatilidade
  // => maior sillage".
  // computeProjection normaliza por loudness (o dilutionFactor cancelaria por ser
  // uniforme), então multiplicamos a projeção final pelo dilutionFactor: mais
  // solvente => concentração menor => menos moléculas no ar => menor sillage (§6.1).
  const projection = Math.round(computeProjection(rows) * dilutionFactor);

  // ---- 6) longevidade (horas) — Base §5.1/§2.3 ----
  // Dirigida por materiais de BASE / fixadores (alto boiling point, baixa
  // vapor_pressure, alto MW).
  const longevityHours = computeLongevity(rows);

  // ---- 7) timeline de evaporação (Base §2.2) ----
  const timeline = buildTimeline(pyramid);

  // ---- 8) avisos ----
  warnings.push(...buildWarnings(rows, hits, families));

  // ---- 8b) IFRA (Base §13 / blending-rules §8) ----
  // Concentração de cada material na fórmula = massa_efetiva / massa_total · 100,
  // onde massa_total = odorante + solvente (totalVolume). Compara com ifra_limit_pct.
  warnings.push(...buildIfraWarnings(formula, totalVolume));

  // aviso informativo: fração de solvente (diluente) na fórmula (Base §6.1).
  if (solventMass > 0 && totalVolume > 0) {
    const pct = (solventMass / totalVolume) * 100;
    warnings.push(
      `${pct.toFixed(1)}% da fórmula é solvente (diluente) — concentração odorante efetiva a ${(dilutionFactor * 100).toFixed(1)}%; ` +
        `intensidade e projeção reduzidas proporcionalmente (Base §6.1).`
    );
  }

  return { pyramid, families, accords, projection, longevityHours, timeline, warnings };
}

function stripHit(h: NoteHit & { note: NoteType; loudness: number }): NoteHit {
  return { material: h.material, family: h.family, intensity: h.intensity };
}
function byIntensityDesc(a: NoteHit, b: NoteHit): number {
  return b.intensity - a.intensity;
}

/**
 * Projeção 0-100 (Base §5.1). Combina, por item de topo/coração:
 *  - força odorífera (fator)
 *  - volatilidade (alto vapor_pressure OU baixo boiling point OU baixo MW)
 *  - peso perceptivo (loudness), para que traços potentes contem.
 */
function computeProjection(rows: { item: FormulaItem; note: NoteType; family: string | null; loudness: number }[]): number {
  let scoreSum = 0;
  let loudSum = 0;
  for (const r of rows) {
    const m = r.item.material;
    // volatilidade normalizada 0..1
    let vol = 0.4; // neutro
    if (m.vapor_pressure != null) {
      // >0,1 mmHg alta volatilidade; escala log
      vol = clamp01((Math.log10(m.vapor_pressure + 1e-6) + 3) / 4); // ~ -3..1 log -> 0..1
    } else if (m.boiling_point_c != null) {
      vol = clamp01((300 - m.boiling_point_c) / 200); // 100 °C ->1 ; 300 °C ->0
    } else if (m.molecular_weight != null) {
      vol = clamp01((260 - m.molecular_weight) / 160); // 100 ->1 ; 260 ->0
    }
    // topo projeta mais; base quase nada (pesos calibráveis em accords.ts §5.1)
    const noteBoost = PROJECTION_NOTE_BOOST[r.note];
    const strength = strengthLevel(m) / 4; // 0.25..1
    const itemScore = vol * noteBoost * (0.5 + 0.5 * strength);
    scoreSum += itemScore * r.loudness;
    loudSum += r.loudness;
  }
  const norm = loudSum > 0 ? scoreSum / loudSum : 0;
  return Math.round(clamp01(norm) * 100);
}

/**
 * Longevidade em horas (Base §2.3 / §5.1). Dirigida pela camada de BASE:
 * materiais com alto boiling point, baixa vapor_pressure, alto MW e alta força
 * ancoram o perfume. Faixas de referência da Base §2.2: base "4 h a 12+ h".
 */
function computeLongevity(rows: { item: FormulaItem; note: NoteType; family: string | null; loudness: number }[]): number {
  // Longevidade base mínima (só topos/coração) ~ 2-3 h.
  let hours = 2.5;
  let baseAnchor = 0;
  let baseLoudTotal = 0;
  for (const r of rows) {
    if (r.note !== "base") continue;
    const m = r.item.material;
    // âncora por item: fixadores fortes chegam a ~12-24 h (Base §2.3 santalol/patchoulol).
    let anchor = 6; // base genérica
    if (m.boiling_point_c != null && m.boiling_point_c > 280) anchor = 14;
    else if (m.boiling_point_c != null && m.boiling_point_c > 260) anchor = 10;
    if (m.vapor_pressure != null && m.vapor_pressure < 0.0005) anchor = Math.max(anchor, 18);
    if (m.molecular_weight != null && m.molecular_weight > 230) anchor = Math.max(anchor, 15);
    // força amplifica a percepção de tenacidade
    anchor *= 0.7 + 0.3 * (strengthLevel(m) / 4);
    baseAnchor += anchor * r.loudness;
    baseLoudTotal += r.loudness;
  }
  if (baseLoudTotal > 0) {
    const avgAnchor = baseAnchor / baseLoudTotal;
    // peso da base no total perceptivo: mais base => mais perto do avgAnchor
    const totalLoud = rows.reduce((s, r) => s + r.loudness, 0) || 1;
    const baseShare = baseLoudTotal / totalLoud;
    hours = 2.5 + (avgAnchor - 2.5) * clamp01(0.4 + 0.6 * baseShare);
  }
  return Math.round(hours * 10) / 10;
}

/** Timeline de evaporação (Base §2.2): topo 0–30 min, coração 30 min–4 h, base 4 h+. */
function buildTimeline(pyramid: Prediction["pyramid"]): Prediction["timeline"] {
  const top3 = (arr: NoteHit[]) => arr.slice(0, 3).map((h) => h.material);
  return [
    {
      phase: "topo",
      label: "Abertura (impacto inicial)",
      fromMin: 0,
      toMin: 30,
      notes: top3(pyramid.topo).length ? top3(pyramid.topo) : ["(sem notas de topo — abertura fraca)"],
    },
    {
      phase: "coracao",
      label: "Coração (corpo / tema)",
      fromMin: 30,
      toMin: 240,
      notes: top3(pyramid.coracao).length ? top3(pyramid.coracao) : ["(sem notas de coração)"],
    },
    {
      phase: "base",
      label: "Fundo (fixação / rastro)",
      fromMin: 240,
      toMin: 720,
      notes: top3(pyramid.base).length ? top3(pyramid.base) : ["(sem notas de base — pouca fixação)"],
    },
  ];
}

/**
 * Detecção de acordes (Base §4.2). Para cada acorde de referência do dataset,
 * combina 3 sinais (pesos calibráveis em accords.ts):
 *  - COBERTURA: fração das famílias esperadas (ponderadas por proporção) presentes;
 *  - SEMELHANÇA: quão perto as proporções por família batem com o perfil da fórmula;
 *  - PIRÂMIDE: quanto das notas_expected (topo/coração/base) aparecem na camada
 *    certa da fórmula (casamento textual do token esperado contra os labels).
 * score 0-100 = W_COVERAGE·cobertura + W_SIMILARITY·semelhança + W_PYRAMID·pirâmide.
 */
/**
 * Agrega a loudness por família e aplica as REGRAS DE FAMÍLIA EMERGENTE
 * (accords.ts / Base §4.1): quando as famílias-gatilho coexistem, a família
 * emergente (ex.: fougère = lavanda+cumarina+oakmoss) absorve uma fração da
 * loudness das famílias-fonte co-presentes. Isso resolve o caso em que uma família
 * de-acorde (fougère) nunca vence por material isolado — ora perde por massa para
 * "aromatico", ora por potência para "chypre". Usado tanto na lista de famílias
 * quanto no perfil de detecção de acordes (mesma base perceptiva).
 */
function aggregateFamilyLoudness(
  items: { family: string | null; loudness: number }[]
): Map<string, number> {
  const famLoud = new Map<string, number>();
  for (const it of items) {
    const key = it.family ?? "desconhecida";
    famLoud.set(key, (famLoud.get(key) ?? 0) + it.loudness);
  }
  for (const rule of EMERGENT_FAMILY_RULES) {
    if (!rule.requires.every((f) => (famLoud.get(f) ?? 0) > 0)) continue;
    for (const a of rule.absorb) {
      const src = famLoud.get(a.from);
      if (src == null || src <= 0) continue;
      const move = src * a.share;
      famLoud.set(a.from, src - move);
      famLoud.set(rule.emergent, (famLoud.get(rule.emergent) ?? 0) + move);
    }
  }
  return famLoud;
}

function detectAccords(
  items: { family: string | null; loudness: number; note: NoteType; label: string }[]
): { name: string; score: number }[] {
  // perfil da fórmula: loudness por família (com famílias emergentes), normalizado
  const famLoud = aggregateFamilyLoudness(items);
  // remove a chave "desconhecida" do perfil de acordes (não casa família nenhuma)
  famLoud.delete("desconhecida");
  let total = 0;
  for (const v of famLoud.values()) total += v;
  if (total === 0) return [];
  const famFrac = new Map<string, number>();
  for (const [k, v] of famLoud) famFrac.set(k, v / total);

  // labels normalizados por camada (para o casamento de notes_expected).
  const labelsByNote: Record<NoteType, string> = { topo: "", coracao: "", base: "" };
  for (const it of items) labelsByNote[it.note] += " " + normStr(it.label);

  const results: { name: string; score: number }[] = [];
  for (const acc of ACCORDS) {
    // proporção esperada por família (agrega componentes da mesma família)
    const expected = new Map<string, number>();
    for (const c of acc.componentes) {
      expected.set(c.familia, (expected.get(c.familia) ?? 0) + c.proporcao);
    }
    let coverage = 0;
    let similarity = 0;
    for (const [fam, exp] of expected) {
      const got = famFrac.get(fam) ?? 0;
      if (got > 0) coverage += exp;
      similarity += exp * (1 - Math.min(1, Math.abs(exp - got) / Math.max(exp, 0.05)));
    }

    // pirâmide: fração das notas_expected que casam na camada certa.
    let pyrHit = 0;
    let pyrTotal = 0;
    for (const layer of ["topo", "coracao", "base"] as const) {
      const tokens = acc.notesExpected[layer];
      const hay = labelsByNote[layer];
      for (const tok of tokens) {
        pyrTotal++;
        // casa se QUALQUER palavra do token (>=3 letras) estiver na camada.
        const words = normStr(tok).split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
        if (words.some((w) => hay.includes(w))) pyrHit++;
      }
    }
    const pyramidScore = pyrTotal > 0 ? pyrHit / pyrTotal : 0;

    const score = Math.round(
      clamp01(ACCORD_W_COVERAGE * coverage + ACCORD_W_SIMILARITY * similarity + ACCORD_W_PYRAMID * pyramidScore) * 100
    );
    if (score > 0) results.push({ name: acc.nome, score });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

/** Avisos: dosagem, dominância, ausência de camadas (Base §6 e §3.4). */
function buildWarnings(
  rows: { item: FormulaItem; note: NoteType; family: string | null; loudness: number; massFrac: number }[],
  hits: { intensity: number; material: string }[],
  families: { name: string; weight: number }[]
): string[] {
  const w: string[] = [];

  // 1) material dominando demais: intensidade percebida >= 100 e >= 2x o segundo
  const sorted = [...hits].sort((a, b) => b.intensity - a.intensity);
  if (sorted.length >= 2 && sorted[0].intensity >= 90 && sorted[0].intensity >= 2 * (sorted[1].intensity || 1)) {
    w.push(`"${sorted[0].material}" domina a fórmula (muito acima das demais notas) — considere reduzir a dose.`);
  }

  // 2) dosagem em peso fora do razoável para materiais de ALTA força
  //    Base §6.1: materiais muito fortes (indol, damascone, rose oxide, aldeídos)
  //    devem ficar em traço; alertamos se um material "alta" força ultrapassa ~10%
  //    da massa efetiva.
  for (const r of rows) {
    if (r.item.material.odor_strength === "alta" && r.massFrac > 0.1) {
      w.push(
        `"${r.item.material.name}" é de força ALTA e está a ~${(r.massFrac * 100).toFixed(1)}% da massa — materiais potentes costumam entrar em traço (Base §6.1).`
      );
    }
  }

  // 3) camadas ausentes
  const notes = new Set(rows.map((r) => r.note));
  if (!notes.has("topo")) w.push("Sem notas de topo — abertura pode parecer chata/pesada (Base §4.1: topo = blenders frescos).");
  if (!notes.has("base")) w.push("Sem notas de base/fixadores — projeção some rápido e a longevidade cai (Base §5.2).");

  // 4) desequilíbrio grosseiro de família única
  if (families.length && families[0].weight >= 80 && families[0].name !== "desconhecida") {
    w.push(`Fórmula quase monotemática (~${families[0].weight}% "${families[0].name}") — pode faltar contraste/nuance.`);
  }

  return w;
}

/**
 * Avisos IFRA (Base §13 / blending-rules §8). Para cada material da fórmula:
 *  - ifra_limit_pct === 0  => PROIBIDO (Lyral/HICC, Lilial): aviso forte "não usar".
 *  - ifra_limit_pct > 0 e conc% > limite => WARNING de excesso, com a % calculada.
 *  - null => sem limite fixo catalogado: nenhum aviso.
 * conc% = (grams·dilução) / massa_total_da_fórmula · 100. LIMITAÇÃO: usamos o teto
 * genérico Cat 4 (leave-on) do dataset; a IFRA varia por categoria de produto.
 */
function buildIfraWarnings(formula: FormulaItem[], totalMass: number): string[] {
  const w: string[] = [];
  if (totalMass <= 0) return w;
  for (const f of formula) {
    const lim = f.material.ifra_limit_pct;
    if (lim == null) continue;
    const effMass = Math.max(0, f.grams) * (f.dilutionPct / 100);
    const concPct = (effMass / totalMass) * 100;
    if (lim === 0) {
      w.push(
        `⛔ "${f.material.name}" é PROIBIDO/banido pela IFRA (limite 0%) — NÃO USAR. ` +
          `Substitua por um material equivalente permitido (Base §13).`
      );
      continue;
    }
    if (concPct > lim) {
      w.push(
        `⚠️ "${f.material.name}" está a ~${concPct.toFixed(3)}% da fórmula, acima do teto IFRA de ${lim}% ` +
          `(Cat 4, leave-on) — reduza a dose ou a concentração de trabalho (Base §13).`
      );
    }
  }
  return w;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// ============================================================================
// suggestReverse — REVERSE (notas desejadas -> materiais sugeridos)
// ============================================================================

export interface ReverseTarget {
  family?: string;
  note?: string; // topo|coracao|base OU texto livre de nota (ex.: "base")
  description?: string;
  intensity: number; // 0-100 desejado
}

export interface ReverseItem {
  material: MaterialInput;
  suggestedPct: number; // % do CONCENTRADO (soma dos itens odorantes = 100)
  noteType: NoteType; // camada na pirâmide (topo/coração/base)
  role: "alvo" | "complemento"; // pedido pelo usuário vs. adicionado para equilibrar
  reason: string;
}

export interface ReverseSolvent {
  name: string; // diluente sugerido (ex.: "Álcool de perfumaria (etanol)")
  concentrationPct: number; // concentração do CONCENTRADO no produto final (ex.: 20 => EDT)
  note: string; // justificativa / faixa
}

export interface ReverseSuggestion {
  /** Itens ODORANTES do concentrado, com % somando ~100 (normalizado). */
  items: ReverseItem[];
  /** Balanço topo/coração/base do concentrado (% somam ~100). */
  pyramidBalance: { topo: number; coracao: number; base: number };
  /** Diluente + diluição inicial recomendada (o concentrado é dissolvido nele). */
  solvent: ReverseSolvent;
  notes: string[];
}

// Estrutura clássica de composição do CONCENTRADO (Base §4.1):
// Base ~55% + Coração ~20% + Topo ~25%. Usada para (a) preencher lacunas de camada
// e (b) normalizar os % sugeridos para uma receita balanceada.
const PYRAMID_TARGET: Record<NoteType, number> = { topo: 25, coracao: 20, base: 55 };

interface RawPick {
  material: MaterialInput;
  noteType: NoteType;
  role: "alvo" | "complemento";
  intensity: number; // 0-100 pedido/assumido (peso relativo dentro da camada)
  reasonHead: string; // início da justificativa
}

/**
 * REVERSE: (notas desejadas) -> uma RECEITA INICIAL mais completa e balanceada.
 *
 * Passos:
 *  1) Para cada alvo, escolhe o melhor material do catálogo (por família/nota/
 *     descrição), priorizando os compráveis no BR (min_price).
 *  2) COMPLETA lacunas de pirâmide: se faltar topo/coração/base, tenta puxar um
 *     material adequado do catálogo para preencher a camada (Base §4.1). Avisa
 *     tanto quando completa quanto quando NÃO acha candidato.
 *  3) NORMALIZA os % por CAMADA para a estrutura de referência 25/20/55 e distribui
 *     o peso de cada camada entre seus materiais ∝ intensidade-alvo / potência
 *     (invertendo Stevens: material forte precisa de menos %). Os % somam ~100 (é o
 *     concentrado).
 *  4) Sugere um DILUENTE (etanol de perfumaria) e a DILUIÇÃO inicial de trabalho
 *     (concentração do concentrado no produto final), à luz da intensidade média
 *     desejada.
 *
 * HONESTO: é um PONTO DE PARTIDA. Os % vêm de uma estrutura de referência + inversão
 * de Stevens, não de medição perceptual; ajuste no blotter (método Jean Carles, Base §4.1).
 */
export function suggestReverse(targets: ReverseTarget[], materials: MaterialInput[]): ReverseSuggestion {
  const notes: string[] = [];
  const picks: RawPick[] = [];
  const usedIds = new Set<number>();

  // ---- 1) picks por alvo ----
  for (const t of targets) {
    const wantFamily = t.family ? canonFamily(t.family) : null;
    const wantNote = normNoteType(t.note);
    const desc = t.description ? normStr(t.description) : null;

    const scored = materials
      .filter((m) => !usedIds.has(m.id))
      .map((m) => ({ m, score: matchScore(m, wantFamily, wantNote, desc) }))
      .filter((c) => c.score > 0)
      .sort(bestCandidate);

    if (scored.length === 0) {
      notes.push(
        `Nenhum material do catálogo casou com o alvo {${[t.family && `família=${t.family}`, t.note && `nota=${t.note}`, t.description && `desc=${t.description}`]
          .filter(Boolean)
          .join(", ")}}.`
      );
      continue;
    }

    const pick = scored[0].m;
    usedIds.add(pick.id);
    picks.push({
      material: pick,
      noteType: wantNote ?? classifyNote(pick),
      role: "alvo",
      intensity: clamp(t.intensity, 1, 100),
      reasonHead: `Casa com alvo (${describeTarget(t)})`,
    });
  }

  // ---- 2) completa lacunas de pirâmide (Base §4.1) ----
  const haveNote = (n: NoteType) => picks.some((p) => p.noteType === n);
  const fillHints: Record<NoteType, string> = {
    topo: "abertura fresca (cítrico/aromático leve)",
    coracao: "corpo do tema (floral/especiado)",
    base: "âncora/fixador (amadeirado/âmbar/almíscar)",
  };
  for (const layer of ["base", "coracao", "topo"] as const) {
    if (haveNote(layer) || picks.length === 0) continue;
    const cand = materials
      .filter((m) => !usedIds.has(m.id) && !isSolvent(m) && classifyNote(m) === layer)
      .map((m) => ({ m, score: 1 + (m.min_price != null ? 1 : 0) }))
      .sort(bestCandidate);
    if (cand.length > 0) {
      const m = cand[0].m;
      usedIds.add(m.id);
      picks.push({
        material: m,
        noteType: layer,
        role: "complemento",
        intensity: 45, // presença moderada só para não deixar a camada vazia
        reasonHead: `Complemento de ${layer.toUpperCase()} para equilibrar a pirâmide (${fillHints[layer]})`,
      });
      notes.push(`Camada de ${layer.toUpperCase()} estava ausente — adicionei "${m.name}" como ${fillHints[layer]} (Base §4.1).`);
    } else {
      notes.push(`Faltou ${layer.toUpperCase()} e não há candidato no catálogo — adicione manualmente um ${fillHints[layer]} (Base §4.1/§5.2).`);
    }
  }

  // ---- 3) normaliza % por camada -> estrutura 25/20/55, distribuindo por potência ----
  // Peso "cru" de cada item dentro da camada (invertendo Stevens): para uma dada
  // intensidade-alvo, material mais POTENTE => menos %. rawShare ∝ (intensidade)^(1/a) / potência.
  const rawByLayer: Record<NoteType, number> = { topo: 0, coracao: 0, base: 0 };
  const rawShares = new Map<number, number>();
  for (const p of picks) {
    const a = stevensExponent(canonFamily(p.material.odor_family ?? "") ?? classifyFamily(p.material));
    const pot = potencyWeight(p.material);
    const raw = Math.pow(clamp01(p.intensity / 100), 1 / a) / pot;
    rawShares.set(p.material.id, raw);
    rawByLayer[p.noteType] += raw;
  }
  // Camadas realmente presentes recebem os pontos-alvo (renormalizados entre si).
  const presentLayers = (["topo", "coracao", "base"] as const).filter((n) => rawByLayer[n] > 0);
  const targetSum = presentLayers.reduce((s, n) => s + PYRAMID_TARGET[n], 0) || 1;

  const items: ReverseItem[] = picks.map((p) => {
    const layerBudget = (PYRAMID_TARGET[p.noteType] / targetSum) * 100; // % que a camada leva do total
    const within = rawByLayer[p.noteType] > 0 ? (rawShares.get(p.material.id) ?? 0) / rawByLayer[p.noteType] : 0;
    let pct = layerBudget * within;
    pct = Math.round(pct * 100) / 100;
    const famTxt = canonFamily(p.material.odor_family ?? "") ?? classifyFamily(p.material) ?? "?";
    const strengthTxt = p.material.odor_strength ?? "média (assumida)";
    const priceTxt = p.material.min_price != null ? `comprável no BR (a partir de R$${p.material.min_price.toFixed(2)})` : "sem oferta BR registrada";
    return {
      material: p.material,
      suggestedPct: pct,
      noteType: p.noteType,
      role: p.role,
      reason:
        `${p.reasonHead}: família≈${famTxt}, nota=${p.noteType}, força=${strengthTxt}. ` +
        `% dentro da camada ${p.noteType} (alvo ${PYRAMID_TARGET[p.noteType]}% da estrutura) ajustado por potência ` +
        `(mais forte => menos %). ${priceTxt}.`,
    };
  });

  // arredondamento: garante soma ~100 jogando o resíduo no maior item (se houver).
  const sumPct = items.reduce((s, it) => s + it.suggestedPct, 0);
  if (items.length > 0 && sumPct > 0) {
    const residual = Math.round((100 - sumPct) * 100) / 100;
    const biggest = items.reduce((a, b) => (b.suggestedPct > a.suggestedPct ? b : a));
    biggest.suggestedPct = Math.round((biggest.suggestedPct + residual) * 100) / 100;
  }

  const pyramidBalance = {
    topo: round1(items.filter((i) => i.noteType === "topo").reduce((s, i) => s + i.suggestedPct, 0)),
    coracao: round1(items.filter((i) => i.noteType === "coracao").reduce((s, i) => s + i.suggestedPct, 0)),
    base: round1(items.filter((i) => i.noteType === "base").reduce((s, i) => s + i.suggestedPct, 0)),
  };

  // ---- 4) diluente + diluição inicial (Base §6.1 / §5.1) ----
  const avgIntensity = picks.length > 0 ? picks.reduce((s, p) => s + p.intensity, 0) / picks.length : 50;
  // Intensidade desejada -> concentração do concentrado no produto final (faixas de
  // mercado: EDT ~10-20%, EDP ~15-25%, parfum ~20-40% — Base §6.1). Ancoramos entre
  // 15% e 30% conforme a intensidade média pedida.
  const concentrationPct = Math.round(15 + (30 - 15) * clamp01(avgIntensity / 100));
  const solvent: ReverseSolvent = {
    name: "Álcool de perfumaria (etanol ~96%; DPG para roll-on/óleo)",
    concentrationPct,
    note:
      `Dissolva o concentrado a ~${concentrationPct}% no álcool (o restante é diluente). ` +
      `Faixa de referência: EDT ~10-20%, EDP ~15-25%, parfum ~20-40% (Base §6.1). ` +
      `Deixe macerar ~2-4 semanas antes de avaliar (Base §6.1).`,
  };
  if (picks.length > 0) {
    notes.push(`Estrutura-alvo do concentrado: Topo ~25% / Coração ~20% / Base ~55% (Base §4.1). Balanço obtido: topo ${pyramidBalance.topo}% / coração ${pyramidBalance.coracao}% / base ${pyramidBalance.base}%.`);
    notes.push("Ponto de PARTIDA: ajuste as razões no blotter (método Jean Carles 9:1..5:5, Base §4.1); os % vêm de estrutura de referência + inversão de Stevens, não de medição perceptual.");
  }

  return { items, pyramidBalance, solvent, notes };
}

/** Ordena candidatos: maior score; empate -> comprável no BR; depois mais barato. */
function bestCandidate(a: { m: MaterialInput; score: number }, b: { m: MaterialInput; score: number }): number {
  if (b.score !== a.score) return b.score - a.score;
  const ap = a.m.min_price != null ? 0 : 1;
  const bp = b.m.min_price != null ? 0 : 1;
  if (ap !== bp) return ap - bp;
  return (a.m.min_price ?? Infinity) - (b.m.min_price ?? Infinity);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function describeTarget(t: ReverseTarget): string {
  return [t.family && `família ${t.family}`, t.note && `nota ${t.note}`, t.description && `"${t.description}"`, `intensidade ${t.intensity}`]
    .filter(Boolean)
    .join(", ");
}

function canonFamily(raw: string): string | null {
  return mapToCanonFamily(raw);
}

function normNoteType(note?: string): NoteType | null {
  if (!note) return null;
  const n = normStr(note);
  if (n.includes("topo") || n.includes("top")) return "topo";
  if (n.includes("coracao") || n.includes("heart") || n.includes("cora")) return "coracao";
  if (n.includes("base") || n.includes("fund") || n.includes("fixad")) return "base";
  return null;
}

/** Pontua quão bem um material casa com um alvo. */
function matchScore(m: MaterialInput, wantFamily: string | null, wantNote: NoteType | null, desc: string | null): number {
  let score = 0;
  const matFamily = canonFamily(m.odor_family ?? "") ?? classifyFamily(m);

  if (wantFamily) {
    if (matFamily === wantFamily) score += 60;
    else return 0; // família é requisito duro quando pedida
  }
  if (wantNote) {
    if (classifyNote(m) === wantNote) score += 25;
    else if (wantFamily) score += 5; // penaliza pouco se família bate mas nota não
    else return 0; // nota é requisito duro quando é o único critério
  }
  if (desc) {
    const hay = normStr([m.odor_family ?? "", m.odor_description ?? "", m.name].join(" "));
    // conta tokens do desc presentes
    const toks = desc.split(/\s+/).filter((t) => t.length > 2);
    let hitTok = 0;
    for (const t of toks) if (hay.includes(t)) hitTok++;
    if (toks.length) score += Math.round((hitTok / toks.length) * 30);
  }
  // pequeno bônus para materiais com dados físicos (classificação mais confiável)
  if (m.boiling_point_c != null || m.vapor_pressure != null || m.molecular_weight != null) score += 3;
  return score;
}
