/**
 * Scraper do fornecedor FLAVORIST (https://flavorist.com.br) — Nuvemshop, SSR.
 * source = "flavorist". Resumível via scrape_queue.
 *
 * Uso:
 *   NODE_NO_WARNINGS=1 npx tsx src/scrape-flavorist.ts            # discover + scrape
 *   NODE_NO_WARNINGS=1 npx tsx src/scrape-flavorist.ts discover   # só fase 1
 *   NODE_NO_WARNINGS=1 npx tsx src/scrape-flavorist.ts scrape     # só fase 2
 *
 * Env:
 *   LIMIT=5   # quantos produtos raspar na fase 2 (default 5). discover roda completo.
 *
 * DUAS FASES:
 *  1) DESCOBRIR: percorre /quimicos-aromaticos/page/N/ e enfileira todas as URLs
 *     /produtos/<slug>/ (químicos aromáticos). Salva o HTML das páginas de índice.
 *  2) RASPAR: para cada URL pendente, httpGet + saveRaw + parse. Insere UMA LINHA
 *     POR VARIAÇÃO DE TAMANHO em offers (INSERT OR REPLACE respeitando o UNIQUE).
 *
 * Fonte de verdade da página de produto (Nuvemshop):
 *  - o atributo `data-variants` carrega um JSON com as variações reais do produto
 *    atual (option0 = tamanho, price_number, id = sku, available, stock);
 *  - JSON-LD Product presente na página refere-se a produtos RELACIONADOS
 *    (carrossel), não ao produto atual — por isso NÃO é usado como fonte de preço.
 *  - título vem do <h1> (fallback og:title); o CAS costuma vir no título.
 *  - a descrição fica no <div class="... user-content ...">, com campos rotulados
 *    (Família, Classificação Olfativa, Perfil Olfativo, Diretrizes de Uso, Fixação…).
 */
import * as cheerio from "cheerio";
import { enqueue, nextPending, markDone, markError, db, queueStats } from "./db.js";
import { httpGet, saveRaw, jitter } from "./http.js";
import { extractCas } from "./normalize.js";

const SOURCE = "flavorist";
const BASE = "https://flavorist.com.br";
// Categorias raspadas: químicos aromáticos + bases e accords (acordes/bases prontos).
const CATEGORIES = [`${BASE}/quimicos-aromaticos/`, `${BASE}/bases-e-accords/`];
const LIMIT = Number(process.env.LIMIT ?? 5);

// ---------------------------------------------------------------------------
// FASE 1 — DESCOBRIR
// ---------------------------------------------------------------------------

/** Extrai URLs /produtos/<slug>/ de uma página de índice (categoria). */
function extractProductUrls(html: string): string[] {
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $('a[href*="/produtos/"]').each((_, el) => {
    let href = $(el).attr("href") || "";
    if (!href) return;
    if (href.startsWith("/")) href = BASE + href;
    if (!href.startsWith("http")) return;
    // normaliza: remove query/hash e garante barra final
    href = href.split("#")[0].split("?")[0];
    const m = href.match(/^https?:\/\/flavorist\.com\.br\/produtos\/([^/]+)\/?$/i);
    if (!m) return; // ignora /produtos/ (índice) e coisas fora do padrão
    urls.add(`${BASE}/produtos/${m[1]}/`);
  });
  return [...urls];
}

async function discover(): Promise<number> {
  let enqueued = 0;
  const seen = new Set<string>();
  for (const category of CATEGORIES) {
    console.log(`[discover] percorrendo categoria ${category}…`);
    // percorre página a página; para quando uma página não trouxer produtos novos.
    for (let page = 1; page <= 50; page++) {
      const url = page === 1 ? category : `${category}page/${page}/`;
      const res = await httpGet(url);
      if (!res.ok) {
        console.log(`[discover] page ${page} -> HTTP ${res.status}; encerrando categoria.`);
        break;
      }
      saveRaw(SOURCE, url, res.text);
      const urls = extractProductUrls(res.text);
      const fresh = urls.filter((u) => !seen.has(u));
      if (fresh.length === 0) {
        console.log(`[discover] page ${page}: 0 produtos novos; fim da paginação.`);
        break;
      }
      for (const u of fresh) {
        seen.add(u);
        enqueue(SOURCE, u, "product");
        enqueued++;
      }
      console.log(`[discover] page ${page}: ${fresh.length} produtos (total ${seen.size}).`);
      await jitter(700, 1500);
    }
  }
  console.log(`[discover] concluído: ${enqueued} URLs enfileiradas (${seen.size} únicas).`);
  return enqueued;
}

