/**
 * accords.ts — Dados de referência para o motor heurístico olfativo.
 *
 * Extraído de knowledge/base_conhecimento_perfumaria.md, knowledge/data/blending-rules.md
 * e dos datasets de pesquisa (knowledge/data/accords.json, essential-oils.json,
 * aroma-chemicals.json). Todas as constantes citam a seção/fonte. TS puro; ESM.
 *
 * Os ACORDES são carregados de ./data/accords.json (31 acordes) e normalizados para
 * a interface `Accord` (proporções -> frações somando 1; famílias mapeadas para o
 * conjunto canônico do motor). Os componentes casam por FAMÍLIA, não pelo material
 * exato (o catálogo BR raramente terá o material idêntico).
 *
 * ============================================================================
 * CONSTANTES CALIBRADAS (ver web/scripts/calibrate.ts)
 * ============================================================================
 * A calibração roda cada acorde do dataset como uma fórmula sintética
 * (1 MaterialInput por componente, com força/nota/volatilidade típicas da família)
 * e mede a taxa de acerto da FAMÍLIA DOMINANTE prevista vs. a família declarada do
 * acorde. Os valores abaixo foram ajustados para MAXIMIZAR essa taxa sem quebrar
 * casos óbvios. LIMITAÇÃO: isto é um sanity check estrutural contra receitas de
 * referência — NÃO é validação clínica/perceptual. É heurística.
 *
 * Valores finais e justificativa estão anotados em cada constante.
 */

import accordsData from "./data/accords.json";

// ============================================================================
// POTÊNCIA ODORÍFERA -> PESO PERCEBIDO (proxy inverso de ODT / OAV)
// ============================================================================
// Base §3.1-§3.4 / blending-rules §3: a DOMINÂNCIA é governada por
// "força odorífera × dose", NÃO pela dose sozinha. A métrica física é o
// OAV (Odor Activity Value) = concentração / ODT; a intensidade percebida
// contribui ao cheiro só quando OAV ≥ 1 e materiais de ODT baixo (indol,
// escatol, aldeídos, Calone, damasconas) atingem OAV ≫ 1 EM TRAÇO e dominam
// muito além da fração em peso (Base §3.1 tabela de ODT / blending-rules §3).
//
// MODELO (novo — corrige "trace-dominant"):
//   perceived_i = effConc_i^stevens · POTENCY_WEIGHT[força_i] · ULTRA_BOOST_i
// A potência entra como FATOR MULTIPLICATIVO SEPARADO (proxy de 1/ODT), fora da
// compressão de Stevens — antes ela estava embutida DENTRO da base da potência de
// Stevens (eff = massa·força)^a, o que a comprimia junto com a massa e deixava a
// massa dominar. Agora um traço potente ganha um multiplicador grande que a massa
// de um material fraco não alcança.
//
// RANGE AMPLO (calibrado, ver scripts/calibrate.ts): a diferença de ODT entre
// classes é de VÁRIAS ORDENS DE GRANDEZA (vanilina útil a ~1%, civeta a ~0,1%,
// aldeídos/Calone em traço a ~0,05-0,5%, cadaverina a ~0,01% — blending-rules §3).
// Um range 1/2/5 (antigo) não reflete isso. VALORES FINAIS CALIBRADOS: 1 / 4 / 15.
//   baixa ≈ 1   (materiais "moles": Hedione, Iso E em papel de volume, muscs suaves)
//   média ≈ 4   (a maioria dos aromáticos de trabalho a 10%)
//   alta  ≈ 15  (oakmoss, damasconas, especiarias fenólicas, ozônicos, aldeídos)
// Spread de 15× entre baixa e alta (× ULTRA_POTENT_BOOST=2 => ~30× efetivo para os
// materiais nomeadamente ultra-potentes: Calone etc.).
//
// POR QUE 15 E NÃO 30 NO NÍVEL "alta" GENÉRICO: a varredura (scripts/calibrate.ts)
// mostra que 30× para QUALQUER material de força "alta" faz um acento MENOR mas
// potente (o "sweet body" gourmand do acorde Coumarin/Hay, ou o oakmoss de
// single-digit-% de um Fougère) DOMINAR indevidamente o tema — o mesmo mecanismo
// de trace-dominance, agora invertido. Reservar o topo do range (≥30) aos
// materiais de ODT comprovadamente extremo, via ULTRA_POTENT_BOOST aplicado a nomes
// conhecidos, é mais fiel à ciência (só um punhado de materiais tem ODT tão baixo)
// e mantém 31/31 na calibração. odor_strength="alta" é um balde grosso de 3 níveis;
// não separa "forte" de "brutalmente potente" — por isso o boost é por NOME.
// Fonte: blending-rules §3 (OAV = conc/ODT; dose ∝ 1/força); Base §3.1/§3.4.
export const POTENCY_WEIGHT: Record<"baixa" | "média" | "alta", number> = {
  baixa: 1,
  média: 4,
  alta: 15,
};
// Fallback quando odor_strength é null (assume média).
export const POTENCY_WEIGHT_DEFAULT = POTENCY_WEIGHT["média"];

