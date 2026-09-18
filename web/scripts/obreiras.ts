import { CARDS, familyMeta, perGram } from "../lib/deck";
import { buildPalette } from "../lib/palette";
const r = buildPalette({ quotas: {}, includeWorkhorses: true, includeSolvents: true }, 10);
const brl=(v:number)=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
console.log(`=== OBREIRAS ENCONTRADAS: ${r.workhorses.length} ===`);
let t=0;
for (const c of r.workhorses.sort((a,b)=>familyMeta(a.family).order-familyMeta(b.family).order)) {
  const custo=(c.price.perG??0)*10; t+=custo;
  console.log(`  ${(familyMeta(c.family).emoji+" "+familyMeta(c.family).label).padEnd(24)} ${c.name.slice(0,36).padEnd(36)} ${perGram(c.price.perG).padEnd(13)} dose até ${String(c.dose.high)+"%"}`.padEnd(120)+`  10g ≈ ${brl(custo)}`);
}
console.log(`\n  total das obreiras com 10g de cada: ${brl(t)}`);