// ---------------------------------------------------------------------------
// FASE 2 — RASPAR
// ---------------------------------------------------------------------------

interface Variant {
  size_value: number | null;
  size_unit: string | null;
  price: number | null;
  sku: string | null;
  in_stock: number | null;
  option_raw: string | null;
}

/** "100ML" -> {value:100, unit:"ml"}; "1000ml" -> {1000,"ml"}; "250 g" -> {250,"g"} */
function parseSize(raw: string | null | undefined): { value: number | null; unit: string | null } {
  if (!raw) return { value: null, unit: null };
  const m = String(raw).replace(",", ".").match(/(\d+(?:\.\d+)?)\s*(ml|l|g|kg|mg)/i);
  if (!m) return { value: null, unit: null };
  let value = parseFloat(m[1]);
  let unit = m[2].toLowerCase();
  if (unit === "l") { value *= 1000; unit = "ml"; }
  if (unit === "kg") { value *= 1000; unit = "g"; }
  if (unit === "mg") { value /= 1000; unit = "g"; }
  return { value, unit };
}

/** Extrai as variações reais do produto atual a partir do atributo data-variants. */
function parseVariants($: cheerio.CheerioAPI): Variant[] {
  const raw = $("[data-variants]").first().attr("data-variants");
  if (!raw) return [];
  let arr: any[];
  try {
    arr = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  const out: Variant[] = [];
  for (const v of arr) {
    if (v?.is_visible === false) continue;
    const opt = [v?.option0, v?.option1, v?.option2].filter(Boolean).join(" ");
    const { value, unit } = parseSize(opt);
    const price =
      typeof v?.price_number === "number"
        ? v.price_number
        : v?.price_number != null
        ? Number(v.price_number)
        : null;
    out.push({
      size_value: value,
      size_unit: unit,
      price: Number.isFinite(price as number) ? (price as number) : null,
      sku: v?.sku != null ? String(v.sku) : v?.id != null ? String(v.id) : null,
      in_stock: v?.available === true ? 1 : v?.available === false ? 0 : null,
      option_raw: opt || null,
    });
  }
  return out;
}

/**
 * Texto da descrição do produto (div.user-content), com QUEBRA DE LINHA nas
 * fronteiras de blocos (<p>, <br>, <li>, <h*>, <div>). Nuvemshop remove o
 * espaço entre blocos, o que "cola" palavras (ex.: "AmadeiradaNome"); por isso
 * inserimos "\n" antes de extrair o texto — assim cada campo rotulado fica em
 * sua própria linha e o parsing por rótulo funciona de forma confiável.
 */
function descriptionText($: cheerio.CheerioAPI): string {
  const el = $(".user-content").first();
  const node = el.length ? el : $(".js-product-description").first();
  if (!node.length) return "";
  const $sub = cheerio.load(node.html() || "");
  $sub("br").replaceWith("\n");
  $sub("p, li, h1, h2, h3, h4, h5, h6, div, tr, section").each((_, e) => {
    $sub(e).append("\n");
  });
  return $sub
    .root()
    .text()
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n[ \n]*/g, "\n")
    .trim();
}

/**
 * Extrai o valor de um campo rotulado da descrição, ex.:
 *   "Família: Almiscarada", "Família olfativa: Floral rosado, verde".
 * Aceita várias grafias de rótulo; corta no próximo rótulo conhecido/pontuação.
 */
function labeledField(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const re = new RegExp(
      "(?:^|\\n)\\s*" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*:\\s*([^\\n]+)",
      "i"
    );
    const m = text.match(re);
    if (m && m[1]) {
      const val = m[1].trim().replace(/\s+/g, " ").replace(/[.;,]+$/, "").trim();
      if (val && val.length <= 200) return val;
    }
  }
  return null;
}