// Nomes retrocompatíveis (o motor consome estes símbolos).
export const STRENGTH_MULTIPLIER = POTENCY_WEIGHT;
export const STRENGTH_MULTIPLIER_DEFAULT = POTENCY_WEIGHT_DEFAULT;

// ============================================================================
// MATERIAIS ULTRA-POTENTES conhecidos -> BOOST EXTRA (ODT extremamente baixo)
// ============================================================================
// Base §3.1 / blending-rules §3/§4: um punhado de materiais tem ODT tão baixo
// (OAV ≫ 1 a frações de 0,1-1%) que DEFINEM o caráter mesmo invisíveis à massa.
// A odor_strength="alta" já os cobre em parte, mas ela é um balde de 3 níveis e não
// separa "forte" de "brutalmente potente". Damos um multiplicador EXTRA (sobre o
// POTENCY_WEIGHT) a materiais reconhecidos por nome/descritor. Justificativa
// individual (ODT ou faixa de uso das fontes):
//   - Calone 1951: ozônico/marinho, uso 0,2-0,8% de trabalho, teto ≤0,8% (blending §3);
//     é o exemplo canônico do problema "traço define o aquático".
//   - cis-3-hexenal / folhas verdes: ODT sub-ppb, uso em traço.
//   - β-Damascenona / damasconas: ODT ~0,002 ppb — dos mais potentes (Base §3.1).
//   - Aldeídos alifáticos C-8..C-12: uso 0,01-0,1% p/ brilho, overdose ~0,3% (blending §3).
//   - Rose oxide: limiar muito baixo, verde-metálico penetrante.
//   - IBQ / isobutyl quinoline: assinatura de couro, uso em traço (<0,5%).
//   - Ambrox/Ambroxan em alta difusão: incomum por ser difusivo E substantivo (blending §6).
//   - Indol / escatol: viram floral em <0,1% mas OAV alto (Base §3.2).
// O valor 2 (multiplica o peso "alta"=15 => ~30 efetivo) foi suficiente, junto ao
// range 1/4/15, para Calone dominar o aquático de Marine SEM que o boost aplicado a
// aldeídos/indol desestabilize outros acordes (Jasmine, Fruity). É o menor boost
// que mantém 31/31 na calibração.
export const ULTRA_POTENT_BOOST = 2;

// Casado por SUBSTRING no nome + descritor do material (normalizado sem acento).
export const ULTRA_POTENT_KEYWORDS: string[] = [
  "calone",
  "cis-3-hexenal",
  "hexenal",
  "damascen", // damascone / damascenone
  "damascona",
  "rose oxide",
  "oxido de rosa",
  "isobutyl quinoline",
  "isobutil quinolina",
  "ibq",
  "quinolin",
  "ambrox",
  "ambroxan",
  "cetalox",
  "indol",
  "escatol",
  "skatole",
  // aldeídos alifáticos de brilho (C-8..C-12) — casados por NOME DE COMPOSTO real
  // (não "aldehyde C-x", que capturaria γ-undecalactona = "aldehyde C-14", uma
  // lactona, NÃO um aldeído). Uso 0,01-0,1%, overdose ~0,3% (blending-rules §3).
  "octanal",
  "nonanal",
  "decanal",
  "undecanal",
  "dodecanal",
  "methylnonylacetaldehyde",
  "lauric aldehyde",
  "aldeido c-12 mna",
  "aldehyde c-12 mna",
];

