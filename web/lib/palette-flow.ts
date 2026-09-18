/**
 * palette-flow.ts — Os candidatos de cada família, na ordem em que valem ser
 * oferecidos para escolha.
 *
 * Diferente de `buildPalette`, que ESCOLHE sozinho, aqui a decisão é do usuário:
 * a função só ordena os candidatos e informa quantos faltam para fechar a cota.
 * O critério de ordem é o mesmo (referência + disponibilidade, com penalidade de
 * semelhança em relação ao que já foi escolhido), então a fila se reordena a
 * cada escolha: quem se parece com o que acabou de entrar desce na lista.
 */

import { cardsOfFamily, type FamilySlug, type Ingredient } from "./deck";
import { bottleCost, rankCandidates } from "./palette";

export interface FamilyStep {
  family: FamilySlug;
  quota: number;
  chosen: Ingredient[];
  /** Próximos candidatos, melhor primeiro. */
  candidates: Ingredient[];
  done: boolean;
}

export function buildSteps(
  quotas: Partial<Record<FamilySlug, number>>,
  picks: number[],
  skipped: number[],
  maxPerBottle: number | null,
  grams: number,
  /** Gramas por carta, quando a compra é dimensionada por lote. */
  gDe?: (c: Ingredient) => number,
): FamilyStep[] {
  const pickSet = new Set(picks);
  const skipSet = new Set(skipped);
  const steps: FamilyStep[] = [];

  for (const [fam, quotaRaw] of Object.entries(quotas) as [FamilySlug, number][]) {
    const quota = Math.max(0, quotaRaw || 0);
    if (quota === 0) continue;
    const all = cardsOfFamily(fam);
    const chosen = all.filter((c) => pickSet.has(c.id));
    const pool = all.filter(
      (c) =>
        !pickSet.has(c.id) &&
        !skipSet.has(c.id) &&
        !c.banned &&
        (maxPerBottle == null ||
          bottleCost(c, gDe?.(c) ?? grams) == null ||
          bottleCost(c, gDe?.(c) ?? grams)! <= maxPerBottle),
    );
    steps.push({
      family: fam,
      quota,
      chosen,
      candidates: rankCandidates(pool, chosen),
      done: chosen.length >= quota,
    });
  }
  return steps;
}
