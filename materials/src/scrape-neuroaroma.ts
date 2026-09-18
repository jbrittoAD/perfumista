/**
 * Scraper do fornecedor NEUROAROMA (source = "neuroaroma").
 * Plataforma Nuvemshop/Tiendanube (SSR + dados do produto em JS embutido).
 *
 * POR QUE SÓ UMA PARTE DO CATÁLOGO: a loja é majoritariamente de FRAGRÂNCIAS
 * INSPIRADAS (72 das 127 URLs do sitemap são "fragrancia-inspirada-em-X"), que
 * não entram neste projeto — o app é de matéria-prima, não de contratipo. Só
 * interessa a prateleira de químicos isolados e os diluentes.
 *
 * DESCOBERTA em duas fontes, porque a categorização da loja é incompleta:
 *   1) a categoria /quimicos-aromaticos/ (classificação da própria loja);
 *   2) uma lista explícita de slugs de químicos/solventes que existem no
 *      sitemap mas ficaram fora da categoria (os aldeídos C12, etil maltol,
 *      DPG, IPM...).
 * Tudo que casar com FRAGRANCE_RE é descartado nas duas fontes — inclusive
 * dentro da categoria de químicos, onde havia um contratipo fora do lugar.
 *
 * O produto vem em `LS.variants`, um array JSON com preço, tamanho (option0),
 * estoque e sku. Não há CAS nem descrição olfativa estruturada.
 *
 * Uso:
 *   NODE_NO_WARNINGS=1 npx tsx src/scrape-neuroaroma.ts [discover|scrape]
 * Env:
 *   LIMIT (default 5) — nº de produtos raspados na fase scrape
 *
 * robots.txt (Nuvemshop): bloqueia /admin, /checkout, /search e afins;
 * páginas de produto e categoria são liberadas para User-agent: *.
 */
import * as cheerio from "cheerio";
import { db, enqueue, nextPending, markDone, markError, queueStats } from "./db.js";
import { httpGet, saveRaw, jitter } from "./http.js";

const SOURCE = "neuroaroma";
const BASE = "https://neuroaroma.com.br";
const CATEGORY_PATH = "/quimicos-aromaticos";

/** Contratipo / essência pronta — fora do escopo do projeto. */
const FRAGRANCE_RE =
  /(fragrancia|fragr[âa]ncia|essencia|ess[êe]ncia|inspirad|contratipo|perfume-capilar|aromatizante)/i;

/**
 * Químicos e diluentes que existem no sitemap mas não aparecem na categoria.
 * Lista explícita (e não varredura do sitemap) para que nenhuma fragrância
 * entre por acidente quando a loja publicar produto novo.
 */
const EXTRA_SLUGS = [
  "aldeido-c12-laurico-dodecanal",
  "aldeido-c12-mna",
  "etil-maltol",
  "dpg-dipropilenoglicol",
  "miristato-de-isopropila-ipm",
  "propilenoglicol-usp",
  "propanodiol",
  "polisorbato-20",
  "alcool-de-cereais-cerealcool-5-lt-1wm6b",
];

// --------------------------------------------------------------------------
// Utilitários
// --------------------------------------------------------------------------

/** "50 gramas" | "100ml" | "1 Lt" -> { value, unit } normalizado em g|ml. */
function parseSize(raw: string | null | undefined): { value: number | null; unit: string | null } {
  if (!raw) return { value: null, unit: null };
  const s = raw.toLowerCase().trim();
  const m = s.match(/([\d.,]+)\s*(kg|quilos?|gramas?|g|lt|litros?|l|ml|mililitros?)\b/);
  if (!m) return { value: null, unit: null };
  let value = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(value)) return { value: null, unit: null };
  let unit = m[2];
  if (/^(lt|l|litros?)$/.test(unit)) {
    value *= 1000;
    unit = "ml";
  } else if (/^(kg|quilos?)$/.test(unit)) {
    value *= 1000;
    unit = "g";
  } else if (/^(gramas?|g)$/.test(unit)) {
    unit = "g";
  } else {
    unit = "ml";
  }
  return { value, unit };
}

/** Diluição declarada no nome ("Galaxolide 50% DEP") — o preço/g depende disso. */
function parseDilution(name: string): string | null {
  const m = name.match(/(\d{1,3}(?:[.,]\d+)?)\s*%\s*(?:em\s+)?(dpg|dep|ipm|tec|mct|bb|dowanol)?/i);
  if (!m) return null;
  const pct = parseFloat(m[1].replace(",", "."));
  if (!(pct > 0 && pct < 100)) return null;
  return m[2] ? `${m[1]}% ${m[2].toUpperCase()}` : `${m[1]}%`;
}

interface Variant {
  price_number?: number | null;
  option0?: string | null;
  sku?: string | null;
  available?: boolean;
  stock?: number | null;
}

/** Extrai `LS.variants = [...]` do HTML da página de produto. */
function parseVariants(html: string): Variant[] {
  const i = html.indexOf("LS.variants");
  if (i < 0) return [];
  const start = html.indexOf("[", i);
  if (start < 0) return [];
  // varre equilibrando colchetes, ignorando os que estão dentro de string
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let j = start; j < html.length; j++) {
    const ch = html[j];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, j + 1)) as Variant[];
        } catch {
          return [];
        }
      }
    }
  }
  return [];
}

