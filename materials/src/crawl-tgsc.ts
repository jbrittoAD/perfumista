/**
 * crawl-tgsc.ts — pipeline de DADOS TÉCNICOS a partir do The Good Scents Company.
 *
 * TGSC (http://www.thegoodscentscompany.com/) é SSR estático (.html), com
 * tabelas key/value e sem JS. Os índices alfabéticos de "Aromatic Ingredients"
 * (rawmatex-a.html ... rawmatex-z.html) enumeram os materiais e linkam suas
 * páginas de dados (/data/rw*.html).
 *
 * Fases:
 *   DESCOBRIR  -> percorre os índices, extrai links /data/rw*.html + nome + CAS,
 *                 enfileira ('tgsc', urlAbsoluta, 'material') e salva o HTML cru.
 *   RASPAR     -> para cada material pendente: httpGet + saveRaw + parse da tabela,
 *                 e faz UPSERT em materials chaveado por CAS.
 *
 * Rodar: NODE_NO_WARNINGS=1 npx tsx src/crawl-tgsc.ts
 * Teste: só o índice A e LIMIT (default 5) materiais.
 */
import * as cheerio from "cheerio";
import { db, enqueue, nextPending, markDone, markError } from "./db.js";
import { httpGet, saveRaw, jitter } from "./http.js";
import { normalizeName, extractCas, normalizeStrength } from "./normalize.js";

const SOURCE = "tgsc";
const BASE = "https://www.thegoodscentscompany.com";
const LIMIT = Number(process.env.LIMIT ?? 5);

// Índices alfabéticos. Teste = só "a"; produção = todo o alfabeto.
const ALL_INDEXES = [
  "a", "b", "c", "d", "e", "f", "g", "h", "i", "jk", "l", "m",
  "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
].map((l) => `${BASE}/rawmatex-${l}.html`);

const TEST = process.env.TGSC_FULL !== "1";
const INDEXES = TEST ? [`${BASE}/rawmatex-a.html`] : ALL_INDEXES;

// -------------------------------------------------------------------------
// Helpers de parse
// -------------------------------------------------------------------------

/** Resolve href/relativo -> URL absoluta no domínio TGSC. */
function abs(path: string): string {
  if (path.startsWith("http")) return path;
  return path.startsWith("/") ? BASE + path : `${BASE}/${path}`;
}

