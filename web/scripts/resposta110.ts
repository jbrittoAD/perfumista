import { readFileSync } from "node:fs";
import { buildPalette } from "../lib/palette";
import { familyMeta, type FamilySlug } from "../lib/deck";
const G = 10, brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const ids: number[] = JSON.parse(readFileSync("../imagination-tipo-modo-direto.json", "utf8"))[0].items.map((i: any) => i.materialId);
const Q: Partial<Record<FamilySlug, number>> = {
  aldehydic: 10, citrus: 12, green: 10, aquatic: 8, woody: 12, musk: 8,
  gourmand: 7, floral: 14, amber: 9, herbal: 9, fruity: 6, spicy: 3, balsamic: 3, leather: 1,
};
const r = buildPalette({ quotas: Q, includeWorkhorses: true, includeSolvents: true,
  maxPerBottle: 120, maxBottles: 110, mustInclude: ids }, G);
const naReceita = new Set(ids);
const daReceita = r.picks.filter(c => naReceita.has(c.id));
const resto = r.picks.filter(c => !naReceita.has(c.id));
console.log(`A RECEITA OCUPA ${daReceita.length} frascos · ${brl(daReceita.reduce((s,c)=>s+(c.price.perG??0)*G,0))}`);
console.log(`SOBRAM ${resto.length} frascos · ${brl(resto.reduce((s,c)=>s+(c.price.perG??0)*G,0))}`);
console.log();
const porFam = new Map<string, typeof resto>();
for (const c of resto) porFam.set(c.family, [...(porFam.get(c.family) ?? []), c]);
for (const fam of [...porFam.keys()].sort((a,b)=>familyMeta(a as FamilySlug).order-familyMeta(b as FamilySlug).order)) {
  const cs = porFam.get(fam)!, f = familyMeta(fam as FamilySlug);
  console.log(`${f.emoji} ${f.label} (${cs.length})`);
  console.log(`   ${cs.map(c => c.name.split(" - ")[0].split(" (")[0].slice(0,26)).join(" · ")}`);
}