/** Nome do produto: `LS.product.name` traz escapes \uXXXX. */
function parseName(html: string): string | null {
  const m = html.match(/LS\.product\s*=\s*\{[\s\S]{0,400}?name\s*:\s*'([^']*)'/);
  if (m) {
    try {
      return JSON.parse(`"${m[1]}"`);
    } catch {
      return m[1];
    }
  }
  const $ = cheerio.load(html);
  const t = $("title").text().split(/[:|]/)[0].trim();
  return t || null;
}

// --------------------------------------------------------------------------
// FASE 1 — descoberta
// --------------------------------------------------------------------------

function extractProductUrls(html: string): string[] {
  const urls = new Set<string>();
  const re = /href="(?:https:\/\/neuroaroma\.com\.br)?(\/produtos\/[a-z0-9-]+)\/?"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (FRAGRANCE_RE.test(m[1])) continue;   // contratipo dentro da categoria
    urls.add(`${BASE}${m[1]}/`);
  }
  return [...urls];
}

async function discover() {
  console.log(`[${SOURCE}] descoberta — categoria ${CATEGORY_PATH}`);
  let found = 0;

  for (let page = 1; page <= 10; page++) {
    const url = page === 1 ? `${BASE}${CATEGORY_PATH}/` : `${BASE}${CATEGORY_PATH}/?page=${page}`;
    const res = await httpGet(url);
    if (!res.ok) break;
    saveRaw(SOURCE, url, res.text);
    const urls = extractProductUrls(res.text);
    if (urls.length === 0) break;
    for (const u of urls) {
      enqueue(SOURCE, u);
      found++;
    }
    console.log(`  página ${page}: ${urls.length} produtos`);
    if (urls.length < 12) break;             // última página
    await jitter(700, 1400);
  }

  for (const slug of EXTRA_SLUGS) {
    enqueue(SOURCE, `${BASE}/produtos/${slug}/`);
    found++;
  }
  console.log(`[${SOURCE}] ${found} URLs na fila (inclui ${EXTRA_SLUGS.length} fora da categoria)`);
}

// --------------------------------------------------------------------------
// FASE 2 — raspagem
// --------------------------------------------------------------------------

const insertOffer = db.prepare(`
  INSERT OR REPLACE INTO offers
    (material_id, source, source_url, product_name, cas_raw, brand,
     size_value, size_unit, dilution, price, currency, sku, in_stock,
     odor_desc_raw, note_raw, dosage_raw, data_json)
  VALUES
    (NULL, ?, ?, ?, NULL, ?,
     ?, ?, ?, ?, 'BRL', ?, ?,
     NULL, NULL, NULL, ?)
`);

async function scrape(limit: number) {
  let done = 0;
  while (done < limit) {
    const [next] = nextPending(SOURCE, 1);
    if (!next) break;

    const res = await httpGet(next.url);
    if (!res.ok) {
      markError(SOURCE, next.url, `HTTP ${res.status}`);
      continue;
    }
    saveRaw(SOURCE, next.url, res.text);

    const name = parseName(res.text);
    if (!name) {
      markError(SOURCE, next.url, "sem nome de produto");
      continue;
    }
    if (FRAGRANCE_RE.test(name)) {
      // chegou aqui por link de categoria: descarta sem gravar oferta
      markDone(SOURCE, next.url);
      console.log(`  – ignorado (fragrância): ${name}`);
      continue;
    }

    const variants = parseVariants(res.text);
    const dilution = parseDilution(name);
    let n = 0;
    for (const v of variants) {
      // Variação sem preço = produto esgotado. Grava mesmo assim, com price
      // NULL e in_stock 0: registra que a loja TEM o material, só que sem
      // estoque agora. O cálculo de preço/g ignora oferta sem preço, então
      // isso não contamina a comparação.
      const { value, unit } = parseSize(v.option0);
      insertOffer.run(
        SOURCE,
        next.url,
        name,
        "NeuroAroma",
        value,
        unit,
        dilution,
        v.price_number ?? null,
        v.sku ?? null,
        v.price_number == null || v.available === false ? 0 : 1,
        JSON.stringify({ option0: v.option0 ?? null, stock: v.stock ?? null })
      );
      n++;
    }

    markDone(SOURCE, next.url);
    done++;
    console.log(`  ✓ ${name} — ${n} variação(ões)`);
    await jitter(900, 1800);
  }
  console.log(`[${SOURCE}] ${done} produtos raspados`);
}

function report() {
  const q = queueStats(SOURCE);
  const offers = db
    .prepare("SELECT COUNT(*) c, COUNT(DISTINCT source_url) p FROM offers WHERE source=?")
    .get(SOURCE) as { c: number; p: number };
  console.log(`[${SOURCE}] fila: ${JSON.stringify(q)} | ofertas: ${offers.c} em ${offers.p} produtos`);
}

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
