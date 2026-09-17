/**
 * Scraper do fornecedor PERFUMÍSTICO (source = "perfumistico").
 * Plataforma: WooCommerce (tema Storefront). SSR — o HTML vem pronto DEPOIS de
 * passar o desafio anti-bot.
 *
 * IMPORTANTE: este site devolve 403 a requisições simples (Cloudflare/WAF). Por
 * isso usamos `fetchHtml` do browser.ts (Chrome real, contexto persistente),
 * NÃO o httpGet. Só UMA instância do navegador por vez.
 *
 * Categoria: /categoria-produto/aromas/quimicos-aromaticos/ com paginação
 * WooCommerce /page/N/. Produtos em /produtos/aromas/quimicos-aromaticos/<slug>/
 * (às vezes numa subcategoria: .../quimicos-aromaticos/<subcat>/<slug>/).
 *
 * DADOS RICOS: nome (com sinônimo comercial entre parênteses), CAS, descrição
 * de odor detalhada, diluição recomendada %, preço R$ por variação de tamanho
 * (gramas), marca/fornecedor (IFF, Firmenich... taxonomia /marca/), nota/família
 * e intensidade. Produtos são "variable" WooCommerce: cada tamanho é uma variação
 * em form.variations_form[data-product_variations] (JSON) -> 1 linha por variação.
 * Também há JSON-LD Product (nome + descrição). Metadados na tabela
 * .woocommerce-product-attributes.
 *
 * DUAS FASES (resumível via scrape_queue):
 *   1) discover — percorre a categoria (/page/N/), extrai URLs de produto ->
 *      enqueue + saveRaw das páginas de categoria.
 *   2) scrape   — cada pendente -> fetchHtml + saveRaw + parse -> INSERT OR REPLACE
 *      offers (uma linha por variação), markDone/markError.
 *
 * Uso:
 *   NODE_NO_WARNINGS=1 npx tsx src/scrape-perfumistico.ts [discover|scrape]
 * Env:
 *   LIMIT     (default 3) — nº de produtos raspados na fase scrape (teste)
 *   MAXPAGES  (default 0=todas) — limita nº de páginas na fase discover (teste)
 */
import * as cheerio from "cheerio";
import { db, enqueue, nextPending, markDone, markError, queueStats } from "./db.js";
import { saveRaw, httpGet, jitter } from "./http.js";
import { extractCas } from "./normalize.js";

// O Perfumístico bloqueava por User-Agent (403 a bots), não por JS-challenge:
// com UA de navegador o HTTP puro responde 200. Sem browser => rápido e paralelizável.
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "5", 10);

const SOURCE = "perfumistico";
const BASE = "https://www.perfumistico.com.br";
// Categorias raspadas: químicos aromáticos (moléculas) + acordes e bases
// (reconstruções de naturais, bases animálicas, acordes prontos).
const CATEGORY_URLS = [
  `${BASE}/categoria-produto/aromas/quimicos-aromaticos/`,
  `${BASE}/categoria-produto/aromas/acordes-e-bases/`,
];
// Só URLs de PRODUTO (não subcategorias /categoria-produto/, tags /produto-tag/, marcas /marca/).
const PRODUCT_RE = /\/produtos\/aromas\/(quimicos-aromaticos|acordes-e-bases)\/[^?#]*\/?$/;

// --------------------------------------------------------------------------
// Utilitários
// --------------------------------------------------------------------------

/** "R$ 1.234,56" | 22.3 | "13,90" -> 1234.56 (ou null). */
function parseBRL(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  let s = raw.replace(/[^\d.,]/g, "").trim();
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * "15 gramas" | "100 ml" | "1 kg" | "20g" -> { value, unit(ml|g) }.
 * gramas/g -> g; ml -> ml; kg -> g x1000; l/lt -> ml x1000.
 */
function parseSize(raw: string | null | undefined): { value: number | null; unit: string | null } {
  if (!raw) return { value: null, unit: null };
  const s = raw.toLowerCase().trim();
  const m = s.match(/([\d.,]+)\s*(kg|gramas|grama|g|litros?|lt|l|ml|mililitros?)\b/);
  if (!m) return { value: null, unit: null };
  let value = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(value)) return { value: null, unit: null };
  let unit = m[2];
  if (unit === "kg") { value *= 1000; unit = "g"; }
  else if (/^(litros?|lt|l)$/.test(unit)) { value *= 1000; unit = "ml"; }
  else if (/^mililitros?$/.test(unit) || unit === "ml") { unit = "ml"; }
  else { unit = "g"; } // gramas | grama | g
  return { value, unit };
}

// --------------------------------------------------------------------------
// FASE 1 — descoberta (percorre categoria paginada /page/N/)
// --------------------------------------------------------------------------

/** Extrai URLs de produto de uma página de categoria (só links de produto). */
function extractProductUrls(html: string): string[] {
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $("ul.products li.product a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const u = new URL(href, BASE).toString().split("#")[0].split("?")[0];
    if (PRODUCT_RE.test(u)) urls.add(u);
  });
  // Fallback: qualquer link de produto na página (caso o tema mude os wrappers).
  if (urls.size === 0) {
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      const u = new URL(href, BASE).toString().split("#")[0].split("?")[0];
      if (PRODUCT_RE.test(u)) urls.add(u);
    });
  }
  return [...urls];
}

