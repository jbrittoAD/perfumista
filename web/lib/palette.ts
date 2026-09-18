/**
 * palette.ts — Monta uma paleta de N frascos a partir de cotas por família.
 *
 * O PROBLEMA QUE ISTO RESOLVE: "quero 25 cítricos" não é o mesmo que "quero os
 * 25 cítricos mais baratos". Pegar por preço traz cinco limões quase idênticos e
 * nenhum petitgrain; pegar pela ordem do baralho traz o balde inteiro de limão,
 * porque é justamente assim que o baralho é ordenado. Uma paleta de estudo tem
 * que COBRIR a família, não repeti-la.
 *
 * Por isso a escolha é gulosa com penalidade de semelhança: a cada frasco
 * escolhido, os candidatos parecidos com ele perdem pontos. O efeito prático é
 * que a seleção caminha pelas facetas da família em vez de empilhar variações do
 * mesmo cheiro.
 *
 * Função pura, sem React e sem estado — dá para testar com um array na mão.
 */

import { CARDS, cardsOfFamily, type FamilySlug, type Ingredient } from "./deck";

export interface PaletteOptions {
  /** Quantos frascos por família. Família ausente = zero. */
  quotas: Partial<Record<FamilySlug, number>>;
  /** Incluir as "obreiras" que arredondam qualquer fórmula. */
  includeWorkhorses?: boolean;
  /** Incluir diluentes (DPG, IPM…). */
  includeSolvents?: boolean;
  /** Preferir molécula isolada a base pronta (paleta de estudo). */
  preferIsolates?: boolean;
  /**
   * Teto de R$ por frasco (no tamanho de `grams`). Material acima disso sai da
   * seleção. Existe porque um punhado de especialidades caríssimas domina o
   * orçamento: numa paleta de 115 frascos, 12 deles chegaram a 76% do custo.
   */
  maxPerBottle?: number;
  /** Teto de frascos no total (a paleta inteira, obreiras incluídas). */
  maxBottles?: number;
  /**
   * Ids que a paleta TEM de conter, antes de qualquer cota.
   *
   * É o que transforma "paleta bonita" em "paleta que faz a fórmula que eu
   * quero". Uma seleção genérica, por melhor que seja, cobre no máximo dois
   * terços de uma receita real — porque receita usa o material específico, não
   * um parecido. Aqui se reserva a vaga.
   */
  mustInclude?: number[];
}

export interface PaletteResult {
  picks: Ingredient[];
  /** As que entraram por `mustInclude`. */
  required: Ingredient[];
  byFamily: { family: FamilySlug; asked: number; got: number; picks: Ingredient[] }[];
  workhorses: Ingredient[];
  /** Cotas que o catálogo não consegue atender. */
  shortfalls: { family: FamilySlug; asked: number; available: number }[];
  /** Custo estimado comprando `grams` de cada. */
  cost: { known: number; missingPrice: number };
}

/**
 * As matérias-primas que "arredondam": entram em quase toda fórmula, em dose
 * alta, dando volume, difusão e fixação. Quem monta paleta sem elas fica com
 * 100 frascos de nota e nenhuma cola para juntá-las.
 */
const WORKHORSE_KEYS = [
  // difusão e "ar" — entram em dose alta e levantam a fórmula inteira
  "hedione", "dihidromircenol", "tetrahidro linalol", "linalol",
  "acetato de linalila", "acetato de isobornila",

  // âmbar e madeira de volume — a base que segura tudo
  "iso e super", "ambroxan", "ambrox", "cedramber", "acetato de cedrila",
  "vertenex", "verdox", "cyclaprop", "sandalore", "bacdanol",

  // almíscares — fixação e maciez
  "galaxolide", "habanolide", "exaltolide", "etileno brassilato", "brassilato",
  "cashmeran", "tonalide", "ambrettolide", "helvetolide",

  // volume floral barato — o "enchimento" nobre das flores brancas
  "alcool feniletilico", "acetato de feniletila", "acetato de benzila",
  "hexil cinamico", "jasmonal", "amil cinamico",

  // salicilatos — volume e fixação, o acorde de protetor solar
  "salicilato de benzila", "salicilato de hexila", "salicilato de isoamila",

  // rosa estrutural — o esqueleto de qualquer floral
  "geraniol", "citronelol", "nerol", "hidroxicitronelal",

  // empoados e violeta — dão textura e "maquiagem"
  "ylang", "ionona alfa", "ionona beta", "metil ionona", "isoraldeina",
  "undecavertol",

  // fundo doce — baunilha, feno, amêndoa
  "vanilina", "cumarina", "heliotropina",

  // fixador frutado de dose alta
  "isobutirato de fenoxietila", "fenirat",
];

