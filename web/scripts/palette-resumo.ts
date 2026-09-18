import { buildPalette } from "../lib/palette";
import { familyMeta } from "../lib/deck";
const G = 10;
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
for (const teto of [0, 200, 120, 60]) {
  const r = buildPalette({
    quotas: { aldehydic: 14, woody: 25, green: 23, aquatic: 14, citrus: 25, floral: 8 },
    includeWorkhorses: true, includeSolvents: true,
    maxPerBottle: teto || undefined, maxBottles: 110,
  }, G);
  console.log(`teto ${teto ? "R$ " + teto : "sem teto"}`.padEnd(16),
    `${String(r.picks.length).padStart(3)} frascos`, "→", brl(r.cost.known).padStart(12),
    r.shortfalls.length ? ` (faltou: ${r.shortfalls.map(s => `${familyMeta(s.family).label} ${s.available}/${s.asked}`).join(", ")})` : "");
}
console.log();
const r = buildPalette({
  quotas: { aldehydic: 14, woody: 25, green: 23, aquatic: 14, citrus: 25, floral: 8 },
  includeWorkhorses: true, includeSolvents: true, maxPerBottle: 120, maxBottles: 110,
}, G);
console.log("=== COM TETO DE R$ 120 — por família ===");
console.log(`  ${"obreiras + diluentes".padEnd(26)} ${String(r.workhorses.length).padStart(3)} frascos  ${brl(r.workhorses.reduce((s,c)=>s+(c.price.perG??0)*G,0)).padStart(11)}`);
for (const g of r.byFamily) {
  const f = familyMeta(g.family);
  const sub = g.picks.reduce((s, c) => s + (c.price.perG ?? 0) * G, 0);
  console.log(`  ${(f.emoji+" "+f.label).padEnd(26)} ${String(g.got).padStart(3)} frascos  ${brl(sub).padStart(11)}`);
}
console.log(`\n  ${"TOTAL".padEnd(26)} ${String(r.picks.length).padStart(3)} frascos  ${brl(r.cost.known).padStart(11)}`);
console.log("\n  as obreiras escolhidas:");
console.log("   ", r.workhorses.map(c => c.name.split(" - ")[0].split(" (")[0].slice(0,26)).join(" · "));