async function discover(): Promise<void> {
  const maxPages = parseInt(process.env.MAXPAGES || "0", 10); // 0 = todas
  const allProducts = new Set<string>();
  let newlyQueued = 0;

  for (const categoryUrl of CATEGORY_URLS) {
    console.log(`[discover] categoria ${categoryUrl}${maxPages ? ` (MAXPAGES=${maxPages})` : ""}`);
    let page = 1;
    while (true) {
      if (maxPages && page > maxPages) break;
      const url = page === 1 ? categoryUrl : `${categoryUrl}page/${page}/`;
      if (page > 1) await jitter(2000, 4000);
      const res = await httpGet(url);
      if (res.status === 404) {
        console.log(`[discover] página ${page}: 404 — fim da paginação.`);
        break;
      }
      if (!res.ok) {
        console.warn(`[discover] página ${page}: erro (status=${res.status}) — parando`);
        break;
      }
      saveRaw(SOURCE, url, res.text);
      const found = extractProductUrls(res.text);
      console.log(`[discover] página ${page}: status ${res.status}, ${found.length} link(s) de produto`);

      if (found.length === 0) {
        console.log(`[discover] página ${page} vazia — fim da paginação.`);
        break;
      }
      for (const u of found) {
        const before = allProducts.size;
        allProducts.add(u);
        if (allProducts.size > before) { enqueue(SOURCE, u, "product"); newlyQueued++; }
      }
      page++;
    }
  }
  console.log(`[discover] concluído: ${allProducts.size} produtos únicos, ${newlyQueued} enfileirados (novos).`);
}

// --------------------------------------------------------------------------
// FASE 2 — raspagem de produto
// --------------------------------------------------------------------------

/** Extrai a diluição de um rótulo tipo "15 gramas @ 10% DPG" -> "10% DPG"; senão null (puro). */
function parseDilution(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const at = raw.split("@")[1];
  if (at) return at.trim();
  const m = raw.match(/\b\d{1,2}\s*%[^,;]*/); // "10% DPG" solto no rótulo
  return m ? m[0].trim() : null;
}

interface Variation {
  size_label: string | null;
  size_value: number | null;
  size_unit: string | null;
  dilution: string | null;
  price: number | null;
  price_regular: number | null;
  sku: string | null;
  in_stock: number | null;
  variation_id: number | null;
}

interface ParsedProduct {
  product_name: string | null;
  cas_raw: string | null;
  brand: string | null;
  odor_desc_raw: string | null;
  note_raw: string | null;
  dosage_raw: string | null;
  strength_raw: string | null;
  tenacity_raw: string | null;
  synonyms_raw: string | null;
  tags: string[];
  attributes: Record<string, string>;
  ldjson: any | null;
  variations: Variation[];
}

/** Lê o JSON-LD Product (se houver). */
function readLdProduct(html: string, $: cheerio.CheerioAPI): any | null {
  let product: any = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (product) return;
    const txt = $(el).html();
    if (!txt) return;
    try {
      const data = JSON.parse(txt);
      const graph = Array.isArray(data) ? data : data["@graph"] || [data];
      for (const node of graph) {
        const t = node && node["@type"];
        if (t === "Product" || (Array.isArray(t) && t.includes("Product"))) { product = node; break; }
      }
    } catch { /* JSON-LD malformado — ignora */ }
  });
  return product;
}

