import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const ROOT = "/Users/joaocarlosbrittofilho/Documents/Pessoais/Perfumista";
const dir = `${ROOT}/knowledge/data/`;
const files: [string, string][] = [
  ["formulas-diy.json", "diy"],
  ["formulas-published.json", "published"],
  ["formulas-classic.json", "classic"],
];
const out: any[] = [];
let id = 1;
for (const [f, src] of files) {
  const raw = JSON.parse(readFileSync(dir + f, "utf8"));
  const arr: any[] = Array.isArray(raw) ? raw : raw.formulas || [];
  for (const x of arr) {
    out.push({
      id: id++, source: src, name: x.name || "(sem nome)", family: x.family || null,
      concentration: x.concentration || null, ingredients: x.ingredients || [],
      pyramid: x.pyramid || { top: [], heart: [], base: [] },
      smells_like: x.smells_like || null, what_it_does: x.what_it_does || null,
      source_url: x.source_url || null, confidence: x.confidence || null,
    });
  }
}
mkdirSync(`${ROOT}/web/lib/data`, { recursive: true });
writeFileSync(`${ROOT}/web/lib/data/recipes.json`, JSON.stringify(out, null, 1));
const c = JSON.parse(readFileSync(dir + "combinations.json", "utf8"));
const carr: any[] = Array.isArray(c) ? c : c.combinations || c.formulas || [];
writeFileSync(`${ROOT}/web/lib/data/combinations.json`, JSON.stringify(carr, null, 1));
const bySource = out.reduce((a: any, x) => { a[x.source] = (a[x.source] || 0) + 1; return a; }, {});
console.log("recipes:", out.length, "| documented:", out.filter((x) => x.confidence === "documented").length, "| combinations:", carr.length);
console.log("por fonte:", JSON.stringify(bySource));