// Rótulos que marcam início de uma NOVA seção (para saber onde uma seção termina).
const SECTION_HEADINGS = [
  "Perfil Olfativo", "Descrição Olfativa", "Descricao Olfativa", "Descrição", "Descricao",
  "Aplicações", "Aplicacoes", "Função na Formulação", "Funcao na Formulacao", "Função na fórmula", "Funcao na formula",
  "Diretrizes de Uso", "Propriedades Físicas", "Propriedades Fisicas", "Propriedades",
  "Regulatório", "Regulatorio", "Observação Técnica", "Observacao Tecnica", "Observação", "Sinônimos", "Sinonimos",
];

/**
 * Extrai o conteúdo de uma SEÇÃO cujo título fica sozinho numa linha (sem ":"),
 * com o texto nas linhas seguintes (ex.: "Perfil Olfativo\n<parágrafo>").
 * Coleta até encontrar o próximo título de seção conhecido. `maxLines` limita.
 */
function sectionField(text: string, headings: string[], maxLines = 4): string | null {
  const lines = text.split("\n");
  const isHeading = (l: string) =>
    SECTION_HEADINGS.some((h) => l.trim().toLowerCase() === h.toLowerCase());
  for (const heading of headings) {
    const idx = lines.findIndex((l) => l.trim().toLowerCase() === heading.toLowerCase());
    if (idx === -1) continue;
    const out: string[] = [];
    for (let i = idx + 1; i < lines.length && out.length < maxLines; i++) {
      const l = lines[i].trim();
      if (!l) continue;
      if (isHeading(l)) break;
      out.push(l);
    }
    const val = out.join(" ").replace(/\s+/g, " ").trim();
    if (val) return val.slice(0, 600);
  }
  return null;
}

interface ParsedProduct {
  product_name: string;
  cas_raw: string | null;
  odor_desc_raw: string | null;
  note_raw: string | null;
  dosage_raw: string | null;
  tenacity_raw: string | null;
  family_raw: string | null;
  intensity_raw: string | null;
  inci_raw: string | null;
  iupac_raw: string | null;
  description_full: string;
  variants: Variant[];
}

function parseProduct(html: string): ParsedProduct {
  const $ = cheerio.load(html);
  const h1 = $("h1").first().text().trim();
  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim() || "";
  const product_name = h1 || ogTitle;

  const desc = descriptionText($);
  const cas_raw = extractCas(product_name) || extractCas(desc);

  const family_raw = labeledField(desc, ["Família olfativa", "Família", "Familia olfativa", "Familia"]);
  const note_class =
    labeledField(desc, ["Classificação Olfativa", "Classificacao Olfativa"]) ||
    labeledField(desc, ["Nota típica", "Nota tipica", "Tipo de nota"]);
  // note_raw combina classificação/nota + família (é a "nota/família como o site diz")
  const note_raw = [note_class, family_raw].filter(Boolean).join(" — ") || null;

  const odor_desc_raw =
    labeledField(desc, ["Perfil Olfativo", "Descrição Olfativa", "Descricao Olfativa", "Acordes principais"]) ||
    sectionField(desc, ["Perfil Olfativo", "Descrição Olfativa", "Descricao Olfativa"], 3) ||
    ($('meta[name="description"]').attr("content")?.trim() || null);

  const dosage_raw =
    labeledField(desc, ["Uso típico", "Uso tipico", "Dosagem", "Concentração de uso", "Concentracao de uso"]) ||
    sectionField(desc, ["Diretrizes de Uso"], 2) ||
    (desc.match(/(\d+(?:[.,]\d+)?\s*%\s*(?:a|até|-)\s*\d+(?:[.,]\d+)?\s*%)/i)?.[1] ?? null);

  const tenacity_raw =
    labeledField(desc, ["Fixação", "Fixacao", "Tenacidade", "Persistência", "Persistencia"]) ||
    (desc.match(/([><]?\s*\d+\s*horas?[^.]*?blotter)/i)?.[1] ?? null);

  const intensity_raw = labeledField(desc, ["Intensidade", "Força olfativa", "Forca olfativa"]);
  const inci_raw = labeledField(desc, ["Nome INCI", "INCI"]);
  const iupac_raw = labeledField(desc, ["Nome IUPAC", "IUPAC"]);

  return {
    product_name,
    cas_raw,
    odor_desc_raw,
    note_raw,
    dosage_raw,
    tenacity_raw,
    family_raw,
    intensity_raw,
    inci_raw,
    iupac_raw,
    description_full: desc,
    variants: parseVariants($),
  };
}

