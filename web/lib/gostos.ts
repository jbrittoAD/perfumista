/**
 * gostos.ts — o nariz de quem compra.
 *
 * Fica aqui, e não dentro da página, porque é DADO: descreve uma pessoa, não
 * uma tela, e precisa ser legível por qualquer script que orce a paleta.
 */

import type { Gostos } from "./palette";

/**
 * O nariz do dono desta paleta, dito por ele:
 * frio sim · moléculas eternas e pesadas · couro que cheira a couro novo, não a
 * bicho · amadeirado · TODOS os aldeídos · íris nas duas versões, com e sem
 * maquiagem · almíscar · cítrico · âmbar, dos secos · frutado e gourmand pouco ·
 * especiaria nem tanto · e ODEIO MEDICINAL.
 *
 * O medicinal pesa mais que tudo porque foi o erro da primeira lista: ela veio
 * com eucaliptol, cânfora, timol, mentol e wintergreen, que são canônicos e
 * baratos, e nenhum deles ele suporta.
 */
export const GOSTOS_JOAO: Gostos = {
  amo: {
    // couro limpo e madeira
    Couro: 3, Camurça: 3, Amadeirado: 2, Cedro: 1.5, Sândalo: 1.5, Vetiver: 1, Patchouli: 1,
    // a série inteira dos aldeídos
    Aldeídico: 3.5, Ceroso: 1, Sabonete: 1,
    // íris e violeta
    Íris: 3, Violeta: 1.5, Empoado: 1,
    // almíscar e cítrico
    Almíscar: 2.5, Cítrico: 2, Limão: 1, Bergamota: 1, Laranja: 0.5, Tangerina: 0.5,
    // âmbar, mas o seco
    Âmbar: 1.5, Seco: 2.5,
    // o frio que não é medicinal: mineral, metálico, ozônico
    Mineral: 2.5, Metálico: 2, Ozônico: 1.5, Marinho: 1, Transparente: 1,
  },
  odeio: {
    // o veto principal
    Medicinal: 9, Canforado: 7, Eucalipto: 7, Menta: 7, Fenólico: 5, Pinho: 2.5,
    // couro de bicho, não de sapataria
    Animálico: 5, Indólico: 4, Fecal: 6, Castóreo: 4, Defumado: 3, Alcatrão: 4,
    // gosta, mas pouco
    Frutado: 2, Doce: 2, Baunilha: 1.5, Mel: 2.5, Caramelo: 2.5, Especiado: 1.5,
    Abacaxi: 1.5, Morango: 2, Coco: 1.5, Tropical: 2,
  },
  // Veto, não desconto: com cota a cumprir, penalidade não segura.
  veto: [
    "Medicinal", "Canforado", "Eucalipto", "Menta", "Fenólico",
    "Alcatrão", "Fecal", "Castóreo", "Indólico",
  ],
  pesadas: 2.5,
};

/**
 * Pedidos nominais — o que ele pediu pelo nome, e que o seletor por gosto não
 * acharia sozinho porque são caros ou porque a faceta não os distingue.
 *
 * NÃO EXISTE no catálogo o que seria a resposta certa para "efeito bem
 * gelado": coolant fisiológico (WS-23, Frescolat, Evercool) dá frio na pele
 * quase sem cheiro, e nenhum dos cinco fornecedores vende. O frio aqui vem de
 * mineral e ozônico, que é frio de cheiro, não de pele.
 */
export const PEDIDOS_JOAO: { termo: string; exato?: boolean; porque: string }[] = [
  { termo: "isobutil quinolina", porque: "couro novo de sapataria, seco e sem bicho — o couro do Bandit" },
  { termo: "orris givco", porque: "íris SEM maquiagem: amanteigada e terrosa, a raiz de verdade" },
  { termo: "orivone", porque: "íris COM maquiagem: empoada e seca, o pó de arroz" },
  // "musgo de carvalho" sozinho casava com o Veramoss, mais barato porém
  // FENÓLICO — que está no veto. Pedido nominal fura o veto, então o termo
  // precisa ser exato.
  { termo: "musgo de carvalho", exato: true,
    porque: "o seco de sapataria por baixo do couro — o limpo, não o Veramoss fenólico" },
];
