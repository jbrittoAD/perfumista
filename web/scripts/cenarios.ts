import { buildPalette, type PaletteOptions } from "../lib/palette";
import { familyMeta, type FamilySlug } from "../lib/deck";
const G = 10, TETO = 120;
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const cenarios: { nome: string; nota: string; quotas: Partial<Record<FamilySlug, number>> }[] = [
  {
    nome: "A · DO SEU JEITO",
    nota: "suas prioridades, 7 famílias de fora",
    quotas: { aldehydic: 14, citrus: 18, green: 16, aquatic: 12, woody: 16, musk: 12, gourmand: 12, floral: 6, amber: 4 },
  },
  {
    nome: "B · COBERTURA COMPLETA",
    nota: "todas as 15 famílias, peso nas que você pediu",
    quotas: {
      aldehydic: 14, citrus: 12, green: 10, aquatic: 10, woody: 12, musk: 8, gourmand: 8,
      floral: 10, amber: 6, herbal: 10, fruity: 6, spicy: 4, balsamic: 4, leather: 2, animalic: 2,
    },
  },
];

for (const c of cenarios) {
  const opts: PaletteOptions = { quotas: c.quotas, includeWorkhorses: true, includeSolvents: true, maxPerBottle: TETO, maxBottles: 110 };
  const r = buildPalette(opts, G);
  console.log(`\n${"═".repeat(64)}\n${c.nome}  —  ${c.nota}`);
  const linhas = r.byFamily
    .map((g) => `${familyMeta(g.family).emoji} ${familyMeta(g.family).label.split(" /")[0]} ${g.got}`)
    .join(" · ");
  console.log("  " + linhas);
  console.log(`  + ${r.workhorses.length} obreiras/diluentes`);
  console.log(`  TOTAL ${r.picks.length} frascos · ${brl(r.cost.known)}`);
  const vazias = ["citrus","aldehydic","green","herbal","aquatic","fruity","floral","spicy","woody","balsamic","amber","gourmand","leather","animalic","musk"]
    .filter((f) => !r.picks.some((p) => p.family === f));
  if (vazias.length) console.log(`  ⚠ famílias sem nenhum frasco: ${vazias.map((f) => familyMeta(f as FamilySlug).label).join(", ")}`);
}