function parseProduct(html: string): ParsedProduct {
  const $ = cheerio.load(html);
  const ld = readLdProduct(html, $);

  const product_name =
    (ld?.name && String(ld.name).trim()) ||
    ($("h1.product_title, h1.entry-title").first().text() || "").trim() ||
    null;

  // Tabela de atributos adicionais (chave -> valor).
  const attributes: Record<string, string> = {};
  $("table.woocommerce-product-attributes tr, table.shop_attributes tr").each((_, el) => {
    const label = $(el).find("th").text().replace(/\s+/g, " ").trim();
    const val = $(el).find("td").text().replace(/\s+/g, " ").trim();
    if (label) attributes[label] = val;
  });

  // Descrição curta (odor + diluição) + descrição do JSON-LD como reforço.
  const shortDesc = $(".woocommerce-product-details__short-description")
    .text().replace(/\s+/g, " ").trim() || null;
  const ldDesc = ld?.description ? String(ld.description).replace(/\s+/g, " ").trim() : null;
  const odor_desc_raw = shortDesc || ldDesc || null;

  // CAS: do atributo, senão do título/descrição/corpo.
  const casText = attributes["Número CAS"] || attributes["Numero CAS"] || "";
  const cas_raw =
    extractCas(casText) ||
    extractCas(product_name) ||
    extractCas(ldDesc) ||
    extractCas(shortDesc) ||
    extractCas($("body").text());

  // Marca (taxonomia /marca/).
  let brand: string | null =
    $(".product_meta a[href*='/marca/']").first().text().trim() ||
    $("a[href*='/marca/']").first().text().trim() ||
    null;
  if (brand === "") brand = null;

  // Nota/família e demais metadados técnicos.
  const note_raw =
    attributes["Notas"] || attributes["Tipo de odor"] ||
    $(".product_meta a[href*='/produto-tag/']").map((_, el) => $(el).text().trim()).get().join(", ") ||
    null;
  const dosage_raw =
    attributes["Máximo recomendado em fragrâncias (essência concentrada)"] ||
    attributes["Máximo recomendado em fragrâncias"] ||
    attributes["Máximo recomendado"] ||
    null;
  const strength_raw = attributes["Intensidade odorífica"] || null;
  const tenacity_raw = attributes["Substantividade"] || null;
  const synonyms_raw = attributes["Sinônimos mais comuns"] || attributes["Sinônimos"] || null;

  const tags = $(".product_meta a[href*='/produto-tag/']").map((_, el) => $(el).text().trim()).get();

  // Variações (produto WooCommerce "variable").
  const variations: Variation[] = [];
  const dp = $("form.variations_form").attr("data-product_variations");
  if (dp && dp !== "false") {
    try {
      const arr = JSON.parse(dp);
      for (const v of arr) {
        const attrs = v.attributes || {};
        const label =
          attrs.attribute_apresentacao ||
          (Object.values(attrs)[0] as string) || null;
        const { value, unit } = parseSize(label);
        variations.push({
          size_label: label,
          size_value: value,
          size_unit: unit,
          dilution: parseDilution(label),
          price: parseBRL(v.display_price),
          price_regular: parseBRL(v.display_regular_price),
          sku: v.sku ? String(v.sku) : null,
          in_stock: typeof v.is_in_stock === "boolean" ? (v.is_in_stock ? 1 : 0) : null,
          variation_id: typeof v.variation_id === "number" ? v.variation_id : null,
        });
      }
    } catch { /* data-product_variations malformado */ }
  }

  // Produto simples (sem variações no JSON): usa preço/sku/estoque da página.
  if (variations.length === 0) {
    const priceText = $("p.price ins .amount, p.price > .amount, .summary p.price").first().text();
    const sku = $(".sku").first().text().trim();
    const stockCls = $("p.stock, .summary .stock").first().attr("class") || "";
    const inStock = /in-stock/.test(stockCls) ? 1 : /out-of-stock/.test(stockCls) ? 0 : null;
    // Tenta ler o tamanho do próprio nome/atributos (raramente presente).
    const { value, unit } = parseSize($("select[name='attribute_apresentacao'] option[value!='']").first().text() || null);
    variations.push({
      size_label: unit ? `${value} ${unit}` : null,
      size_value: value,
      size_unit: unit,
      dilution: null,
      price: parseBRL(priceText) || parseBRL(ld?.offers?.price ?? ld?.offers?.[0]?.price),
      price_regular: null,
      sku: sku && sku !== "N/A" && sku !== "Não aplicável" ? sku : null,
      in_stock: inStock,
      variation_id: null,
    });
  }

  return {
    product_name, cas_raw, brand, odor_desc_raw, note_raw, dosage_raw,
    strength_raw, tenacity_raw, synonyms_raw, tags, attributes, ldjson: ld, variations,
  };
}

