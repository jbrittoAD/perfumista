import { readFileSync } from "node:fs";
import { buildPalette } from "../lib/palette";
import { CARDS, familyMeta, type FamilySlug } from "../lib/deck";
const G = 10, brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const receita = JSON.parse(readFileSync("../imagination-tipo-modo-direto.json", "utf8"))[0];
const ids: number[] = receita.items.map((i: any) => i.materialId);

// Sem animálica. O âmbar-cinza (Ambroxan, Grisalva, Amber Xtreme) é família Âmbar.
const Q: Partial<Record<FamilySlug, number>> = {
  aldehydic: 15, citrus: 24, green: 22, aquatic: 14, woody: 26, musk: 22, gourmand: 20,
  floral: 26, amber: 20, herbal: 20, fruity: 14, spicy: 8, balsamic: 8, leather: 4,
};
const r = buildPalette({ quotas: Q, includeWorkhorses: true, includeSolvents: true,
  maxPerBottle: 150, maxBottles: 220, mustInclude: ids }, G);
const tem = new Set(r.picks.map((c) => c.id));
const falta = ids.filter((i) => !tem.has(i));
console.log(`220 FRASCOS com a receita reservada — ${r.picks.length} frascos · ${brl(r.cost.known)}`);
console.log(`  Imagination: ${ids.length - falta.length}/${ids.length} materiais`);
console.log(`  faltando: ${falta.length ? falta.map(i => CARDS.find(c=>c.id===i)?.name).join(", ") : "nenhum ✓"}`);
console.log(`\n  distribuição final:`);
console.log("   ", r.byFamily.map(g => `${familyMeta(g.family).emoji}${g.got}`).join(" "));
const anim = r.picks.filter(c => c.family === "animalic");
console.log(`\n  animálica na paleta: ${anim.length ? anim.map(c=>c.name).join(", ") : "nenhuma"}`);
const ambar = r.picks.filter(c => c.family === "amber").slice(0, 8);
console.log(`  âmbar (inclui o "âmbar da baleia"): ${ambar.map(c=>c.name.split(" -")[0].split(" (")[0]).join(" · ")}`);
