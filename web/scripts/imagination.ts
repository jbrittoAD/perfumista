import { readFileSync } from "node:fs";
import { buildPalette } from "../lib/palette";
import { CARDS, familyMeta, perGram, type FamilySlug, type Ingredient } from "../lib/deck";

const G = 10, TETO = 150;
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Sem animálica (pedido do usuário). O âmbar-cinza — "âmbar da baleia" — não é
// animálica: é a família Âmbar, e entra com peso.
const QUOTAS_220: Partial<Record<FamilySlug, number>> = {
  aldehydic: 15, citrus: 24, green: 22, aquatic: 14, woody: 26, musk: 22,
  gourmand: 20, floral: 26, amber: 18, herbal: 20, fruity: 14, spicy: 8,
  balsamic: 8, leather: 4,
};
const QUOTAS_110: Partial<Record<FamilySlug, number>> = {
  aldehydic: 12, citrus: 12, green: 10, aquatic: 10, woody: 12, musk: 8,
  gourmand: 8, floral: 10, amber: 6, herbal: 8, fruity: 5, spicy: 3, balsamic: 2, leather: 1,
};

const receita = JSON.parse(readFileSync("../imagination-tipo-modo-direto.json", "utf8"))[0];
const precisa: { id: number; name: string; pct: number }[] = receita.items.map((i: any) => ({
  id: i.materialId, name: i.name, pct: (i.grams / 10.011) * 100,
}));

for (const [rotulo, quotas, max] of [["110 FRASCOS", QUOTAS_110, 110], ["220 FRASCOS", QUOTAS_220, 220]] as const) {
  const r = buildPalette({ quotas, includeWorkhorses: true, includeSolvents: true, maxPerBottle: TETO, maxBottles: max }, G);
  const temIds = new Set(r.picks.map((c) => c.id));
  const falta = precisa.filter((p) => !temIds.has(p.id)).sort((a, b) => b.pct - a.pct);
  const cobre = precisa.length - falta.length;

  console.log(`\n${"═".repeat(66)}\n${rotulo} — ${r.picks.length} frascos · ${brl(r.cost.known)}`);
  console.log(`  IMAGINATION: cobre ${cobre} de ${precisa.length} materiais (${((cobre / precisa.length) * 100).toFixed(0)}%)`);
  if (falta.length) {
    console.log(`  falta comprar:`);
    for (const f of falta) {
      const card = CARDS.find((c) => c.id === f.id);
      const custo = card?.price.perG != null ? brl(card.price.perG * G) : "sem preço";
      const fam = card ? familyMeta(card.family).label : "?";
      console.log(`    ${f.pct.toFixed(2).padStart(5)}%  ${f.name.slice(0, 40).padEnd(40)} ${fam.padEnd(20)} 10g ≈ ${custo}`);
    }
    const extra = falta.reduce((s, f) => {
      const c = CARDS.find((x) => x.id === f.id);
      return s + (c?.price.perG ?? 0) * G;
    }, 0);
    console.log(`    → ${brl(extra)} para completar a receita`);
  }
}