/** Primeiro número REAL de um texto (ex "194.00 to 197.00" -> 194). */
function firstNumber(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = text.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

/** Menor número de um texto (ex "194-197 °C" / "194.00 to 197.00" -> 194). */
function minNumber(text: string | null | undefined): number | null {
  if (!text) return null;
  const nums = (text.replace(/,/g, "").match(/-?\d+(\.\d+)?/g) ?? [])
    .map(Number)
    .filter((n) => Number.isFinite(n));
  return nums.length ? Math.min(...nums) : null;
}

// -------------------------------------------------------------------------
// FASE DESCOBRIR
// -------------------------------------------------------------------------

interface Discovered { url: string; name: string; cas: string | null }

/** Extrai (url, nome, cas) dos links de material de uma página de índice. */
function parseIndex(html: string): Discovered[] {
  const $ = cheerio.load(html);
  const out: Discovered[] = [];
  const seen = new Set<string>();

  $("tr").each((_, tr) => {
    const $tr = $(tr);
    // link é <a href="#" onclick="openMainWindow('/data/rwNNN.html');...">nome</a>
    const $a = $tr.find("a[onclick*='openMainWindow']").first();
    if (!$a.length) return;
    const onclick = $a.attr("onclick") ?? "";
    const m = onclick.match(/openMainWindow\((?:'|")([^'"]+)(?:'|")\)/);
    if (!m) return;
    const path = m[1];
    if (!/\/data\/rw\d+\.html/i.test(path)) return;
    const url = abs(path);
    if (seen.has(url)) return;
    seen.add(url);

    // prefixo químico opcional (ex "(Z)-") vem num <div class="chtols"> antes do <a>
    const prefix = $tr.find("div.chtols").first().text().trim();
    const core = $a.text().trim();
    const name = (prefix ? `${prefix}${core}` : core).replace(/\s+/g, " ").trim();

    // CAS aparece no texto da célula como "CAS: 78-70-6"
    const cellText = $tr.text();
    const cas = extractCas(cellText);

    if (name) out.push({ url, name, cas });
  });

  return out;
}

async function discover(): Promise<number> {
  let total = 0;
  for (const idx of INDEXES) {
    const res = await httpGet(idx);
    if (!res.ok) {
      console.warn(`  índice falhou (${res.status}): ${idx}`);
      continue;
    }
    saveRaw(SOURCE, idx, res.text);
    const items = parseIndex(res.text);
    for (const it of items) enqueue(SOURCE, it.url, "material");
    total += items.length;
    console.log(`  índice ${idx.split("/").pop()}: ${items.length} materiais enfileirados`);
    await jitter(1000, 2000);
  }
  return total;
}

// -------------------------------------------------------------------------
// FASE RASPAR
// -------------------------------------------------------------------------

interface MatData {
  name: string | null;
  cas: string | null;
  odor_family: string | null;
  odor_strength_raw: string | null;
  odor_description: string | null;
  molecular_weight: number | null;
  molecular_formula: string | null;
  boiling_point_c: number | null;
  vapor_pressure: number | null;
  logp: number | null;
  synonyms: string[];
  raw: Record<string, string>; // tabela crua key->value
}

/**
 * Parse de uma página /data/rw*.html.
 * Estrutura: <table class="cheminfo"> com <tr><td label:value</td></tr>
 * ou <tr><td>label:</td><td>value</td></tr>. Rótulos variam de cell-única
 * (Odor Type: X) a duas células (Molecular Weight: | valor).
 */
function parseMaterial(html: string): MatData {
  const $ = cheerio.load(html);
  const raw: Record<string, string> = {};

  // nome canônico: <h1 itemprop="name"> ou <title> "nome, cas"
  let name =
    $("h1 [itemprop='name']").first().text().trim() ||
    $("h1").first().text().trim() ||
    null;
  if (!name) {
    const title = $("title").text().trim();
    name = title ? title.split(",")[0].trim() : null;
  }

  // Percorre todas as linhas das tabelas cheminfo capturando pares label/valor.
  $("table.cheminfo tr").each((_, tr) => {
    const tds = $(tr).find("td").toArray();
    if (!tds.length) return;

    if (tds.length >= 2) {
      // duas células: label: | valor
      const label = $(tds[0]).text().replace(/:\s*$/, "").trim();
      const value = $(tds[1]).text().replace(/\s+/g, " ").trim();
      if (label && value && !(label in raw)) raw[label] = value;
    } else {
      // célula única com "label: valor" ou "label:<span>valor</span>"
      const $td = $(tds[0]);
      const full = $td.text().replace(/\s+/g, " ").trim();
      const colon = full.indexOf(":");
      if (colon > 0) {
        const label = full.slice(0, colon).trim();
        const value = full.slice(colon + 1).trim();
        if (label && value && !(label in raw)) raw[label] = value;
      }
    }
  });

  // ---- odor family / strength / description ----
  const odor_family = raw["Odor Type"] ?? null;
  const odor_strength_raw = raw["Odor Strength"] ?? null;
  // description: raw["Odor Description"] costuma vir "at 100.00 %. <texto>"; limpa o prefixo de %
  let odor_description: string | null = raw["Odor Description"] ?? null;
  if (odor_description) {
    odor_description = odor_description
      .replace(/^at\s+[\d.]+\s*%\.?\s*/i, "")
      .trim() || null;
  }

  // ---- propriedades físico-químicas ----
  const molecular_weight = firstNumber(raw["Molecular Weight"]);
  const molecular_formula =
    (raw["Formula"] ?? raw["Molecular Formula"] ?? "").replace(/\s+/g, "") || null;
  // Boiling Point: pode haver vários (@ pressões diferentes). Pega o menor número.
  const boiling_point_c = minNumber(raw["Boiling Point"]);
  const vapor_pressure = firstNumber(raw["Vapor Pressure"]);
  const logp = firstNumber(raw["logP (o/w)"] ?? raw["logP"] ?? raw["LogP"]);

  // ---- CAS: da tabela ("CAS Number") ou do título ----
  const cas =
    extractCas(raw["CAS Number"]) ??
    extractCas($("title").text()) ??
    extractCas(html.slice(0, 4000));

  // ---- sinônimos: <div class="sectionclass">Synonyms:</div> + table.cheminfo td.wrd8 ----
  const synonyms: string[] = [];
  $("div.sectionclass").each((_, div) => {
    if (!/synonym/i.test($(div).text())) return;
    const $table = $(div).nextAll("table.cheminfo").first();
    $table.find("td.wrd8").each((__, td) => {
      const syn = $(td).text().replace(/\s+/g, " ").trim();
      if (syn && syn.length > 1) synonyms.push(syn);
    });
  });

  return {
    name,
    cas,
    odor_family,
    odor_strength_raw,
    odor_description,
    molecular_weight,
    molecular_formula,
    boiling_point_c,
    vapor_pressure,
    logp,
    synonyms,
    raw,
  };
}

/** Insere sinônimos (nome + lista) para um material, sem duplicar (norm). */
function saveSynonyms(materialId: number, names: string[]) {
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO material_synonyms(material_id, synonym, synonym_norm, source)
     VALUES (?, ?, ?, 'tgsc')`
  );
  const seen = new Set<string>();
  for (const n of names) {
    const norm = normalizeName(n);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    stmt.run(materialId, n, norm);
  }
}

/**
 * UPSERT chaveado por CAS. Se existe material com aquele CAS, faz UPDATE
 * preenchendo apenas campos vazios; senão INSERT. Sem CAS -> sempre INSERT.
 * Retorna o material_id.
 */
function upsertMaterial(m: MatData, url: string): number {
  const odor_strength = normalizeStrength(m.odor_strength_raw);
  const confidence = m.cas ? "cas-match" : "name-exact";
  const data_json = JSON.stringify(m.raw);
  const name = m.name ?? "(sem nome)";

  const existing = m.cas
    ? (db.prepare("SELECT * FROM materials WHERE cas = ?").get(m.cas) as
        | Record<string, unknown>
        | undefined)
    : undefined;

  if (existing) {
    const id = existing.id as number;
    // COALESCE de campo vazio: só grava se o atual estiver NULL/''.
    db.prepare(
      `UPDATE materials SET
         name_canonical    = CASE WHEN name_canonical IS NULL OR name_canonical='' THEN ? ELSE name_canonical END,
         iupac_name        = COALESCE(iupac_name, ?),
         molecular_formula = COALESCE(molecular_formula, ?),
         molecular_weight  = COALESCE(molecular_weight, ?),
         boiling_point_c   = COALESCE(boiling_point_c, ?),
         vapor_pressure    = COALESCE(vapor_pressure, ?),
         logp              = COALESCE(logp, ?),
         odor_family       = COALESCE(odor_family, ?),
         odor_strength     = COALESCE(odor_strength, ?),
         odor_description  = COALESCE(odor_description, ?),
         material_kind     = COALESCE(material_kind, 'aroma_chemical'),
         is_aroma_chemical = 1,
         tgsc_url          = COALESCE(tgsc_url, ?),
         confidence        = COALESCE(confidence, ?),
         data_json         = COALESCE(data_json, ?),
         updated_at        = datetime('now')
       WHERE id = ?`
    ).run(
      name,
      null, // iupac_name (TGSC não expõe direto; PubChem preenche)
      m.molecular_formula,
      m.molecular_weight,
      m.boiling_point_c,
      m.vapor_pressure,
      m.logp,
      m.odor_family,
      odor_strength,
      m.odor_description,
      url,
      confidence,
      data_json,
      id
    );
    return id;
  }

  const info = db
    .prepare(
      `INSERT INTO materials
         (cas, name_canonical, iupac_name, molecular_formula, molecular_weight,
          boiling_point_c, vapor_pressure, logp, odor_family, odor_strength,
          odor_description, tenacity, recommended_dosage, is_aroma_chemical,
          material_kind, note_type, tgsc_url, confidence, data_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      m.cas,
      name,
      null, // iupac_name
      m.molecular_formula,
      m.molecular_weight,
      m.boiling_point_c,
      m.vapor_pressure,
      m.logp,
      m.odor_family,
      odor_strength,
      m.odor_description,
      null, // tenacity
      null, // recommended_dosage
      1,
      "aroma_chemical",
      null, // note_type: NULL -> derivado depois pela heurística
      url,
      confidence,
      data_json
    );
  return Number(info.lastInsertRowid);
}

async function scrape(limit: number): Promise<number> {
  const pending = nextPending(SOURCE, limit);
  let done = 0;
  for (const { url } of pending) {
    try {
      const res = await httpGet(url);
      if (!res.ok) {
        markError(SOURCE, url, `HTTP ${res.status}`);
        continue;
      }
      saveRaw(SOURCE, url, res.text);
      const m = parseMaterial(res.text);
      const id = upsertMaterial(m, url);
      const allNames = [m.name, ...m.synonyms].filter(
        (x): x is string => !!x
      );
      saveSynonyms(id, allNames);
      markDone(SOURCE, url);
      done++;
      console.log(
        `  ✓ ${m.name} [cas=${m.cas ?? "-"} mw=${m.molecular_weight ?? "-"} bp=${m.boiling_point_c ?? "-"} vp=${m.vapor_pressure ?? "-"} logp=${m.logp ?? "-"}]`
      );
    } catch (e) {
      markError(SOURCE, url, String(e));
      console.warn(`  ✗ erro ${url}: ${e}`);
    }
    await jitter(1000, 2000);
  }
  return done;
}

// -------------------------------------------------------------------------
// Verificação final do teste
// -------------------------------------------------------------------------

function report() {
  const count = (db.prepare("SELECT COUNT(*) n FROM materials").get() as { n: number }).n;
  console.log(`\n== materials COUNT = ${count} ==`);
  const rows = db
    .prepare(
      `SELECT id, cas, name_canonical, molecular_formula, molecular_weight,
              boiling_point_c, vapor_pressure, logp, odor_family, odor_strength,
              odor_description, material_kind, confidence
       FROM materials
       WHERE tgsc_url IS NOT NULL
       ORDER BY id DESC LIMIT 3`
    )
    .all();
  console.log("== amostra (campos técnicos) ==");
  console.log(JSON.stringify(rows, null, 2));
  const syn = (db.prepare("SELECT COUNT(*) n FROM material_synonyms").get() as { n: number }).n;
  console.log(`== material_synonyms COUNT = ${syn} ==`);
}

// -------------------------------------------------------------------------
async function main() {
  console.log(`TGSC crawl — ${TEST ? "TESTE (índice A)" : "COMPLETO"} — LIMIT=${LIMIT}`);
  console.log("\n[DESCOBRIR]");
  const found = await discover();
  console.log(`  total enfileirado (novos + já existentes): ${found}`);

  console.log(`\n[RASPAR] até ${LIMIT} materiais pendentes`);
  const scraped = await scrape(LIMIT);
  console.log(`  raspados nesta rodada: ${scraped}`);

  report();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
