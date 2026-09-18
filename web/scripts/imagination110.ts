import { readFileSync } from "node:fs";
import { buildPalette } from "../lib/palette";
import { CARDS, familyMeta, perGram, type FamilySlug, type Ingredient } from "../lib/deck";
const G = 10;
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const receita = JSON.parse(readFileSync("../imagination-tipo-modo-direto.json", "utf8"))[0];
const ids: number[] = receita.items.map((i: any) => i.materialId);

const Q: Partial<Record<FamilySlug, number>> = {
  aldehydic: 10, citrus: 12, green: 10, aquatic: 8, woody: 12, musk: 8,
  gourmand: 7, floral: 14, amber: 9, herbal: 9, fruity: 6, spicy: 3, balsamic: 3, leather: 1,
};
const r = buildPalette({ quotas: Q, includeWorkhorses: true, includeSolvents: true,
  maxPerBottle: 120, maxBottles: 110, mustInclude: ids }, G);

const naReceita = new Set(ids);
const porFam = new Map<string, Ingredient[]>();
for (const c of r.picks) {
  const k = c.family;
  porFam.set(k, [...(porFam.get(k) ?? []), c]);
}
const ordem = [...porFam.keys()].sort((a, b) => familyMeta(a as FamilySlug).order - familyMeta(b as FamilySlug).order);

for (const fam of ordem) {
  const cs = porFam.get(fam)!;
  const f = familyMeta(fam as FamilySlug);
  const sub = cs.reduce((s, c) => s + (c.price.perG ?? 0) * G, 0);
  console.log(`\n${f.emoji} ${f.label.toUpperCase()} — ${cs.length} · ${brl(sub)}`);
  for (const c of cs.sort((a, b) => (naReceita.has(b.id) ? 1 : 0) - (naReceita.has(a.id) ? 1 : 0))) {
    const tag = naReceita.has(c.id) ? "◆" : " ";
    const custo = c.price.perG != null ? brl(c.price.perG * G) : "sem preço";
    console.log(`  ${tag} ${c.name.slice(0, 42).padEnd(42)} ${perGram(c.price.perG).padEnd(13)} ${custo.padStart(10)}`);
  }
}
const tem = new Set(r.picks.map((c) => c.id));
console.log(`\n${"═".repeat(70)}`);
console.log(`◆ = material da receita do Imagination (${ids.filter((i) => tem.has(i)).length}/${ids.length})`);
console.log(`TOTAL: ${r.picks.length} frascos · ${brl(r.cost.known)} com 10g de cada`);