const insertOffer = db.prepare(`
  INSERT OR REPLACE INTO offers
    (material_id, source, source_url, product_name, cas_raw, brand,
     size_value, size_unit, dilution, price, currency, sku, in_stock,
     odor_desc_raw, note_raw, dosage_raw, data_json)
  VALUES
    (NULL, ?, ?, ?, ?, ?,
     ?, ?, ?, ?, 'BRL', ?, ?,
     ?, ?, ?, ?)
`);

/** Grava as ofertas de um produto (uma linha por variação). Retorna nº gravado. */
function saveProduct(url: string, p: ParsedProduct): number {
  const name = p.product_name || url;
  let n = 0;
  for (const v of p.variations) {
    const data_json = JSON.stringify({
      variation_id: v.variation_id,
      size_label: v.size_label,
      size_value: v.size_value,
      size_unit: v.size_unit,
      price: v.price,
      price_regular: v.price_regular,
      currency: "BRL",
      sku: v.sku,
      in_stock: v.in_stock,
      brand: p.brand,
      cas: p.cas_raw,
      odor_desc: p.odor_desc_raw,
      note: p.note_raw,
      dosage: p.dosage_raw,
      strength: p.strength_raw,
      tenacity: p.tenacity_raw,
      synonyms: p.synonyms_raw,
      tags: p.tags,
      attributes: p.attributes,
    });
    insertOffer.run(
      SOURCE, url, name, p.cas_raw, p.brand,
      v.size_value, v.size_unit, v.dilution, v.price, v.sku, v.in_stock,
      p.odor_desc_raw, p.note_raw, p.dosage_raw, data_json
    );
    n++;
  }
  return n;
}

/** Raspa uma URL de produto (HTTP puro). Retorna nº de offers gravadas. */
async function scrapeOne(url: string): Promise<number> {
  const res = await httpGet(url);
  if (!res.ok) {
    markError(SOURCE, url, `erro status=${res.status}`);
    console.warn(`[scrape] ERRO ${res.status} ${url}`);
    return 0;
  }
  saveRaw(SOURCE, url, res.text);
  const parsed = parseProduct(res.text);
  const nn = saveProduct(url, parsed);
  markDone(SOURCE, url);
  console.log(`[scrape] OK "${parsed.product_name}" cas=${parsed.cas_raw ?? "-"} (${nn} var.)`);
  return nn;
}

/** Pool de concorrência: processa `pending` com no máx CONCURRENCY simultâneos. */
async function scrape(limit: number): Promise<void> {
  const pending = nextPending(SOURCE, limit);
  console.log(`[scrape] ${pending.length} pendente(s) | concorrência=${CONCURRENCY}`);
  let ok = 0, offersWritten = 0, i = 0;

  async function worker() {
    while (i < pending.length) {
      const { url } = pending[i++];
      await jitter(200, 600); // educado, mas leve (HTTP puro)
      try {
        offersWritten += await scrapeOne(url);
        ok++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        markError(SOURCE, url, msg);
        console.error(`[scrape] EXCEÇÃO ${url} -> ${msg}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`[scrape] concluído: ${ok}/${pending.length} produtos, ${offersWritten} offers.`);
}

// --------------------------------------------------------------------------
// Relatório de verificação
// --------------------------------------------------------------------------

function report(): void {
  const count = (db.prepare("SELECT COUNT(*) n FROM offers WHERE source=?").get(SOURCE) as { n: number }).n;
  console.log(`\n[report] offers (${SOURCE}): ${count}`);
  console.log(`[report] fila:`, queueStats(SOURCE));
  const samples = db
    .prepare(
      "SELECT source_url, product_name, cas_raw, brand, size_value, size_unit, price, currency, sku, in_stock, note_raw, dosage_raw, substr(odor_desc_raw,1,120) odor_desc_raw FROM offers WHERE source=? ORDER BY id DESC LIMIT 3"
    )
    .all(SOURCE);
  console.log(`[report] amostras (${Math.min(3, count)}):`);
  for (const s of samples) console.log(JSON.stringify(s, null, 2));
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

async function main() {
  const arg = process.argv[2];
  const limit = parseInt(process.env.LIMIT || "9999", 10);
  if (!arg || arg === "discover") await discover();
  if (!arg || arg === "scrape") await scrape(limit);
  report();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
