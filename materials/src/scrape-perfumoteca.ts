/**
 * Scraper do fornecedor PERFUMOTECA (source = "perfumoteca").
 * Plataforma "Loja Integrada" (SSR, sem bloqueio de bots).
 *
 * Catálogo é MISTO (perfumes prontos, contratipos, cosméticos). Só nos
 * interessa a categoria "químicos aromáticos", então a descoberta parte da
 * página de categoria paginada (?pagina=N), NÃO do sitemap inteiro.
 *
 * DUAS FASES (resumível via scrape_queue):
 *   1) discover — percorre a categoria, extrai URLs de produto -> enqueue + saveRaw
 *   2) scrape   — cada pendente -> httpGet + saveRaw + parse -> INSERT OR REPLACE offers
 *
 * Uso:
 *   NODE_NO_WARNINGS=1 npx tsx src/scrape-perfumoteca.ts [discover|scrape]
 * Env:
 *   LIMIT (default 5) — nº de produtos raspados na fase scrape (teste)
 *
 * Site é POBRE: só product_name, price, variações de tamanho/peso, sku,
 * in_stock e discount. Sem CAS nem metadados olfativos (cas_raw/odor_desc_raw/
 * note_raw ficam NULL). Não há <script type="application/ld+json">, mas há
 * microdata schema.org/Offer por variação — usamos isso + os blocos de preço.
 */
import * as cheerio from "cheerio";
import { db, enqueue, nextPending, markDone, markError, queueStats } from "./db.js";
import { httpGet, saveRaw, jitter } from "./http.js";

const SOURCE = "perfumoteca";
const BASE = "https://www.perfumoteca.com.br";
const CATEGORY_PATH = "/quimicos-aromaticos";

// --------------------------------------------------------------------------
// Utilitários
// --------------------------------------------------------------------------

/** "R$ 1.234,56" | "284.90" | "13,90" -> 1234.56 (ou null). */
function parseBRL(raw: string | null | undefined): number | null {
  if (!raw) return null;
  let s = raw.replace(/[^\d.,]/g, "").trim();
  if (!s) return null;
  // formato pt-BR "1.234,56": remove separador de milhar '.', vírgula -> ponto
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Extrai valor + unidade de um rótulo de variação como "1000g", "100 ml",
 * "20g", "1 Lt". Normaliza para a unidade do schema (ml | g).
 * Litros -> ml (x1000).
 */
function parseSize(raw: string | null | undefined): { value: number | null; unit: string | null } {
  if (!raw) return { value: null, unit: null };
  const s = raw.toLowerCase().trim();
  const m = s.match(/([\d.,]+)\s*(kg|g|lt|l|ml)\b/);
  if (!m) return { value: null, unit: null };
  let value = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(value)) return { value: null, unit: null };
  let unit = m[2];
  if (unit === "lt" || unit === "l") {
    value = value * 1000;
    unit = "ml";
  } else if (unit === "kg") {
    value = value * 1000;
    unit = "g";
  }
  return { value, unit };
}

/** availability schema.org -> 1 (em estoque) | 0 (esgotado) | null. */
function parseAvailability(url: string | null | undefined): number | null {
  if (!url) return null;
  const s = url.toLowerCase();
  if (/(instock|instoreonly|limitedavailability|preorder|onlineonly)/.test(s)) return 1;
  if (/(outofstock|soldout|discontinued)/.test(s)) return 0;
  return null;
}

// --------------------------------------------------------------------------
// FASE 1 — descoberta (percorre categoria paginada)
// --------------------------------------------------------------------------

/** Extrai URLs de produto de uma página de categoria (só dentro da vitrine). */
function extractProductUrls(html: string): string[] {
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  // A listagem fica em #listagemProdutos; cada item é .listagem-item com
  // um <a class="produto-sobrepor" href="..."> (link "cobertura" do card).
  $("#listagemProdutos .listagem-item a.produto-sobrepor[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (href) urls.add(new URL(href, BASE).toString().split("#")[0]);
  });
  // Fallback: se a estrutura mudar, usa o link do nome do produto.
  if (urls.size === 0) {
    $("#listagemProdutos .listagem-item a.nome-produto[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (href) urls.add(new URL(href, BASE).toString().split("#")[0]);
    });
  }
  return [...urls];
}

