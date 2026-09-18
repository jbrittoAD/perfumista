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

import { CARDS, cardsOfFamily, compraPara, type FamilySlug, type Ingredient } from "./deck";

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
  /**
   * Trata a bancada como consumível: compra em `bancadaGrams` e a deixa FORA
   * da contagem de frascos e das cotas, liberando os 110 lugares para nota.
   */
  bancadaSeparada?: boolean;
  /** Quanto comprar de cada item da bancada. Padrão 250 g. */
  bancadaGrams?: number;
  /** Teto de gasto das NOTAS (a bancada tem orçamento próprio). */
  budget?: number;
  /**
   * Comprar de cada material o que um lote de perfume consome, em vez de um
   * tamanho fixo de frasco. Dimensiona pela dose típica de cada um.
   */
  lote?: { ml: number; pct: number };
}

export interface PaletteResult {
  picks: Ingredient[];
  /** As que entraram por `mustInclude`. */
  required: Ingredient[];
  byFamily: { family: FamilySlug; asked: number; got: number; picks: Ingredient[] }[];
  workhorses: Ingredient[];
  /** Cotas que o catálogo não consegue atender. */
  shortfalls: { family: FamilySlug; asked: number; available: number }[];
  /** Consumível comprado a granel, fora da contagem de frascos. */
  bancada: Ingredient[];
  /** Custo real das embalagens. `bancada` é o gasto do granel. */
  cost: { known: number; missingPrice: number; bancada: number };
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

/**
 * A BANCADA. Não são paleta, são consumível: entram em quase toda fórmula em
 * dose alta, e o frasco de 10 g acaba antes do terceiro ensaio. Compram-se em
 * 250–500 g de uma vez, como o álcool, e por isso não disputam vaga com as
 * notas — quem ocupa um dos 110 lugares é aroma que se escolhe, não solvente.
 *
 * O critério para estar aqui é duplo: dose alta em fórmula real E embalagem
 * grande com preço por grama que compensa. Habanolide e Exaltolide seriam
 * candidatos óbvios pela função, mas a menor embalagem sai por mais de R$ 600
 * cada — ficam na paleta, em frasco pequeno.
 */
export const BANCADA_KEYS = [
  // o veículo e o que o protege
  "cereais", "bht",
  // diluente
  "dipropileno", "miristato de isopropila",
  // corpo e difusão, dose 10–30%
  "iso e super", "hedione", "dihidromircenol",
  "alcool feniletilico", "hexil cinamico", "salicilato de benzila",
  // âmbar e madeira de volume
  "ambroxan", "cedramber",
  // almíscar de fixação, dose alta
  "galaxolide", "etileno brassilato",
];

/**
 * Itens da bancada que não seguem o tamanho escolhido. O álcool é o veículo —
 * 80% do frasco pronto — e comprá-lo em 100 g não faz sentido nenhum. O BHT
 * entra a 0,1%: o menor pote que existe (500 g) já é suprimento vitalício, e
 * pedir mais é desperdício.
 */
const TAMANHO_FIXO: Record<string, number> = { cereais: 1000, bht: 100 };

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
function baseScore(c: Ingredient, opts: PaletteOptions, grams = 10): number {
  let s = 0;
  // Preço REAL da compra pesa na escolha. Sem isto a paleta enchia de
  // Amberketal a R R$ 239 o frasco quando havia âmbar equivalente a R$ 12 —
  // ela só perguntava se havia preço, nunca qual era.
  const pago = bottleCost(c, grams);
  if (pago != null) s -= Math.min(4, pago / 22);
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

/**
 * Quantos gramas deste material um lote de perfume consome.
 *
 * É o dimensionamento honesto de uma paleta: ninguém compra 500 g de Ambroxan,
 * compra o que 500 ml de perfume pedem. 500 ml a 20% são 100 ml de
 * concentrado, ~95 g; um material que entra a 6% consome 5,7 g dele, e um que
 * entra a 0,5% consome menos de meio grama. O piso de 1 g existe porque
 * ninguém vende frações e porque abaixo disso a balança de bancada não lê.
 */
export function gramasParaLote(c: Ingredient, ml: number, pct: number): number {
  const concentrado = ml * (pct / 100) * 0.95;   // ml -> g, densidade ~0,95
  return Math.max(1, concentrado * ((c.dose.mid ?? 2) / 100));
}

/**
 * Custo de um frasco do material no tamanho pedido — o que SE PAGA, não
 * `perG × gramas`. Ver a nota em deck.ts: a diferença entre os dois chega a 5x
 * no conjunto da paleta, porque o preço por grama bom quase sempre vem de uma
 * embalagem grande que ninguém quer comprar de 90 materiais diferentes.
 */
export function bottleCost(c: Ingredient, grams: number): number | null {
  return compraPara(c, grams)?.price ?? null;
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
function pickDiverse(
  pool: Ingredient[], n: number, opts: PaletteOptions,
  grams = 10, gDe?: (c: Ingredient) => number,
): Ingredient[] {
  const g = (c: Ingredient) => gDe?.(c) ?? grams;
  const chosen: Ingredient[] = [];
  // `banned` cobre o que a fonte não marcou: Lysmeral vinha sem teto IFRA e
  // passaria no filtro, apesar de ser Lilial com outro nome.
  const remaining = pool.filter((c) => !c.banned && !overBudget(c, opts, g(c)));
  while (chosen.length < n && remaining.length > 0) {
    let best = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const s = baseScore(remaining[i], opts, g(remaining[i])) - similarityPenalty(remaining[i], chosen);
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
  // Quanto comprar de CADA material: o que o lote pede, ou o frasco fixo.
  const gDe = (c: Ingredient) =>
    opts.lote ? gramasParaLote(c, opts.lote.ml, opts.lote.pct) : grams;
  const chosenIds = new Set<number>();
  const workhorses: Ingredient[] = [];
  const bancada: Ingredient[] = [];
  let custoBancada = 0;

  // -1) A bancada sai da frente antes de tudo. Ela não gasta vaga nem cota: é
  //     consumível. Sai também do pool, para não voltar como obreira ou nota.
  if (opts.bancadaSeparada) {
    const bg = opts.bancadaGrams ?? 250;
    // Um item por PAPEL, e dentro do papel o que sai mais barato no tamanho
    // pedido — não o primeiro que casa. Sem isto o DPG entrava no pote de
    // 200 g por R$ 19,99 enquanto o mesmo solvente existe em 1 L por R$ 44,50,
    // que é menos da metade do preço por grama.
    for (const key of BANCADA_KEYS) {
      const alvo = TAMANHO_FIXO[key] ?? bg;   // a bancada mantém tamanho próprio
      const cands = CARDS.filter(
        (c) => !c.banned && !chosenIds.has(c.id) && matchesAny(c, [key]),
      );
      let melhor: Ingredient | null = null;
      let melhorPpg = Infinity;
      for (const c of cands) {
        const o = compraPara(c, alvo);
        if (!o?.price || !o.size) continue;
        const ppg = o.price / Math.min(o.size, alvo * 4); // não premia embalagem gigante
        if (ppg < melhorPpg) { melhorPpg = ppg; melhor = c; }
      }
      if (!melhor) continue;
      bancada.push(melhor);
      chosenIds.add(melhor.id);
      custoBancada += compraPara(melhor, alvo)?.price ?? 0;
    }
  }
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
    for (const c of pickDiverse(cands, Math.min(cands.length, 14, room()), opts, grams, gDe)) {
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
  //    Com `budget`, a cota é um teto e não uma promessa: quando o dinheiro
  //    acaba a família fica incompleta, e isso aparece em `shortfalls`. É
  //    preferível a devolver uma lista que não cabe no bolso de quem pediu.
  let gasto = [...required, ...workhorses].reduce(
    (t, c) => t + (bottleCost(c, gDe(c)) ?? 0), 0,
  );

  // COTA DE DINHEIRO POR FAMÍLIA. Sem isto o orçamento é gasto na ordem das
  // chaves do objeto e as últimas famílias ficam vazias — a paleta saía com
  // verde 2/6, aquática 1/4 e couro 1/3 não porque falta material barato, mas
  // porque a amadeirada, que vem antes, já tinha levado o caixa. Cada família
  // recebe a fatia proporcional à cota que pediu; o que sobrar volta para o
  // bolo comum na segunda passada.
  const pedidoTotal = Object.values(opts.quotas).reduce((t, n) => t + (n || 0), 0) || 1;
  const sobra = Math.max(0, (opts.budget ?? Infinity) - gasto);
  const fatia = (fam: FamilySlug) =>
    opts.budget == null ? Infinity : (sobra * (opts.quotas[fam] || 0)) / pedidoTotal;

  let gastoFam = 0;
  let tetoFam = Infinity;
  const cabe = (c: Ingredient) => {
    const v = bottleCost(c, gDe(c)) ?? 0;
    if (opts.budget != null && gasto + v > opts.budget) return false;
    return gastoFam + v <= tetoFam;
  };

  const byFamily: PaletteResult["byFamily"] = [];
  const shortfalls: PaletteResult["shortfalls"] = [];
  const picks: Ingredient[] = [...required, ...workhorses];

  for (const [fam, askedRaw] of Object.entries(opts.quotas) as [FamilySlug, number][]) {
    const asked = Math.max(0, askedRaw || 0);
    if (asked === 0) continue;
    const already = [...required, ...workhorses].filter((c) => c.family === fam);
    const pool = cardsOfFamily(fam).filter((c) => !chosenIds.has(c.id) && !c.banned);
    const need = Math.max(0, Math.min(asked - already.length, room()));
    gastoFam = 0;
    tetoFam = fatia(fam);
    const got = pickDiverse(pool, need, opts, grams, gDe).filter((c) => {
      if (!cabe(c)) return false;
      const v = bottleCost(c, gDe(c)) ?? 0;
      gasto += v;
      gastoFam += v;
      return true;
    });
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

  // Segunda passada: o dinheiro que as famílias baratas não usaram preenche as
  // que ficaram incompletas, agora sem teto por família.
  if (opts.budget != null && shortfalls.length) {
    tetoFam = Infinity;
    gastoFam = 0;
    for (const sf of [...shortfalls]) {
      const pool = cardsOfFamily(sf.family).filter((c) => !chosenIds.has(c.id) && !c.banned);
      const falta = Math.min(sf.asked - sf.available, room());
      if (falta <= 0) continue;
      const extra = pickDiverse(pool, falta, opts, grams, gDe).filter((c) => {
        if (!cabe(c)) return false;
        gasto += bottleCost(c, gDe(c)) ?? 0;
        return true;
      });
      for (const c of extra) {
        chosenIds.add(c.id);
        picks.push(c);
      }
      sf.available += extra.length;
      const bf = byFamily.find((b) => b.family === sf.family);
      if (bf) { bf.got += extra.length; bf.picks.push(...extra); }
    }
    for (let i = shortfalls.length - 1; i >= 0; i--) {
      if (shortfalls[i].available >= shortfalls[i].asked) shortfalls.splice(i, 1);
    }
  }

  let known = 0;
  let missingPrice = 0;
  for (const c of picks) {
    const v = bottleCost(c, gDe(c));
    if (v != null) known += v;
    else missingPrice++;
  }

  return {
    picks, required, byFamily, workhorses, bancada, shortfalls,
    cost: { known, missingPrice, bancada: custoBancada },
  };
}