const SOLVENT_KEYS = ["dpg", "dipropileno", "ipm", "miristato de isopropila", "dep", "dietilftalato"];

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Quanto ESTE material merece uma vaga, antes de considerar a paleta já montada.
 * Prioriza o que é referência (tem nota curada), o que dá para comprar (tem
 * preço e várias ofertas) e o que tem dado suficiente para estudar.
 */
function baseScore(c: Ingredient, opts: PaletteOptions): number {
  let s = 0;
  if (c.insight) s += 4;                          // material de referência
  if (c.price.perG != null) s += 3;               // dá para comprar
  // Muita oferta = material que o mercado inteiro usa, logo material que as
  // fórmulas reais pedem. Peso maior que o de antes, pelo mesmo motivo da
  // penalidade de semelhança.
  s += Math.min(4, Math.log2(1 + (c.price.count || 0)) * 1.1);
  if (c.strength) s += 1;
  if (c.facets.length >= 2) s += 1;               // perfil definido
  if (c.notesOrigin && c.notesOrigin !== "família") s += 1;  // pirâmide com evidência
  if (opts.preferIsolates !== false) {
    if (c.kind === "base") s -= 3;                // base é atalho, não estudo
    if (c.kind === "essential_oil") s -= 0.5;     // varia de lote
  }
  return s;
}

/**
 * O quanto este candidato repete o que já foi escolhido.
 *
 * CALIBRAÇÃO IMPORTANTE: a penalidade é MUITO menor para material de referência
 * (com nota curada) e para o que é muito vendido. Motivo descoberto testando a
 * paleta contra uma fórmula real: com penalidade uniforme, escolher Geraniol
 * fazia Citronelol e Nerol perderem pontos por "semelhança" — só que em
 * perfumaria esses três não são redundantes, são a tríade da rosa, e toda
 * fórmula usa os três. Uma paleta otimizada só para diversidade fica exótica e
 * não formula nada.
 */
function similarityPenalty(c: Ingredient, chosen: Ingredient[]): number {
  // quanto mais canônico o material, menos ele é "substituível" por um parecido
  const canonico = (c.insight ? 0.45 : 0) + Math.min(0.35, (c.price.count || 0) / 90);
  const fator = Math.max(0.2, 1 - canonico);
  let p = 0;
  for (const other of chosen) {
    if (other.photo === c.photo) p += 4;          // mesmo objeto de cheiro
    const shared = c.facets.filter((f) => other.facets.includes(f)).length;
    p += shared * 1.2;
    if (other.notes[0] === c.notes[0]) p += 0.2;  // mesma posição na pirâmide
  }
  return p * fator;
}

/** Custo de um frasco do material no tamanho pedido. */
export function bottleCost(c: Ingredient, grams: number): number | null {
  return c.price.perG == null ? null : c.price.perG * grams;
}

/** Acima do teto? Material sem preço passa: não dá para afirmar que é caro. */
function overBudget(c: Ingredient, opts: PaletteOptions, grams: number): boolean {
  if (!opts.maxPerBottle) return false;
  const cost = bottleCost(c, grams);
  return cost != null && cost > opts.maxPerBottle;
}

/**
 * Ordena candidatos do melhor para o pior, dado o que já foi escolhido.
 * É o mesmo critério do seletor automático — a tela de escolha manual usa isto
 * para ordenar a fila, e não uma regra paralela que divergiria com o tempo.
 */
