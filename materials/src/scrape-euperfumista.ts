/**
 * Scraper do fornecedor EU PERFUMISTA (source = "euperfumista").
 * Plataforma: SHOPIFY — expõe /products.json?limit=250&page=N (JSON público,
 * sem anti-bot). Muito mais simples que raspar HTML: cada produto já traz
 * variants (tamanho, preço, estoque, sku), vendor (marca), tags e body_html.
 *
 * Uma linha de `offers` por variante. CAS extraído do título/descrição.
 * material_id fica NULL até `build-materials` ligar ao material canônico.
 *
 * Uso: NODE_NO_WARNINGS=1 npx tsx src/scrape-euperfumista.ts
 */
import * as cheerio from "cheerio";
import { db } from "./db.js";
import { httpGet, saveRaw, jitter } from "./http.js";
import { extractCas } from "./normalize.js";

const SOURCE = "euperfumista";
const BASE = "https://www.euperfumista.com.br";

/** "5 gramas" | "20 ml" | "1 kg" -> { value, unit(ml|g) }. */
function parseSize(raw: string | null | undefined): { value: number | null; unit: string | null } {
  if (!raw) return { value: null, unit: null };
  const s = String(raw).toLowerCase().trim();
  const m = s.match(/([\d.,]+)\s*(kg|gramas|grama|g|litros?|lt|l|ml|mililitros?)\b/);
  if (!m) return { value: null, unit: null };
  let value = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(value)) return { value: null, unit: null };
  let unit = m[2];
  if (unit === "kg") { value *= 1000; unit = "g"; }
  else if (/^(litros?|lt|l)$/.test(unit)) { value *= 1000; unit = "ml"; }
  else if (/^mililitros?$/.test(unit) || unit === "ml") { unit = "ml"; }
  else unit = "g";
  return { value, unit };
}

/** Diluição de um rótulo tipo "10% em DPG" -> "10% em DPG"; senão null (puro). */
function parseDilution(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = String(raw).match(/\b\d{1,2}\s*%[^,;]*/);
  return m ? m[0].trim() : null;
}

const insertOffer = db.prepare(`
  INSERT OR REPLACE INTO offers
    (material_id, source, source_url, product_name, cas_raw, brand,
     size_value, size_unit, dilution, price, currency, sku, in_stock,
     odor_desc_raw, note_raw, dosage_raw, data_json)
  VALUES
    (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BRL', ?, ?, ?, ?, ?, ?)
`);

async function run(): Promise<void> {
  let total = 0, offersN = 0;
  for (let page = 1; page <= 40; page++) {
    const url = `${BASE}/products.json?limit=250&page=${page}`;
    const res = await httpGet(url);
    if (!res.ok) { console.warn(`[euperfumista] page ${page}: HTTP ${res.status} — parando`); break; }
    let products: any[] = [];
    try { products = JSON.parse(res.text).products || []; } catch { console.warn(`[euperfumista] page ${page}: JSON inválido`); break; }
    if (products.length === 0) { console.log(`[euperfumista] page ${page}: vazia — fim.`); break; }
    saveRaw(SOURCE, url, res.text);

    for (const p of products) {
      const productUrl = `${BASE}/products/${p.handle}`;
      const desc = p.body_html ? cheerio.load(p.body_html).text().replace(/\s+/g, " ").trim().slice(0, 600) : null;
      const cas = extractCas(p.title) || extractCas(p.body_html || "");
      const brand = p.vendor || null;
      const note_raw = p.product_type || (Array.isArray(p.tags) ? p.tags.join(", ") : p.tags) || null;
      for (const v of p.variants || []) {
        const label = v.option1 || v.title || null;
        const { value, unit } = parseSize(label);
        const price = v.price != null ? parseFloat(String(v.price)) : null;
        const data_json = JSON.stringify({
          variant_id: v.id, size_label: label, price, grams: v.grams,
          available: v.available, sku: v.sku, vendor: brand, cas, tags: p.tags, type: p.product_type,
        });
        insertOffer.run(
          SOURCE, productUrl, p.title, cas, brand,
          value, unit, parseDilution(label), Number.isFinite(price as number) ? price : null,
          v.sku ? String(v.sku) : null, typeof v.available === "boolean" ? (v.available ? 1 : 0) : null,
          desc, note_raw, null, data_json,
        );
        offersN++;
      }
      total++;
    }
    console.log(`[euperfumista] page ${page}: ${products.length} produtos (acum ${total}, ${offersN} ofertas).`);
    await jitter(500, 1200);
  }
  console.log(`[euperfumista] concluído: ${total} produtos, ${offersN} ofertas gravadas.`);
  const n = (db.prepare("SELECT COUNT(*) n FROM offers WHERE source=?").get(SOURCE) as { n: number }).n;
  console.log(`[euperfumista] offers na base (${SOURCE}): ${n}`);
}

run().catch((e) => { console.error(e); process.exit(1); });
