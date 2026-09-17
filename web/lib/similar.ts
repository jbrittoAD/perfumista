/**
 * similar.ts — "Materiais parecidos": dado um material, encontra outros do
 * catálogo que servem ao mesmo propósito olfativo, para o perfumista decidir
 * "por que usar X ou Y".
 *
 * Regra de parentesco (do mais forte ao mais fraco):
 *   1. mesmo `family_canon` + mesmo `note_type`  (parentes diretos)
 *   2. mesmo `family_canon`                        (mesma família)
 *   3. mesma `odor_family` (texto)                 (fallback)
 * Ordena por relevância = offer_count DESC (mais disponível/comparável primeiro).
 *
 * O rótulo de comparação é derivado pelo `cas`:
 *   - MESMO cas do material atual → "mesmo composto" (escolha por preço/fornecedor)
 *   - cas diferente               → "parecido" (compare cheiro/força/uso)
 *
 * Funções PURAS, sem I/O, sem dependência de UI. ESM, sem extensão nos imports.
 */

import type { MaterialCard, MaterialDetail } from "@/lib/catalog";

/** Um material de referência precisa apenas destes campos para comparar. */
export type SimilarInput = Pick<
  MaterialDetail,
  "id" | "cas" | "family_canon" | "note_type" | "odor_family"
>;

export type SimilarKind = "same" | "similar";

export interface SimilarMatch {
  material: MaterialCard;
  /** "same" = mesmo CAS (mesmo composto); "similar" = parecido. */
  kind: SimilarKind;
}

/** true se dois CAS não-nulos são iguais (comparação tolerante a espaços). */
function sameCas(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return a.trim() === b.trim();
}

/**
 * findSimilar — retorna até `n` materiais parecidos com `material`, do array
 * `all`, ordenados por relevância (mesmo composto primeiro, depois offer_count).
 * Exclui o próprio material. Nunca lança.
 */
export function findSimilar(
  material: SimilarInput,
  all: MaterialCard[],
  n = 6,
): SimilarMatch[] {
  const fam = material.family_canon;
  const note = material.note_type;
  const odorFam = material.odor_family;

  // Pontua cada candidato pela força do parentesco; -1 = descartar.
  function relatedness(c: MaterialCard): number {
    if (c.id === material.id) return -1;
    if (fam && c.family_canon === fam) {
      return note && c.note_type === note ? 3 : 2;
    }
    if (odorFam && c.odor_family && c.odor_family === odorFam) return 1;
    return -1;
  }

  const scored = all
    .map((c) => ({ c, score: relatedness(c) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      // Mesmo composto (CAS igual) sobe ao topo — decisão puramente de preço.
      const aSame = sameCas(a.c.cas, material.cas) ? 1 : 0;
      const bSame = sameCas(b.c.cas, material.cas) ? 1 : 0;
      if (aSame !== bSame) return bSame - aSame;
      if (a.score !== b.score) return b.score - a.score;
      if (a.c.offer_count !== b.c.offer_count) return b.c.offer_count - a.c.offer_count;
      return a.c.name_canonical.localeCompare(b.c.name_canonical, "pt-BR");
    });

  return scored.slice(0, n).map(({ c }) => ({
    material: c,
    kind: sameCas(c.cas, material.cas) ? "same" : "similar",
  }));
}