// ============================================================================
// EXPOENTES DE STEVENS (lei de potência psicofísica) — Base §3.3
// ============================================================================
// ψ = k · I^a, com a<1 (compressivo) para olfato. Faixa geral 0,2–0,7
// (Springer BF03212789); valor canônico do olfato (heptano) = 0,6; acetato de
// amila 0,39–0,57 (Engen 1963).
//
// CALIBRADO: default 0,5 (valor canônico do olfato, Base §3.3).
export const STEVENS_EXPONENT_DEFAULT = 0.5;

// Expoentes por classe olfativa quando a base/dataset dá pista.
// Aldeídos: PLE = 0,36 + 0,33·exp(−0,3·n) — curtos ≈0,69, longos ≈0,36 (Base §3.3,
// PMC3355402).
//
// SIMPLIFICADO após separar POTÊNCIA da massa: como a assinatura de traço agora é
// carregada por POTENCY_WEIGHT (fator multiplicativo separado) e não mais por
// expoentes de Stevens inflados, os expoentes voltam a valores psicofísicos
// plausíveis (0,45-0,62) em vez de servirem de "gambiarra de potência". Mantidos:
//  - aldeidico 0,62: aldeídos curtos têm expoente maior (Base §3.3).
//  - woody/amber/musk 0,45: fixadores de base — resposta mais compressiva.
//  - default 0,5 para o resto. (A varredura confirmou que, com o POTENCY_WEIGHT
//    amplo, o acerto de família NÃO depende mais de expoentes por classe
//    ajustados a dedo; ver scripts/calibrate.ts.)
export const STEVENS_EXPONENT_BY_CLASS: Record<string, number> = {
  aldeidico: 0.62,
  amber: 0.45,
  woody: 0.45,
  musk: 0.45,
};

// Fator de desconto sub-aditivo para MISTURAS (Base §3.4 nota 3 e §8 caveat 4):
// "a soma das loudness individuais SUPERESTIMA a mistura". Aplicado à intensidade
// somada de cada camada (topo/coração/base) na normalização.
export const MIXTURE_SUBADDITIVE_FACTOR = 0.75;

// ============================================================================
// FAMÍLIAS EMERGENTES (acordes compostos) — Base §4.1
// ============================================================================
// Algumas famílias são EMERGENTES: não vêm de uma família dominante única, mas de
// uma COMBINAÇÃO reconhecível de facetas (o acorde faz a família, não o material
// isolado). O caso canônico é o FOUGÈRE ("fern"): lavanda (aromático) + cumarina
// (feno/tonka) + oakmoss (musgo) + bergamota. Quando lavanda e cumarina coexistem,
// o musgo lê-se como a BASE MUSGOSA do fougère — não como um chypre autônomo — e a
// lavanda como o CORAÇÃO AROMÁTICO do fougère. Sem isso, o motor (que pontua por
// família individual) sempre elege "aromatico" (por massa) ou "chypre" (por potência
// do oakmoss) e nunca "fougere", que é intrinsecamente uma família-de-acorde.
//
// Modelo: se as famílias-gatilho coexistem na fórmula, a família emergente ABSORVE
// uma fração da loudness das famílias-fonte co-presentes. Frações calibradas
// (scripts/calibrate.ts) para 31/31 sem regredir os demais acordes.
// Fonte: Base §4.1 (estrutura clássica de composição / fougère).
export interface EmergentFamilyRule {
  emergent: string; // família resultante
  requires: string[]; // TODAS estas famílias precisam estar presentes p/ disparar
  absorb: { from: string; share: number }[]; // move `share` da loudness de `from` -> emergent
}
export const EMERGENT_FAMILY_RULES: EmergentFamilyRule[] = [
  {
    emergent: "fougere",
    requires: ["fougere", "aromatico"], // cumarina/feno + lavanda/aromático
    absorb: [
      { from: "aromatico", share: 0.5 }, // metade da lavanda vira coração do fougère
      { from: "chypre", share: 0.5 }, // metade do oakmoss vira base musgosa do fougère
    ],
  },
];

// ============================================================================
// CORTES DE VOLATILIDADE (topo/coração/base) — Base §2.1
// ============================================================================
// Sistema primário peer-reviewed é CS de Poucher (15/60), mas o schema não traz
// CS; usamos boiling_point_c e molecular_weight como heurística secundária
// (Base §8 caveat 1: tratar MW/Torr como secundário).
export const BOILING_POINT_TOPO_MAX_C = 200; // <200 => topo
export const BOILING_POINT_BASE_MIN_C = 260; // >260 => base ; 200–260 => coração
export const MW_TOPO_MAX = 160; // Base §2.1 regra prática MW<160 topo
export const MW_CORACAO_MAX = 220; // 160–220 coração ; >220 base
// Pressão de vapor (mmHg/Torr @25 °C) — Base §2.1: >0,1 topo; 0,001–0,1 coração; <0,001 base
export const VAPOR_PRESSURE_TOPO_MIN = 0.1;
export const VAPOR_PRESSURE_BASE_MAX = 0.001;