export function rankCandidates(pool: Ingredient[], chosen: Ingredient[]): Ingredient[] {
  const opts: PaletteOptions = { quotas: {} };
  return [...pool]
    .map((c) => ({ c, s: baseScore(c, opts) - similarityPenalty(c, chosen) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.c);
}

/** Escolhe `n` cartas de uma lista, maximizando cobertura em vez de repetir. */
function pickDiverse(pool: Ingredient[], n: number, opts: PaletteOptions, grams = 10): Ingredient[] {
  const chosen: Ingredient[] = [];
  // `banned` cobre o que a fonte não marcou: Lysmeral vinha sem teto IFRA e
  // passaria no filtro, apesar de ser Lilial com outro nome.
  const remaining = pool.filter((c) => !c.banned && !overBudget(c, opts, grams));
  while (chosen.length < n && remaining.length > 0) {
    let best = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const s = baseScore(remaining[i], opts) - similarityPenalty(remaining[i], chosen);
      if (s > bestScore) {
        bestScore = s;
        best = i;
      }
    }
    chosen.push(remaining[best]);
    remaining.splice(best, 1);
  }
  return chosen;
}

function matchesAny(c: Ingredient, keys: string[]): boolean {
  const hay = norm(c.name + " " + c.syn.join(" "));
  return keys.some((k) => hay.includes(k));
}

export function buildPalette(opts: PaletteOptions, grams = 10): PaletteResult {
  const chosenIds = new Set<number>();
  const workhorses: Ingredient[] = [];
  const cap = opts.maxBottles ?? Infinity;
  const room = () => cap - chosenIds.size;

  // 0) As obrigatórias entram primeiro e ocupam vaga na família delas.
  const required: Ingredient[] = [];
  for (const id of opts.mustInclude ?? []) {
    const c = CARDS.find((x) => x.id === id);
    if (c && !c.banned && !chosenIds.has(c.id) && room() > 0) {
      required.push(c);
      chosenIds.add(c.id);
    }
  }

  // 1) As obreiras entram ANTES das cotas: são elas que fazem a paleta funcionar
  //    como conjunto, e ocupam vaga na família delas.
  if (opts.includeWorkhorses) {
    // `!chosenIds.has` é essencial: sem ele, um material que já entrou como
    // obrigatório (da receita) entrava DE NOVO como obreira — a Cumarina
    // apareceu duas vezes na lista e a paleta estourou o teto de frascos.
    const cands = CARDS.filter(
      (c) => matchesAny(c, WORKHORSE_KEYS) && !c.banned && !chosenIds.has(c.id)
    );
    for (const c of pickDiverse(cands, Math.min(cands.length, 14, room()), opts, grams)) {
      workhorses.push(c);
      chosenIds.add(c.id);
    }
  }
  if (opts.includeSolvents) {
    const solv = CARDS.filter(
      (c) => (c.kind === "solvent" || matchesAny(c, SOLVENT_KEYS)) && !chosenIds.has(c.id)
    );
    for (const c of pickDiverse(solv, Math.min(2, room()), opts, grams)) {
      if (!chosenIds.has(c.id)) {
        workhorses.push(c);
        chosenIds.add(c.id);
      }
    }
  }

  // 2) Cotas por família, descontando quem já entrou como obreira.
  const byFamily: PaletteResult["byFamily"] = [];
  const shortfalls: PaletteResult["shortfalls"] = [];
  const picks: Ingredient[] = [...required, ...workhorses];

  for (const [fam, askedRaw] of Object.entries(opts.quotas) as [FamilySlug, number][]) {
    const asked = Math.max(0, askedRaw || 0);
    if (asked === 0) continue;
    const already = [...required, ...workhorses].filter((c) => c.family === fam);
    const pool = cardsOfFamily(fam).filter((c) => !chosenIds.has(c.id) && !c.banned);
    const need = Math.max(0, Math.min(asked - already.length, room()));
    const got = pickDiverse(pool, need, opts, grams);
    for (const c of got) {
      chosenIds.add(c.id);
      picks.push(c);
    }
    const total = already.length + got.length;
    byFamily.push({ family: fam, asked, got: total, picks: [...already, ...got] });
    if (total < asked) {
      shortfalls.push({ family: fam, asked, available: total });
    }
    if (room() <= 0) break;
  }

  let known = 0;
  let missingPrice = 0;
  for (const c of picks) {
    if (c.price.perG != null) known += c.price.perG * grams;
    else missingPrice++;
  }

  return { picks, required, byFamily, workhorses, shortfalls, cost: { known, missingPrice } };
}
