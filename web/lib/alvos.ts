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

/**
 * ATENÇÃO À PROCEDÊNCIA DE CADA PORCENTAGEM.
 *
 * As do Imagination são as partes reais de uma fórmula publicada. As do
 * Himalaya e do Khalid são MINHAS, deduzidas da pirâmide e do rótulo, e por
 * isso ficam dentro da dose máxima que a própria carta do material declara.
 *
 * Isso importa: a primeira versão do Khalid punha Safraleine a 8% quando a
 * ficha dela diz 0,05–1% e avisa que a 1% "vira alcatrão e cinzeiro, dominando
 * tudo". Oito vezes o teto arruinaria o perfume e ainda fazia comprar 7,6 g de
 * um material que se usa a 0,9 g. O Imagination excede a dose de carta em
 * quatro materiais e está certo assim — ali o número é de quem formulou de
 * verdade, e a dose da carta é sugestão conservadora do fornecedor.
 */
export const ALVOS: Alvo[] = [
  {
    id: "himalaya",
    nome: "Tipo Creed Himalaya",
    nota: "fougère aromático com frio mineral de pólvora",
    fonte:
      "Pirâmide da própria Creed (topo bergamota, limão, tangerina · coração " +
      "pólvora, zimbro, noz-moscada, pimenta, suavizados por lavanda e jasmim · " +
      "base sândalo, vetiver, cedro) CRUZADA COM A LISTA INCI DO RÓTULO, que é " +
      "dado verificável: limoneno, linalol, salicilato de benzila, cumarina, " +
      "alfa-isometil ionona, hidroxicitronelal, citral, citronelol, isoeugenol, " +
      "geraniol, eugenol — nessa ordem, ou seja, decrescente. O rótulo declara só " +
      "os 26 alérgenos da lista europeia, então ele não prova o que MAIS tem; " +
      "prova o que TEM. E provou que a primeira versão desta reconstrução estava " +
      "errada: eu tinha montado um fougère aromático seco e o rótulo mostra ionona " +
      "empoada, muguet, a dupla da rosa e cravo, que eu não tinha posto.",
    papeis: [
      // --- topo cítrico
      { papel: "bergamota", buscar: ["bergamota"], pct: 5 },
      // Citral estava trocado por Lemonile para economizar, quando o menor
      // pacote de Citral parecia ser 500 g por R$ 107. Com a escada de ofertas
      // corrigida ele sai por R$ 3,57 em 5 g — e o rótulo prova que é citral
      // mesmo que está lá dentro.
      { papel: "limão", buscar: ["citral", "lemonile", "limao siciliano"], pct: 1 },
      { papel: "limoneno (o 1º do rótulo)", buscar: ["limoneno"], pct: 4 },
      { papel: "tangerina", buscar: ["mandarina", "tangerin", "clonal"], pct: 2 },
      { papel: "o fresco masculino", buscar: ["dihidromircenol"], pct: 8 },

      // --- o coração: é aqui que mora o caráter do Himalaya
      // "Pólvora" é acorde, não material: pedra fria e sílex. Monta-se com
      // mineral-ozônico + metálico + um traço defumado.
      { papel: "pólvora · mineral ozônico", buscar: ["helional"], pct: 2 },
      { papel: "pólvora · metálico frio", buscar: ["c12 mna"], pct: 0.5 },
      { papel: "pólvora · traço defumado", buscar: ["guaiacol", "betula"], pct: 1 },
            // Sabineno é o constituinte que faz a baga de zimbro cheirar a zimbro, e
      // custa R$ 42 contra R$ 213 da baga inteira. Perde a parte resinosa e
      // terrosa do óleo — quando sobrar orçamento, o Juniper Berry é o certo.
      { papel: "zimbro (alpino, gin)", buscar: ["sabineno", "juniper berry", "zimbro"], pct: 2 },
            // Cariofileno beta É a molécula que faz pimenta cheirar a pimenta, e
      // custa R$ 3,61 contra R$ 44,56 do óleo.
      { papel: "pimenta preta", buscar: ["cariofileno", "pimenta preta"], pct: 2 },
            // Lavanda reconstruída: o óleo é ~30% linalol e ~35% acetato de linalila,
      // e os dois já estão comprados para outros papéis. Sai o óleo de R$ 23,90
      // e não entra frasco novo nenhum. Perde a nuance de cânfora e cumarina
      // do natural — que aqui é bônus, já que cânfora está no veto.
      { papel: "lavanda · linalol", buscar: ["linalol"], pct: 3.5 },
      { papel: "lavanda · acetato de linalila", buscar: ["acetato de linalila"], pct: 2.5 },
      { papel: "jasmim transparente", buscar: ["hedione"], pct: 8 },

      // --- A CAMADA QUE O RÓTULO REVELOU e a pirâmide escondia.
      // Hidroxicitronelal e isometil ionona não vêm de natural nenhum da
      // pirâmide: foram postos lá de propósito. É o que faz o Himalaya não ser
      // um fougère seco qualquer — tem flor empoada por baixo do frio.
      { papel: "muguet (do rótulo)", buscar: ["hidroxicitronelal"], pct: 4 },
      { papel: "violeta empoada (do rótulo)", buscar: ["n metil ionona", "isoraldeina"], pct: 3 },
      { papel: "rosa · citronelol (do rótulo)", buscar: ["citronelol"], pct: 2 },
      { papel: "rosa · geraniol (do rótulo)", buscar: ["geraniol"], pct: 1.5 },
      { papel: "cravo (do rótulo)", buscar: ["eugenol"], pct: 1 },
      { papel: "cravo · isoeugenol (do rótulo)", buscar: ["isoeugenol"], pct: 0.05 },
      { papel: "feno doce (do rótulo)", buscar: ["cumarina"], pct: 3 },
      { papel: "salicilato solar (do rótulo)", buscar: ["salicilato de benzila"], pct: 3 },

      // --- base
      { papel: "corpo amadeirado", buscar: ["iso e super"], pct: 16 },
      { papel: "sândalo cremoso", buscar: ["bacdanol", "sandalore", "ebanol"], pct: 5 },
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
      { papel: "açafrão · couro (a assinatura)", buscar: ["safraleine"], pct: 1 },

      // --- topo: o Khalid original quase não tem abertura, quem abria era a
      // aspereza da fumaça. Sem ela o começo fica chapado e doce — daí o topo
      // resinoso-cítrico, mesmo truque dos couros de açafrão modernos.
      { papel: "bergamota", buscar: ["bergamota"], pct: 5 },
            // Pimenta rosa é majoritariamente terpênica (pineno, limoneno) com um
      // picante leve. Reconstruída sai por R$ 14 contra R$ 69 do óleo.
      { papel: "pimenta rosa · terpênica", buscar: ["alfa-pineno", "pimenta rosa"], pct: 2 },
      { papel: "pimenta rosa · picante", buscar: ["cariofileno"], pct: 1 },
            // Elemi = limoneno + felandreno + elemol. O alfa terpineol cobre o lado
      // resinoso-lilás por R$ 3,62 contra R$ 44,90.
      { papel: "elemi (ponte cítrico→resina)", buscar: ["alfa terpineol", "elemi"], pct: 1 },
      { papel: "cardamomo", buscar: ["cardamomo"], pct: 3 },

      // --- coração
      { papel: "labdano (âmbar de resina)", buscar: ["labdano", "cistus"], pct: 3 },
      // "Patchouli Terpenes" é subproduto da destilação e ganhava por começar
      // com o termo; o óleo Light é o material de verdade.
      { papel: "patchouli (a terra que sobra do original)", buscar: ["patchone", "patchouli light", "patchouli"], pct: 10 },
      { papel: "olíbano (seriedade sem fuligem)", buscar: ["olibano", "olibanum"], pct: 5 },
      // Opoponax e mirra estavam aqui como reforço resinoso, mas nenhum dos
      // dois está na pirâmide do Khalid e a menor embalagem sai por R$ 159–199.
      // O olíbano cobre o papel sozinho, por R$ 34.

      // --- base. Bálsamo de tolu NÃO existe em nenhum fornecedor mapeado;
      // benjoim + estoraque + um traço de vanilina cobrem o mesmo território
      // (resina cinâmica adocicada).
      { papel: "benjoim", buscar: ["benjoim", "benzoin"], pct: 5 },
      { papel: "estoraque (tolu, parte 2)", buscar: ["styrax", "estoraque"], pct: 2 },
      { papel: "vanilina (tolu, parte 3 — traço)", buscar: ["vanilina"], pct: 3 },
      { papel: "feno doce", buscar: ["cumarina"], pct: 3 },

      // --- "oud" sem curral: madeira seca ambarada faz o mesmo peso escuro
      // Estes dois NÃO são intercambiáveis, apesar de eu os ter agrupado como
      // "madeira seca" na primeira versão. Norlimbanol é álcool (logP 5,2),
      // trabalha a 0,55% e traz oud/animálico/mineral: é esqueleto e rastro.
      // Kephalis é cetona (logP 3,1), trabalha a 1,6% e traz tabaco/couro: é
      // corpo. Só compartilham "âmbar" e "amadeirado". Para ESTE alvo o
      // Kephalis é o mais fiel — tabaco e couro estão na descrição do Khalid,
      // e o animálico do Norlimbanol é justo o que se pediu para baixar.
      { papel: "corpo tabaco-couro", buscar: ["kephalis"], pct: 5 },
      { papel: "esqueleto de madeira seca (traço)", buscar: ["norlimbanol"], pct: 3 },
      { papel: "cedro seco", buscar: ["cedramber", "acetato de cedrila"], pct: 6 },
      { papel: "corpo amadeirado", buscar: ["iso e super"], pct: 20 },
      { papel: "projeção ambarada", buscar: ["ambroxan", "ambrox"], pct: 9 },
      { papel: "almíscar limpo", buscar: ["galaxolide", "habanolide"], pct: 9 },
      { papel: "almíscar de pele (o pouco animálico que fica)", buscar: ["exaltolide", "ambrettolide"], pct: 4 },
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
      "abaixo são as partes reais divididas por dez — menos Ambrox Super, " +
      "Dihidro Beta Ionona e Bergamota, que na fonte estão em solução a 10%.",
    papeis: [
      // --- o corpo: 45,6% da fórmula são dois materiais
      { papel: "jasmim transparente", buscar: ["hedione"], pct: 23.9 },
            // AS TRÊS LINHAS ABAIXO SÃO DILUIÇÃO A 10% NA FONTE, e a transcrição do
      // vídeo perdeu essa coluna. Lidas como material puro davam 21,7%, 9,8% e
      // 7,6% — todas acima da dose máxima do próprio material (10, 1 e 5). A
      // 10% caem exatamente dentro. As outras 20 linhas cabem puras, então não
      // são diluição: se tudo fosse a 10%, o concentrado seria 90% solvente.
      // As 1000 partes incluem o DPG das diluições, por isso NÃO se
      // renormaliza — o número aqui é o material ativo sobre o concentrado.
      { papel: "âmbar seco", buscar: ["ambroxan", "ambrox"], pct: 2.17 },

      // --- topo cítrico-lavanda
      { papel: "lavanda cítrica", buscar: ["acetato de linalila"], pct: 10.3 },
      { papel: "bergamota", buscar: ["bergamota"], pct: 0.76 },
      { papel: "linalol", buscar: ["linalol"], pct: 4.1 },
      { papel: "laranja doce", buscar: ["laranja doce", "laranja"], pct: 3.3 },
            // Único papel dos três alvos sem sintético que compense: o "Ginger Fresh"
      // custa R$ 211 contra R$ 73 do óleo. Fica natural.
      { papel: "gengibre", buscar: ["gengibre"], pct: 1.0 },
      { papel: "limão (traço)", buscar: ["citral"], pct: 0.4 },

      // --- a assinatura: a ionona amadeirada que dá o "violeta seco"
      { papel: "ionona amadeirada", buscar: ["dihidro beta ionona"], pct: 0.98 },
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
      { papel: "guaiacwood", buscar: ["acetato de guaiaco", "guaiacwood"], pct: 1.1 },
      { papel: "feno doce", buscar: ["cumarina"], pct: 0.8 },
      { papel: "flor de laranjeira", buscar: ["nerolin", "neroli"], pct: 0.2 },
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