// ============================================================================
// PESOS DE PROJEÇÃO (Base §5.1 / blending-rules §6) — calibráveis
// ============================================================================
// Sillage/projeção é dirigida por topo/coração voláteis + materiais difusivos.
// noteBoost: quanto cada camada contribui para a projeção percebida.
export const PROJECTION_NOTE_BOOST: Record<"topo" | "coracao" | "base", number> = {
  topo: 1,
  coracao: 0.55,
  base: 0.15,
};

// ============================================================================
// DETECÇÃO DE ACORDES (Base §4.2) — pesos calibráveis
// ============================================================================
// score = W_COVERAGE·cobertura + W_SIMILARITY·semelhança_de_perfil + W_PYRAMID·casamento_da_pirâmide
// (soma dos pesos = 1). cobertura = fração das famílias esperadas presentes;
// semelhança = quão perto as proporções batem; pirâmide = quanto das notas_expected
// (topo/coração/base) aparecem na camada certa.
export const ACCORD_W_COVERAGE = 0.45;
export const ACCORD_W_SIMILARITY = 0.3;
export const ACCORD_W_PYRAMID = 0.25;

// ============================================================================
// MAPA FAMÍLIA CANÔNICA -> DESCRITORES — Base §1 (Edwards + SFP) e §7
// ============================================================================
// Chaves normalizadas; valores são palavras-chave usadas para casar odor_family /
// odor_description livres do catálogo com uma família canônica.
export const FAMILY_DESCRIPTORS: Record<string, string[]> = {
  // Aldeídos alifáticos (C-8..C-14): família olfativa própria (Chanel Nº5), ODT baixo
  // e caráter ceroso-sabão-cítrico (Base §3.1/§3.3). Vem PRIMEIRO para que um material
  // nomeado "Aldehyde C-x" case como aldeídico antes de cair num descritor de faceta
  // (violet-waxy -> floral, citrus-peel -> citrus) que descreve só a nuance.
  // NB: casamos por NOME DE COMPOSTO real do aldeído alifático, não por "aldehyde
  // C-x" genérico — γ-undecalactona é historicamente (e enganosamente) chamada
  // "aldehyde C-14" mas é uma LACTONA (frutado), não um aldeído. Os padrões abaixo
  // pegam os C-8..C-12 verdadeiros sem capturar lactonas.
  aldeidico: ["aldehydic", "aldeidic", "aldeídic", "aldeido alifat", "aldehyde alif", "decanal", "undecanal", "dodecanal", "octanal", "nonanal", "methylnonylacetaldehyde", "lauric aldehyde", "aldeido c-12 mna", "aldehyde c-12 mna"],
  citrus: ["cítric", "citrus", "hespérid", "hesperid", "bergamota", "bergamot", "limão", "limao", "lemon", "laranja", "orange", "lima", "lime", "tangerina", "grapefruit", "toranja", "zesty", "petitgrain"],
  floral: ["floral", "flor", "jasmim", "jasmine", "rosa", "rose", "rosy", "violeta", "violet", "ionone", "ionona", "lírio", "lirio", "ylang", "gardênia", "gardenia", "tuberosa", "tuberose", "muguet", "lily", "peonia", "peônia", "neroli", "geranio", "gerânio", "geranium", "iris", "orris", "irone", "heliotrop", "narcotic floral"],
  aromatico: ["aromátic", "aromatic", "herbal", "herbáce", "herbace", "lavanda", "lavender", "alecrim", "rosemary", "manjericão", "manjericao", "sálvia", "salvia", "sage", "tomilho", "thyme", "hortelã", "hortela", "menta", "mint", "eucalipto", "eucalyptus", "camphor", "canfor"],
  verde: ["verde", "green", "galbanum", "galbano", "grama", "gramineo", "gramíneo", "folha", "leaf", "hexenol", "chá verde", "cha verde", "dewy", "sap"],
  frutado: ["frutad", "fruity", "fruit", "pêssego", "pessego", "peach", "maçã", "maca", "apple", "ameixa", "plum", "framboesa", "raspberry", "berry", "damasco", "apricot", "lichia", "melão", "melao", "pêra", "pera", "pear", "morango", "coco", "lactôn", "lacton", "lactone"],
  aquatico: ["marinho", "marine", "aquátic", "aquatic", "aquático", "ozôni", "ozoni", "ozônic", "ozonic", "calone", "melancia", "watery", "helional"],
  woody: ["amadeirad", "woody", "wood", "madeira", "cedro", "cedar", "cedarwood", "sândalo", "sandalo", "sandal", "sandalwood", "vetiver", "patchouli", "guaiac", "guaiacwood", "iso e", "javanol", "ebanol", "cashmeran"],
  amber: ["âmbar", "ambar", "amber", "oriental", "resina", "resinous", "labdanum", "labdano", "cisto", "benzoin", "ambrox", "ambroxan", "cetalox", "olíban", "oliban", "olibano", "incenso", "incense", "frankincense", "mirra", "myrrh", "styrax", "balsâmic", "balsamic", "balsam", "bálsamo", "balsamo", "peru"],
  chypre: ["chypre", "chipre", "oakmoss", "musgo", "moss", "mossy", "musgos", "chão de floresta", "chao de floresta"],
  fougere: ["fougère", "fougere", "cumarina", "coumarin", "feno", "hay", "tonka"],
  leather: ["couro", "leather", "suede", "bétula", "betula", "birch", "alcatrão", "alcatrao", "tar", "fumaça", "fumaca", "smok", "esfumaçad", "esfumacad", "castóreo", "castoreo", "castoreum", "ibq", "quinolin"],
  musk: ["almíscar", "almiscar", "musk", "musco", "galaxolide", "hhcb", "muscone", "muscona", "habanolide", "exaltolide", "ambrettolide", "ambretolida", "ethylene brassylate", "brassilato", "linho"],
  gourmand: ["gourmand", "baunilha", "vanil", "vanilina", "vanillin", "vanilla", "caramelo", "caramel", "maltol", "doce", "sweet", "mel", "honey", "chocolate", "amêndoa", "amendoa", "almond", "cherry", "algodão-doce", "algodao-doce", "coumarin sweet"],
  especiado: ["especiad", "spicy", "spice", "cravo", "clove", "eugenol", "canela", "cinnam", "cinam", "carnation", "pimenta", "pepper", "noz-moscada", "noz moscada", "nutmeg", "cardamomo", "cardamom", "tabaco", "tobacco"],
  animalico: ["animálic", "animalic", "indol", "indole", "civet", "civeta", "castóre", "castore", "skatole", "escatol", "fecal"],
};

