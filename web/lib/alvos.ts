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

import { CARDS, compraPara, type Ingredient } from "./deck";

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
      { papel: "limão", buscar: ["lemonile", "limao siciliano", "citral"], pct: 5 },
      { papel: "tangerina", buscar: ["mandarina", "tangerin", "clonal"], pct: 4 },
      { papel: "o fresco masculino", buscar: ["dihidromircenol"], pct: 8 },

      // --- o coração: é aqui que mora o caráter do Himalaya
      // "Pólvora" é acorde, não material: pedra fria e sílex. Monta-se com
      // mineral-ozônico + metálico + um traço defumado.
      { papel: "pólvora · mineral ozônico", buscar: ["helional"], pct: 3 },
      { papel: "pólvora · metálico frio", buscar: ["c12 mna"], pct: 2 },
      { papel: "pólvora · traço defumado", buscar: ["guaiacol", "betula"], pct: 1 },
            // Sabineno é o constituinte que faz a baga de zimbro cheirar a zimbro, e
      // custa R$ 42 contra R$ 213 da baga inteira. Perde a parte resinosa e
      // terrosa do óleo — quando sobrar orçamento, o Juniper Berry é o certo.
      { papel: "zimbro (alpino, gin)", buscar: ["sabineno", "juniper berry", "zimbro"], pct: 3 },
      { papel: "pimenta preta", buscar: ["pimenta preta", "black pepper"], pct: 3 },
      { papel: "lavanda (a espinha fougère)", buscar: ["lavanda", "lavandin"], pct: 6 },
      { papel: "jasmim transparente", buscar: ["hedione"], pct: 8 },

      // --- base
      { papel: "corpo amadeirado", buscar: ["iso e super"], pct: 16 },
      { papel: "sândalo cremoso", buscar: ["bacdanol", "sandalore", "ebanol"], pct: 8 },
      { papel: "cedro seco", buscar: ["acetato de cedrila", "cedramber"], pct: 6 },
            // Acetato de vetiveril: vetiver sem a parte de raiz úmida, mais limpo e
      // um terço do preço do óleo do Haiti. Para masculino é até preferível.
      { papel: "vetiver", buscar: ["acetato de vetivert", "vetiver"], pct: 4 },
      { papel: "projeção ambarada", buscar: ["ambroxan", "ambrox"], pct: 6 },
      { papel: "almíscar limpo", buscar: ["galaxolide", "habanolide"], pct: 5 },
      { papel: "almíscar de pele", buscar: ["exaltolide", "ambrettolide"], pct: 2 },
    ],
  },
  {
    id: "khalid-limpo",
    nome: "DNA Lattafa Khalid (sem defumado)",
    nota: "couro de açafrão sobre resinas quentes — o Khalid com a fuligem removida",
    fonte:
      "Pirâmide divulgada do Lattafa Niche Emarati Khalid (2023): topo couro, " +
      "labdano, açafrão · coração bétula, óleo de cade, patchouli · base couro, " +
      "oud, bálsamo de tolu, benjoim. AQUI ESTÁ ALTERADA DE PROPÓSITO: bétula e " +
      "cade são exatamente o defumado, então saem, e o couro/oud entram em versão " +
      "domesticada. O que sai de fuligem é reposto por resina seca (olíbano, " +
      "opoponax) e madeira seca ambarada, para o benjoim não puxar tudo para o doce.",
    papeis: [
      // --- a assinatura: Safraleine é açafrão E couro no mesmo material.
      // É o coração do brief — couro quente, sem alcatrão.
      // Safraleine sozinha dá açafrão E couro sem alcatrão. O Suederal, que
      // seria o reforço óbvio de camurça, traz "defumado · castóreo" no próprio
      // descritor — exatamente o que este alvo tira. Fora.
      { papel: "açafrão · couro (a assinatura)", buscar: ["safraleine"], pct: 8 },

      // --- topo: o Khalid original quase não tem abertura, quem abria era a
      // aspereza da fumaça. Sem ela o começo fica chapado e doce — daí o topo
      // resinoso-cítrico, mesmo truque dos couros de açafrão modernos.
      { papel: "bergamota", buscar: ["bergamota"], pct: 6 },
      { papel: "pimenta rosa", buscar: ["pimenta rosa", "pink pepper"], pct: 2 },
      { papel: "elemi (ponte cítrico→resina)", buscar: ["elemi"], pct: 2 },
      { papel: "cardamomo", buscar: ["cardamomo"], pct: 2 },

      // --- coração
      { papel: "labdano (âmbar de resina)", buscar: ["labdano", "cistus"], pct: 7 },
      // "Patchouli Terpenes" é subproduto da destilação e ganhava por começar
      // com o termo; o óleo Light é o material de verdade.
      { papel: "patchouli (a terra que sobra do original)", buscar: ["patchouli light", "patchoulol", "patchouli"], pct: 8 },
      { papel: "olíbano (seriedade sem fuligem)", buscar: ["olibano", "olibanum"], pct: 6 },
      // Opoponax e mirra estavam aqui como reforço resinoso, mas nenhum dos
      // dois está na pirâmide do Khalid e a menor embalagem sai por R$ 159–199.
      // O olíbano cobre o papel sozinho, por R$ 34.

      // --- base. Bálsamo de tolu NÃO existe em nenhum fornecedor mapeado;
      // benjoim + estoraque + um traço de vanilina cobrem o mesmo território
      // (resina cinâmica adocicada).
      { papel: "benjoim", buscar: ["benjoim", "benzoin"], pct: 9 },
      { papel: "estoraque (tolu, parte 2)", buscar: ["styrax", "estoraque"], pct: 4 },
      { papel: "vanilina (tolu, parte 3 — traço)", buscar: ["vanilina"], pct: 2 },
      { papel: "feno doce", buscar: ["cumarina"], pct: 2 },

      // --- "oud" sem curral: madeira seca ambarada faz o mesmo peso escuro
      // Estes dois NÃO são intercambiáveis, apesar de eu os ter agrupado como
      // "madeira seca" na primeira versão. Norlimbanol é álcool (logP 5,2),
      // trabalha a 0,55% e traz oud/animálico/mineral: é esqueleto e rastro.
      // Kephalis é cetona (logP 3,1), trabalha a 1,6% e traz tabaco/couro: é
      // corpo. Só compartilham "âmbar" e "amadeirado". Para ESTE alvo o
      // Kephalis é o mais fiel — tabaco e couro estão na descrição do Khalid,
      // e o animálico do Norlimbanol é justo o que se pediu para baixar.
      { papel: "corpo tabaco-couro", buscar: ["kephalis"], pct: 4 },
      { papel: "esqueleto de madeira seca (traço)", buscar: ["norlimbanol"], pct: 4 },
      { papel: "cedro seco", buscar: ["cedramber", "acetato de cedrila"], pct: 4 },
      { papel: "corpo amadeirado", buscar: ["iso e super"], pct: 14 },
      { papel: "projeção ambarada", buscar: ["ambroxan", "ambrox"], pct: 6 },
      { papel: "almíscar limpo", buscar: ["galaxolide", "habanolide"], pct: 6 },
      { papel: "almíscar de pele (o pouco animálico que fica)", buscar: ["exaltolide", "ambrettolide"], pct: 3 },
    ],
  },
  {
    id: "imagination",
    nome: "Tipo LV Imagination",
    nota: "cítrico aromático sobre âmbar amadeirado — quase metade é Hedione e Ambroxan",
    fonte:
      "Diferente dos outros dois, este NÃO é reconstrução: é a fórmula tipo " +
      "publicada pela Creative Formulas (23 materiais, partes por mil), já " +
      "cadastrada em knowledge/data/formulas-published.json. As porcentagens " +
      "abaixo são as partes reais divididas por dez, não estimativa.",
    papeis: [
      // --- o corpo: 45,6% da fórmula são dois materiais
      { papel: "jasmim transparente", buscar: ["hedione"], pct: 23.9 },
      { papel: "âmbar seco", buscar: ["ambroxan", "ambrox"], pct: 21.7 },

      // --- topo cítrico-lavanda
      { papel: "lavanda cítrica", buscar: ["acetato de linalila"], pct: 10.3 },
      { papel: "bergamota", buscar: ["bergamota"], pct: 7.6 },
      { papel: "linalol", buscar: ["linalol"], pct: 4.1 },
      { papel: "laranja doce", buscar: ["laranja doce", "laranja"], pct: 3.3 },
      { papel: "gengibre", buscar: ["gengibre"], pct: 1.0 },
      { papel: "limão (traço)", buscar: ["citral"], pct: 0.4 },

      // --- a assinatura: a ionona amadeirada que dá o "violeta seco"
      { papel: "ionona amadeirada", buscar: ["dihidro beta ionona"], pct: 9.8 },
      { papel: "violeta", buscar: ["ionona beta"], pct: 0.1 },
      { papel: "violeta empoada", buscar: ["n metil ionona", "metil ionona"], pct: 0.1 },

      // --- almíscares: 13,8% somados, é o que dá a pele
      { papel: "almíscar branco", buscar: ["ambrettolide", "ambretolide"], pct: 7.6 },
      { papel: "almíscar aveludado", buscar: ["velvione"], pct: 3.5 },
      { papel: "almíscar de pele", buscar: ["exaltolide"], pct: 2.7 },

      // --- a tríade da rosa, em dose de tempero
      { papel: "rosa · citronelol", buscar: ["citronelol"], pct: 1.1 },
      { papel: "rosa · geraniol", buscar: ["geraniol"], pct: 0.4 },
      { papel: "rosa · acetato de geranila", buscar: ["acetato de geranila"], pct: 0.3 },
      { papel: "rosa · nerol (traço)", buscar: ["nerol"], pct: 0.03 },

      // --- fundo
      { papel: "guaiacwood", buscar: ["guaiacwood", "guaiaco"], pct: 1.1 },
      { papel: "feno doce", buscar: ["cumarina"], pct: 0.8 },
      { papel: "flor de laranjeira", buscar: ["neroli"], pct: 0.2 },
      { papel: "canela (traço)", buscar: ["aldeido cinamico", "cinamico"], pct: 0.3 },
      { papel: "indol (traço)", buscar: ["indol"], pct: 0.03 },
    ],
  },
];

