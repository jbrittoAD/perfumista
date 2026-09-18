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
    nota: "fougère aromático com frio mineral de pólvora",
    fonte:
      "Reconstrução a partir da descrição da própria Creed (topo bergamota, limão, " +
      "tangerina · coração pólvora, zimbro, noz-moscada, pimenta, suavizados por " +
      "lavanda e jasmim · base sândalo, vetiver, cedro) e da classificação " +
      "'aromatic fougère' com que a Creative Formulas cataloga a versão tipo, de 67 " +
      "ingredientes. A fórmula real é proprietária e não é pública.",
    papeis: [
      // --- topo cítrico
      { papel: "bergamota", buscar: ["bergamota"], pct: 10 },
      { papel: "limão", buscar: ["citral", "lemonile", "limao siciliano"], pct: 5 },
      { papel: "tangerina", buscar: ["mandarina", "tangerin", "clonal"], pct: 4 },
      { papel: "o fresco masculino", buscar: ["dihidromircenol"], pct: 8 },

      // --- o coração: é aqui que mora o caráter do Himalaya
      // "Pólvora" é acorde, não material: pedra fria e sílex. Monta-se com
      // mineral-ozônico + metálico + um traço defumado.
      { papel: "pólvora · mineral ozônico", buscar: ["helional"], pct: 3 },
      { papel: "pólvora · metálico frio", buscar: ["c12 mna"], pct: 2 },
      { papel: "pólvora · traço defumado", buscar: ["guaiacol", "betula"], pct: 1 },
      { papel: "zimbro (alpino, gin)", buscar: ["juniper berry", "zimbro", "sabineno"], pct: 3 },
      { papel: "pimenta preta", buscar: ["pimenta preta", "black pepper"], pct: 3 },
      { papel: "lavanda (a espinha fougère)", buscar: ["lavanda", "lavandin"], pct: 6 },
      { papel: "jasmim transparente", buscar: ["hedione"], pct: 8 },

      // --- base
      { papel: "corpo amadeirado", buscar: ["iso e super"], pct: 16 },
      { papel: "sândalo cremoso", buscar: ["bacdanol", "sandalore", "ebanol"], pct: 8 },
      { papel: "cedro seco", buscar: ["acetato de cedrila", "cedramber"], pct: 6 },
      { papel: "vetiver", buscar: ["vetiver"], pct: 4 },
      { papel: "projeção ambarada", buscar: ["ambroxan", "ambrox"], pct: 6 },
      { papel: "almíscar limpo", buscar: ["galaxolide", "habanolide"], pct: 5 },
      { papel: "almíscar de pele", buscar: ["exaltolide", "ambrettolide"], pct: 2 },
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
      // Entre os que casam, prefere o que tem o termo no COMEÇO do nome — é o
      // material em si, não um que apenas cita a faceta ("Silvanone Supra
      // (junípero/zimbro muscone)" casava com juniper e vencia por ser mais
      // barato que a baga de zimbro de verdade). Empatado, o mais barato.
      const hits = CARDS.filter(
        (c) => !c.banned && norm(c.name + " " + c.syn.join(" ")).includes(termo),
      ).sort((a, b) => {
        const pa = norm(a.name).startsWith(termo) ? 0 : 1;
        const pb = norm(b.name).startsWith(termo) ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return (a.price.perG ?? 9e9) - (b.price.perG ?? 9e9);
      });
      if (hits.length) {
        melhor = hits[0];
        break;
      }
    }
    return { papel, card: melhor };
  });
}
