/** Prévia da paleta no terminal — para calibrar cotas antes de virar tela. */
import { buildPalette } from "../lib/palette";
import { familyMeta, perGram, type Ingredient } from "../lib/deck";

const GRAMS = 10;
const res = buildPalette(
  {
    quotas: { aldehydic: 14, woody: 25, green: 23, aquatic: 14, citrus: 25, floral: 8 },
    includeWorkhorses: true,
    includeSolvents: true,
    maxPerBottle: Number(process.env.TETO || 0) || undefined,
    maxBottles: Number(process.env.MAX || 0) || undefined,
  },
  GRAMS
);

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const line = (c: Ingredient) => {
  const p = c.price.perG;
  const custo = p != null ? brl(p * GRAMS) : "sem preço";
  const caro = p != null && p * GRAMS > 120 ? "  ← CARO" : "";
  return `    ${c.name.slice(0, 38).padEnd(38)} ${perGram(p).padEnd(14)} ${GRAMS}g ≈ ${custo}${caro}`;
};

console.log(`=== OBREIRAS (arredondamento) — ${res.workhorses.length} ===`);
res.workhorses.forEach((c) => console.log(line(c)));

for (const g of res.byFamily) {
  const f = familyMeta(g.family);
  const sub = g.picks.reduce((s, c) => s + (c.price.perG ?? 0) * GRAMS, 0);
  console.log(`\n=== ${f.emoji} ${f.label} — ${g.got}/${g.asked}  (subtotal ${brl(sub)}) ===`);
  g.picks.forEach((c) => console.log(line(c)));
}

console.log(`\n${"=".repeat(60)}`);
console.log(`frascos: ${res.picks.length}`);
console.log(`custo com ${GRAMS}g de cada: ${brl(res.cost.known)}`);
if (res.cost.missingPrice) console.log(`(${res.cost.missingPrice} sem preço mapeado)`);
const caros = res.picks
  .filter((c) => (c.price.perG ?? 0) * GRAMS > 120)
  .sort((a, b) => (b.price.perG ?? 0) - (a.price.perG ?? 0));
if (caros.length) {
  console.log(`\nOS MAIS CAROS (${GRAMS}g acima de R$ 120):`);
  caros.forEach((c) =>
    console.log(`  ${familyMeta(c.family).label.padEnd(22)} ${c.name.slice(0, 34).padEnd(34)} ${brl((c.price.perG ?? 0) * GRAMS)}`)
  );
}