/**
 * A dose que os ALVOS pedem de cada material, por id — a maior quando o
 * material aparece em mais de um.
 *
 * Existe porque a dose típica da carta não serve para dimensionar a compra de
 * uma fórmula específica: o Ambroxan entra a ~2% na média do mercado e a
 * 21,7% no Imagination. Comprar pela média deixaria faltar dez vezes.
 */
export function dosesDosAlvos(gramas = 10): Map<number, number> {
  const m = new Map<number, number>();
  for (const alvo of ALVOS) {
    for (const { papel, card } of resolverAlvo(alvo, gramas)) {
      if (!card) continue;
      m.set(card.id, Math.max(m.get(card.id) ?? 0, papel.pct));
    }
  }
  return m;
}

/** Resolve os papéis do alvo para cartas reais do catálogo. */
export function resolverAlvo(alvo: Alvo, gramas = 10): { papel: AlvoPapel; card: Ingredient | null }[] {
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
        // Três níveis, não dois: o nome que É o termo vem antes do nome que
        // apenas COMEÇA com ele. Sem o primeiro nível, "nerol" casava com
        // "Neroli Artessence" — que também começa com "nerol" — e os papéis
        // "rosa · nerol" e "flor de laranjeira" caíam na mesma carta.
        const grau = (c: Ingredient) => {
          const nome = norm(c.name);
          if (!nome.startsWith(termo)) return 2;
          const depois = nome[termo.length];
          return depois === undefined || !/[a-z0-9]/.test(depois) ? 0 : 1;
        };
        const pa = grau(a);
        const pb = grau(b);
        if (pa !== pb) return pa - pb;
        // Desempate pelo DESEMBOLSO REAL, não pelo preço por grama. Ordenando
        // por perG o alvo escolhia o Opoponax a R$ 6,49/g cuja menor
        // embalagem é 20 g por R$ 199 — mais caro de comprar que um
        // concorrente "mais caro por grama" vendido em 10 g.
        const ca = compraPara(a, gramas)?.price ?? 9e9;
        const cb = compraPara(b, gramas)?.price ?? 9e9;
        return ca - cb;
      });
      if (hits.length) {
        melhor = hits[0];
        break;
      }
    }
    return { papel, card: melhor };
  });
}
