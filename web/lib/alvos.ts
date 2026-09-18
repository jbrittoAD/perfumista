/**
 * alvos.ts — Fórmulas-alvo: o que comprar para conseguir fazer X.
 *
 * ATENÇÃO AO QUE ISTO É E NÃO É: a fórmula real de um perfume comercial é
 * segredo industrial e não existe publicamente. O que está aqui é
 * RECONSTRUÇÃO — a pirâmide de notas divulgada pela marca, traduzida para os
 * materiais que produzem cada efeito. Serve para garantir que a paleta consiga
 * chegar perto do alvo; não é "a receita do perfume".
 *
 * Cada alvo lista os materiais por PAPEL, com a proporção aproximada do papel
 * no conjunto. A paleta usa isso só para reservar vaga — quem decide a dose na
 * hora de formular é você, na aba Fórmulas.
 */

import { CARDS, type Ingredient } from "./deck";

export interface AlvoPapel {
  papel: string;
  /** Termos que identificam o material no catálogo, melhor primeiro. */
  buscar: string[];
  /** Peso aproximado do papel na fórmula (%), só para orientar a dose. */
  pct: number;
}

export interface Alvo {
  id: string;
  nome: string;
  nota: string;
  /** De onde veio a pirâmide que originou a reconstrução. */
  fonte: string;
  papeis: AlvoPapel[];
}

export const ALVOS: Alvo[] = [
  {
    id: "himalaya",
    nome: "Tipo Creed Himalaya",
    nota: "cítrico-amadeirado limpo, com frio mineral",
    fonte:
      "Reconstrução a partir da pirâmide divulgada (bergamota, grapefruit, limão / " +
      "sândalo, cedro, noz-moscada, cardamomo / almíscar, âmbar-cinza, vetiver, tonka). " +
      "A fórmula real é proprietária.",
    papeis: [
      { papel: "abertura cítrica", buscar: ["bergamota"], pct: 12 },
      { papel: "grapefruit", buscar: ["grapefruit", "pamplemousse", "toranja"], pct: 6 },
      { papel: "limão", buscar: ["citral", "lemonile", "limao siciliano"], pct: 4 },
      { papel: "o fresco masculino", buscar: ["dihidromircenol"], pct: 10 },
      { papel: "corpo amadeirado", buscar: ["iso e super"], pct: 20 },
      { papel: "projeção ambarada", buscar: ["ambroxan", "ambrox"], pct: 10 },
      { papel: "almíscar limpo", buscar: ["galaxolide", "habanolide"], pct: 12 },
      { papel: "almíscar de pele", buscar: ["exaltolide", "ambrettolide"], pct: 5 },
      { papel: "cedro seco", buscar: ["acetato de cedrila", "cedramber"], pct: 6 },
      { papel: "sândalo cremoso", buscar: ["bacdanol", "sandalore", "ebanol"], pct: 5 },
      { papel: "vetiver", buscar: ["vetiver"], pct: 3 },
      { papel: "cardamomo", buscar: ["cardamomo"], pct: 2 },
      { papel: "tonka", buscar: ["cumarina"], pct: 2 },
      { papel: "frio metálico", buscar: ["c12 mna"], pct: 1 },
      { papel: "ozônico", buscar: ["floralozone", "helional"], pct: 2 },
    ],
  },
];

/** Resolve os papéis do alvo para cartas reais do catálogo. */
export function resolverAlvo(alvo: Alvo): { papel: AlvoPapel; card: Ingredient | null }[] {
  const norm = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return alvo.papeis.map((papel) => {
    let melhor: Ingredient | null = null;
    for (const termo of papel.buscar) {
      // entre os que casam, o mais barato por grama — é paleta de estudo
      const hits = CARDS.filter(
        (c) => !c.banned && norm(c.name + " " + c.syn.join(" ")).includes(termo),
      ).sort((a, b) => (a.price.perG ?? 9e9) - (b.price.perG ?? 9e9));
      if (hits.length) {
        melhor = hits[0];
        break;
      }
    }
    return { papel, card: melhor };
  });
}