/** Descobre o nº total de páginas a partir dos links de paginação. */
function maxPageNumber(html: string): number {
  const $ = cheerio.load(html);
  let max = 1;
  $(".paginacao a, .pagination a, a[href*='pagina=']").each((_, el) => {
    const href = $(el).attr("href") || "";
    const m = href.match(/[?&]pagina=(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return max;
}

async function discover(): Promise<void> {
  console.log(`[discover] categoria ${CATEGORY_PATH}`);
  const firstUrl = BASE + CATEGORY_PATH;
  const first = await httpGet(firstUrl);
  if (!first.ok) {
    console.error(`[discover] falha ao buscar página 1: status ${first.status}`);
    return;
  }
  saveRaw(SOURCE, firstUrl, first.text);

  const totalPages = maxPageNumber(first.text);
  console.log(`[discover] ${totalPages} página(s) de categoria detectada(s)`);

  const allProducts = new Set<string>();
  let newlyQueued = 0;

  const ingest = (html: string) => {
    for (const u of extractProductUrls(html)) {
      const before = allProducts.size;
      allProducts.add(u);
      if (allProducts.size > before) {
        enqueue(SOURCE, u, "product");
        newlyQueued++;
      }
    }
  };

  ingest(first.text);
  console.log(`[discover] página 1: ${allProducts.size} produto(s) acumulado(s)`);

  for (let page = 2; page <= totalPages; page++) {
    const url = `${firstUrl}?pagina=${page}`;
    await jitter(700, 1500);
    const res = await httpGet(url);
    if (!res.ok) {
      console.warn(`[discover] página ${page}: status ${res.status} — pulando`);
      continue;
    }
    saveRaw(SOURCE, url, res.text);
    const before = allProducts.size;
    ingest(res.text);
    console.log(`[discover] página ${page}: +${allProducts.size - before} (total ${allProducts.size})`);
  }

  console.log(`[discover] concluído: ${allProducts.size} produtos únicos, ${newlyQueued} enfileirados (novos).`);
}

// --------------------------------------------------------------------------
// FASE 2 — raspagem de produto
// --------------------------------------------------------------------------

interface VariationOffer {
  size_value: number | null;
  size_unit: string | null;
  size_label: string | null;
  price: number | null;
  price_original: number | null;
  discount_pct: number | null;
  sku: string | null;
  variacao_id: string | null;
  in_stock: number | null;
}

interface ParsedProduct {
  product_name: string | null;
  base_sku: string | null;
  variations: VariationOffer[];
}

function parseProduct(html: string): ParsedProduct {
  const $ = cheerio.load(html);

  const product_name = ($("[itemprop='name']").first().text() || "").trim() || null;
  const base_sku = ($("[itemprop='sku']").first().text() || "").trim() || null;

  // Mapeia rótulo de variação (ex "20g","1 Lt","100 ml") pelo sufixo do SKU
  // (ex "-20g","-1-lt","-100-ml") usando os itens de atributo (grade).
  // data-variacao-nome traz o rótulo humano; data-variacao-id o identificador.
  const labelByVarId = new Map<string, string>();
  $("a.atributo-item[data-variacao-id]").each((_, el) => {
    const id = $(el).attr("data-variacao-id") || "";
    const nome = ($(el).attr("data-variacao-nome") || "").trim();
    if (id && nome) labelByVarId.set(id, nome);
  });

  const variations: VariationOffer[] = [];
  const seen = new Set<string>(); // dedupe por sku (blocos duplicam mobile/desktop)

  // Cada variação vendável é um bloco .acoes-produto cuja classe carrega o
  // SKU completo com sufixo de tamanho (ex "SKU-S85CLV4TQ-20g"). O bloco base
  // "SKU-<base>" (sem sufixo) é o container mestre — ignorado.
  $("div.acoes-produto[data-variacao-id]").each((_, el) => {
    const $b = $(el);
    const cls = $b.attr("class") || "";
    const varId = ($b.attr("data-variacao-id") || "").trim() || null;
    // Ignora o bloco container mestre "SKU-<base>" (data-variacao-id vazio):
    // ele não é uma variação vendável, só um wrapper.
    if (!varId) return;

    // SKU completo a partir da classe SKU-... ou do microdata offers.
    const skuFromClass = (cls.match(/SKU-([A-Za-z0-9-]+)/) || [])[1] || null;
    const skuFromMeta = $b.find("[itemprop='offers'] meta[itemprop='sku']").attr("content") || null;
    const sku = skuFromMeta || skuFromClass;

    // Preço atual (à vista/cartão) e preço "de" (original) do bloco de preço.
    const sell = $b.find("[data-sell-price]").first().attr("data-sell-price");
    const price = parseBRL(sell) ?? parseBRL($b.find(".preco-promocional").first().text());
    const priceOriginal = parseBRL($b.find("s.preco-venda").first().text());

    // Disponibilidade do microdata offers.
    const avail = $b.find("[itemprop='offers'] meta[itemprop='availability']").attr("content");
    let in_stock = parseAvailability(avail);
    // Sinal textual/classe de esgotado como reforço.
    if (in_stock === null && /indispon|esgotad/i.test(cls)) in_stock = 0;

    // Rótulo de tamanho: do mapa de variação ou do sufixo do SKU completo.
    let label: string | null = varId ? labelByVarId.get(varId) ?? null : null;
    if (!label && sku) {
      const suffix = sku.split("-").slice(1).join(" "); // "1-lt" -> "1 lt"
      if (suffix) label = suffix;
    }
    const { value, unit } = parseSize(label);

    const discount_pct =
      price != null && priceOriginal != null && priceOriginal > 0 && priceOriginal > price
        ? Math.round((1 - price / priceOriginal) * 1000) / 10
        : null;

    // Dedupe: chave por sku+tamanho.
    const key = `${sku ?? varId ?? ""}|${value}|${unit}`;
    if (seen.has(key)) return;
    seen.add(key);

    variations.push({
      size_value: value,
      size_unit: unit,
      size_label: label,
      price,
      price_original: priceOriginal,
      discount_pct,
      sku,
      variacao_id: varId,
      in_stock,
    });
  });

  return { product_name, base_sku, variations };
}

const insertOffer = db.prepare(`
  INSERT OR REPLACE INTO offers
    (material_id, source, source_url, product_name, cas_raw, brand,
     size_value, size_unit, price, currency, sku, in_stock,
     odor_desc_raw, note_raw, dosage_raw, data_json)
  VALUES
    (NULL, ?, ?, ?, NULL, NULL,
     ?, ?, ?, 'BRL', ?, ?,
     NULL, NULL, NULL, ?)
`);

/** Grava as ofertas de um produto (uma linha por variação). Retorna nº gravado. */
function saveProduct(url: string, parsed: ParsedProduct): number {
  const name = parsed.product_name || url.replace(BASE + "/", "");
  let n = 0;
  const variations = parsed.variations.length
    ? parsed.variations
    : // produto sem variação detectada -> uma linha "sem tamanho"
      [
        {
          size_value: null,
          size_unit: null,
          size_label: null,
          price: null,
          price_original: null,
          discount_pct: null,
          sku: parsed.base_sku,
          variacao_id: null,
          in_stock: null,
        } as VariationOffer,
      ];

  for (const v of variations) {
    const data_json = JSON.stringify({
      base_sku: parsed.base_sku,
      variacao_id: v.variacao_id,
      size_label: v.size_label,
      size_value: v.size_value,
      size_unit: v.size_unit,
      price: v.price,
      price_original: v.price_original,
      discount_pct: v.discount_pct,
      currency: "BRL",
      sku: v.sku,
      in_stock: v.in_stock,
    });
    insertOffer.run(
      SOURCE,
      url,
      name,
      v.size_value,
      v.size_unit,
      v.price,
      v.sku,
      v.in_stock,
      data_json
    );
    n++;
  }
  return n;
}

async function scrape(limit: number): Promise<void> {
  const pending = nextPending(SOURCE, limit);
  console.log(`[scrape] ${pending.length} produto(s) pendente(s) (LIMIT=${limit})`);
  let ok = 0;
  let offersWritten = 0;

  for (const { url } of pending) {
    await jitter(700, 1500);
    try {
      const res = await httpGet(url);
      if (!res.ok) {
        markError(SOURCE, url, `HTTP ${res.status}`);
        console.warn(`[scrape] ERRO ${url} -> HTTP ${res.status}`);
        continue;
      }
      saveRaw(SOURCE, url, res.text);
      const parsed = parseProduct(res.text);
      const n = saveProduct(url, parsed);
      markDone(SOURCE, url);
      ok++;
      offersWritten += n;
      console.log(
        `[scrape] OK ${url} -> "${parsed.product_name}" (${n} variação/ões)`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      markError(SOURCE, url, msg);
      console.error(`[scrape] EXCEÇÃO ${url} -> ${msg}`);
    }
  }
  console.log(`[scrape] concluído: ${ok}/${pending.length} produtos, ${offersWritten} offers gravadas.`);
}

// --------------------------------------------------------------------------
// Relatório rápido de verificação
// --------------------------------------------------------------------------

function report(): void {
  const count = (db.prepare("SELECT COUNT(*) n FROM offers WHERE source=?").get(SOURCE) as { n: number }).n;
  console.log(`\n[report] offers (${SOURCE}): ${count}`);
  console.log(`[report] fila:`, queueStats(SOURCE));
  const samples = db
    .prepare(
      "SELECT source_url, product_name, size_value, size_unit, price, sku, in_stock, data_json FROM offers WHERE source=? ORDER BY id DESC LIMIT 3"
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
  const limit = parseInt(process.env.LIMIT || "5", 10);

  if (!arg || arg === "discover") await discover();
  if (!arg || arg === "scrape") await scrape(limit);
  report();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