// Alias: rótulos livres de odor_family (catálogo + datasets) -> família canônica.
// Inclui os rótulos hifenizados do accords.json / essential-oils.json.
export const FAMILY_ALIASES: Record<string, string> = {
  "citrus": "citrus",
  "cítrico": "citrus",
  "hespéride": "citrus",
  "citrus-aromatic": "citrus",
  "citrus-herbal": "citrus",
  "floral": "floral",
  "rosado": "floral",
  "floral-white": "floral",
  "floral-rosy": "floral",
  "floral-green": "floral",
  "floral-powdery": "floral",
  "floral-citrus": "floral",
  "aldehydic-floral": "aldeidico",
  "aldehydic": "aldeidico",
  "aldeídico": "aldeidico",
  "aromatic": "aromatico",
  "aromático": "aromatico",
  "aromatic-herbal": "aromatico",
  "herbal": "aromatico",
  "minty": "aromatico",
  "camphoraceous": "aromatico",
  "green": "verde",
  "verde": "verde",
  "fruity": "frutado",
  "frutado": "frutado",
  "marinho": "aquatico",
  "aquático": "aquatico",
  "aquatic": "aquatico",
  "marine-aquatic": "aquatico",
  "woody": "woody",
  "amadeirado": "woody",
  "wood": "woody",
  "woody-cedar": "woody",
  "woody-sandal": "woody",
  "woody-earthy": "woody",
  "woody-coniferous": "woody",
  "amber": "amber",
  "oriental": "amber",
  "âmbar": "amber",
  "amber-oriental": "amber",
  "amber-woody": "amber",
  "balsamic": "amber",
  "resinous": "amber",
  "resinous-balsamic": "amber",
  "chypre": "chypre",
  "chypre-mossy": "chypre",
  "fougère": "fougere",
  "aromatic-fougere": "fougere",
  "aromatic-gourmand": "fougere",
  "leather": "leather",
  "couro": "leather",
  "musk": "musk",
  "almíscar": "musk",
  "gourmand": "gourmand",
  "baunilha": "gourmand",
  "gourmand-oriental": "gourmand",
  "powdery-gourmand": "gourmand",
  "spicy": "especiado",
  "spicy-aromatic": "especiado",
  "especiado": "especiado",
  "tobacco": "especiado",
  "animálico": "animalico",
  "animalic": "animalico",
};

