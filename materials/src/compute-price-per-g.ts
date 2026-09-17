/**
 * Calcula offers.price_per_g = preço por grama de MATERIAL PURO.
 * Normaliza tamanho (ml≈g p/ estimativa) e diluição (ex "10% DPG" -> 10% do peso é material).
 * Assim R$28,90/15g@10% (=~R$19,3/g puro) NÃO parece mais barato que R$31/15g puro (=R$2,07/g).
 * Idempotente: adiciona a coluna se faltar e recalcula tudo.
 */
import { db } from "./db.js";

const cols = db.prepare("PRAGMA table_info(offers)").all() as { name: string }[];
if (!cols.some((c) => c.name === "price_per_g")) {
  db.exec("ALTER TABLE offers ADD COLUMN price_per_g REAL");
  console.log("coluna price_per_g adicionada.");
}

/** Fração de material puro a partir do texto de diluição. null/"puro" => 1. "10% DPG" => 0.10 */
function pureFraction(dilution: string | null): number {
  if (!dilution) return 1;
  const s = dilution.toLowerCase();
  if (/puro|pure|100\s*%/.test(s)) return 1;
  const m = s.match(/(\d{1,3}(?:[.,]\d+)?)\s*%/);
  if (!m) return 1;
  const pct = parseFloat(m[1].replace(",", ".")) / 100;
  return pct > 0 && pct <= 1 ? pct : 1;
}

const rows = db
  .prepare("SELECT id, size_value, size_unit, dilution, price FROM offers WHERE price IS NOT NULL AND size_value IS NOT NULL AND size_value>0")
  .all() as { id: number; size_value: number; size_unit: string | null; dilution: string | null; price: number }[];

// densidade média de material de perfumaria p/ converter ml->g (aprox.; densidades reais 0,8-1,1)
const ML_DENSITY = 0.95;
const upd = db.prepare("UPDATE offers SET price_per_g=? WHERE id=?");
let n = 0;
db.exec("BEGIN");
for (const r of rows) {
  const grams = (r.size_unit === "ml" ? r.size_value * ML_DENSITY : r.size_value);
  const pure = grams * pureFraction(r.dilution);
  if (pure > 0) { upd.run(r.price / pure, r.id); n++; }
}
db.exec("COMMIT");

console.log(`price_per_g calculado para ${n} ofertas.`);
console.table(
  db.prepare(
    "SELECT source, ROUND(MIN(price_per_g),2) min_rs_g, ROUND(AVG(price_per_g),2) avg_rs_g, ROUND(MAX(price_per_g),2) max_rs_g FROM offers WHERE price_per_g IS NOT NULL GROUP BY source"
  ).all()
);