const insertOffer = db.prepare(`
  INSERT OR REPLACE INTO offers
    (material_id, source, source_url, product_name, cas_raw, brand,
     size_value, size_unit, price, currency, sku, in_stock,
     odor_desc_raw, note_raw, dosage_raw, data_json, scraped_at)
  VALUES
    (NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'BRL', ?, ?, ?, ?, ?, ?, datetime('now'))
`);

function saveProduct(url: string, p: ParsedProduct): number {
  // data_json: TUDO que extraímos (por variação incluída também via variants[])
  const dataBase = {
    product_name: p.product_name,
    cas_raw: p.cas_raw,
    family_raw: p.family_raw,
    note_raw: p.note_raw,
    odor_desc_raw: p.odor_desc_raw,
    dosage_raw: p.dosage_raw,
    tenacity_raw: p.tenacity_raw,
    intensity_raw: p.intensity_raw,
    inci_raw: p.inci_raw,
    iupac_raw: p.iupac_raw,
    description_full: p.description_full,
    variants: p.variants,
  };

  let rows = 0;
  const variants = p.variants.length ? p.variants : [
    { size_value: null, size_unit: null, price: null, sku: null, in_stock: null, option_raw: null } as Variant,
  ];
  for (const v of variants) {
    const data_json = JSON.stringify({ ...dataBase, this_variant: v });
    insertOffer.run(
      SOURCE,
      url,
      p.product_name,
      p.cas_raw,
      "FLAVORIST",
      v.size_value,
      v.size_unit,
      v.price,
      v.sku,
      v.in_stock,
      p.odor_desc_raw,
      p.note_raw,
      p.dosage_raw,
      data_json
    );
    rows++;
  }
  return rows;
}

async function scrape(limit: number): Promise<number> {
  const pending = nextPending(SOURCE, limit);
  console.log(`[scrape] ${pending.length} produtos pendentes (limite ${limit}).`);
  let totalOffers = 0;
  for (const { url } of pending) {
    try {
      const res = await httpGet(url);
      if (!res.ok) {
        markError(SOURCE, url, `HTTP ${res.status}`);
        console.log(`[scrape] ERRO ${url} -> HTTP ${res.status}`);
        await jitter(700, 1500);
        continue;
      }
      saveRaw(SOURCE, url, res.text);
      const p = parseProduct(res.text);
      if (!p.product_name) {
        markError(SOURCE, url, "sem product_name (h1/og:title)");
        console.log(`[scrape] ERRO ${url} -> sem título`);
        await jitter(700, 1500);
        continue;
      }
      const n = saveProduct(url, p);
      totalOffers += n;
      markDone(SOURCE, url);
      console.log(`[scrape] OK ${url} -> ${n} variação(ões) | CAS ${p.cas_raw ?? "-"}`);
    } catch (e: any) {
      markError(SOURCE, url, String(e?.message ?? e));
      console.log(`[scrape] ERRO ${url} -> ${e?.message ?? e}`);
    }
    await jitter(700, 1500);
  }
  console.log(`[scrape] concluído: ${totalOffers} linhas de offer gravadas.`);
  return totalOffers;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
async function main() {
  const arg = (process.argv[2] || "").toLowerCase();
  const doDiscover = arg === "" || arg === "discover";
  const doScrape = arg === "" || arg === "scrape";

  if (doDiscover) await discover();
  if (doScrape) await scrape(LIMIT);

  console.log("\n=== FILA (flavorist) ===");
  console.table(queueStats(SOURCE));
  const n = (db.prepare("SELECT COUNT(*) n FROM offers WHERE source=?").get(SOURCE) as { n: number }).n;
  console.log(`offers (flavorist): ${n}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