/** Normaliza string (minúsculas, sem acento). Duplicado aqui p/ uso no mapa. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Mapeia um rótulo de família livre (accords.json / essential-oils.json /
 * catálogo) para a família canônica do motor. Tenta: alias exato -> alias por
 * substring -> descritores. Devolve null se nada casar.
 */
export function mapToCanonFamily(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const n = norm(raw);
  // alias exato
  for (const [alias, canon] of Object.entries(FAMILY_ALIASES)) {
    if (norm(alias) === n) return canon;
  }
  // alias por substring (o mais longo primeiro para desambiguar)
  const aliasByLen = Object.entries(FAMILY_ALIASES).sort((a, b) => b[0].length - a[0].length);
  for (const [alias, canon] of aliasByLen) {
    if (n.includes(norm(alias))) return canon;
  }
  // descritores
  for (const [fam, kws] of Object.entries(FAMILY_DESCRIPTORS)) {
    for (const kw of kws) if (n.includes(norm(kw))) return fam;
  }
  return null;
}

// ============================================================================
// ACORDES — carregados de ./data/accords.json e normalizados
// ============================================================================
export type NoteType = "topo" | "coracao" | "base";

export interface AccordComponent {
  papel: string; // rótulo do papel/nota na receita (role do dataset)
  material: string; // material de referência do dataset
  familia: string; // família canônica esperada para casar
  proporcao: number; // fração normalizada (0..1)
}
export interface Accord {
  nome: string;
  familia: string; // família dominante canônica do acorde
  familiaRaw: string; // rótulo original do dataset (ex.: "aromatic-fougere")
  componentes: AccordComponent[];
  notesExpected: { topo: string[]; coracao: string[]; base: string[] };
  descricao: string;
  fonte: string;
}

// Tipagem parcial do JSON de acordes.
interface RawAccordComponent {
  role: string;
  material: string;
  proportion: number;
  dilution?: string;
  note?: string;
}
interface RawAccord {
  name: string;
  family: string;
  confidence?: string;
  description?: string;
  character?: string;
  components: RawAccordComponent[];
  notes_expected?: { topo?: string[]; coracao?: string[]; base?: string[] };
}
interface RawAccordsFile {
  _meta?: unknown;
  accords: RawAccord[];
}

/**
 * Deriva a família canônica de um componente. Prioriza o NOME do material (mais
 * específico), depois o ROLE, depois a família dominante do acorde como fallback.
 */
function componentFamily(comp: RawAccordComponent, accordCanon: string): string {
  return (
    mapToCanonFamily(comp.material) ??
    mapToCanonFamily(comp.role) ??
    accordCanon
  );
}

function buildAccords(): Accord[] {
  const file = accordsData as unknown as RawAccordsFile;
  return file.accords.map((raw) => {
    const familiaCanon = mapToCanonFamily(raw.family) ?? "desconhecida";
    const total = raw.components.reduce((s, c) => s + (c.proportion || 0), 0) || 1;
    const componentes: AccordComponent[] = raw.components.map((c) => ({
      papel: c.role,
      material: c.material,
      familia: componentFamily(c, familiaCanon),
      proporcao: (c.proportion || 0) / total,
    }));
    return {
      nome: raw.name,
      familia: familiaCanon,
      familiaRaw: raw.family,
      componentes,
      notesExpected: {
        topo: raw.notes_expected?.topo ?? [],
        coracao: raw.notes_expected?.coracao ?? [],
        base: raw.notes_expected?.base ?? [],
      },
      descricao: raw.description ?? "",
      fonte: `accords.json (${raw.confidence ?? "approx"})`,
    };
  });
}

export const ACCORDS: Accord[] = buildAccords();
