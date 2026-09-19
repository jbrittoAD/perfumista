/**
 * enrich-tgsc.ts — ENRIQUECE materiais já existentes com dados olfativos do TGSC.
 *
 * Alvo: materials com is_aroma_chemical=1 e (odor_family IS NULL OR odor_strength IS NULL),
 *       priorizando os que têm CAS.
 *
 * Como funciona:
 *   1. TGSC NÃO expõe um índice por número CAS (cas-*.html / casidx*.html → 404, confirmado
 *      via httpGet). Os índices alfabéticos por NOME "Aromatic Ingredients"
 *      (rawmatex-a.html..z, com wx no lugar de w/x) também NÃO carregam o CAS nas células.
 *      Portanto o mapeamento é feito por NOME normalizado (fallback previsto na tarefa).
 *   2. Constrói {nome_normalizado -> url} a partir dos índices (salvo em pages_raw via saveRaw,
 *      e cacheado em data/tgsc_nameidx.json p/ não re-raspar os índices a cada rodada).
 *   3. Para cada alvo: acha a URL TGSC pelo name_canonical normalizado (com ptToEn) e, se
 *      falhar, por qualquer synonym_norm de material_synonyms. httpGet + saveRaw + parse
 *      (mesma lógica de crawl-tgsc). O CAS da PÁGINA é comparado ao CAS do material: se bater,
 *      confidence='cas-match' e conta como "casou por CAS"; senão 'name-exact'.
 *   4. UPDATE preenchendo SÓ o que está vazio (COALESCE): odor_family, odor_strength,
 *      odor_description, e boiling_point_c/molecular_weight/logp se ainda faltarem.
 *      Sinônimos do TGSC vão p/ material_synonyms. NUNCA sobrescreve, NUNCA mexe em note_type.
 *
 * Rodar teste:   NODE_NO_WARNINGS=1 LIMIT=10 npx tsx src/enrich-tgsc.ts
 * Rodar tudo:    NODE_NO_WARNINGS=1 LIMIT=9999 npx tsx src/enrich-tgsc.ts
 * Forçar rebuild do índice de nomes: REBUILD_INDEX=1
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { db, DATA_DIR } from "./db.js";
import { httpGet, saveRaw, jitter } from "./http.js";
import { normalizeName, extractCas, normalizeStrength, ptToEn } from "./normalize.js";

const SOURCE = "tgsc";
const BASE = "https://www.thegoodscentscompany.com";
const LIMIT = Number(process.env.LIMIT ?? 10);
const REBUILD_INDEX = process.env.REBUILD_INDEX === "1";
const INDEX_CACHE = join(DATA_DIR, "tgsc_nameidx.json");

// rawmatex tem 'wx' no lugar de 'w'/'x'
const LETTERS = [
  "a", "b", "c", "d", "e", "f", "g", "h", "i", "jk", "l", "m",
  "n", "o", "p", "q", "r", "s", "t", "u", "v", "wx", "y", "z",
];

function abs(p: string): string {
  if (p.startsWith("http")) return p;
  return p.startsWith("/") ? BASE + p : `${BASE}/${p}`;
}

function firstNumber(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = text.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}
function minNumber(text: string | null | undefined): number | null {
  if (!text) return null;
  const nums = (text.replace(/,/g, "").match(/-?\d+(\.\d+)?/g) ?? [])
    .map(Number).filter((n) => Number.isFinite(n));
  return nums.length ? Math.min(...nums) : null;
}

/**
 * Ponto de ebulição à pressão atmosférica, em °C.
 *
 * NÃO usar minNumber aqui. O TGSC escreve
 *   "Boiling Point: 202.00 to 203.00 °C. @ 760.00 mm Hg
 *    Boiling Point: 114.00 to 115.00 °C. @ 50.00 mm Hg"
 * — várias medidas, cada uma com sua pressão. O menor número do texto é a
 * PRESSÃO da medida a vácuo, não uma temperatura: era assim que o Nerolidol,
 * que ferve a 276 °C, entrava no banco como 1,0 °C (o "@ 1.00 mm Hg"). Vinte e
 * três materiais estavam com a pressão no lugar da temperatura, e como a
 * pirâmide topo/coração/base é derivada do ponto de ebulição, todos eles
 * apareciam no app como nota de topo.
 *
 * Fica com a medida a 760 mm Hg; não havendo, com a maior temperatura lida,
 * que é a que mais se aproxima da atmosférica.
 */
export function boilingPointC(text: string | null | undefined): number | null {
  if (!text) return null;
  const t = text.replace(/&#176;/g, "°").replace(/,/g, "");
  const re = /(-?\d+(?:\.\d+)?)\s*(?:to\s*(-?\d+(?:\.\d+)?))?\s*°?\s*C\.?(?:\s*@\s*(\d+(?:\.\d+)?)\s*mm\s*Hg)?/gi;
  const lidas: { c: number; mmHg: number | null }[] = [];
  for (const m of t.matchAll(re)) {
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    const c = (a + b) / 2;
    if (!Number.isFinite(c) || c < -50 || c > 600) continue;
    lidas.push({ c, mmHg: m[3] ? Number(m[3]) : null });
  }
  if (!lidas.length) return null;
  const atm = lidas.filter((x) => x.mmHg == null || Math.abs(x.mmHg - 760) < 1);
  const alvo = atm.length ? atm : lidas;
  return Math.round(Math.max(...alvo.map((x) => x.c)) * 10) / 10;
}

// -------------------------------------------------------------------------
// ÍNDICE DE NOMES: {name_norm -> url}
// -------------------------------------------------------------------------
function parseIndexNames(html: string): { name: string; url: string }[] {
  const $ = cheerio.load(html);
  const out: { name: string; url: string }[] = [];
  $("tr").each((_, tr) => {
    const $tr = $(tr);
    const $a = $tr.find("a[onclick*='openMainWindow']").first();
    if (!$a.length) return;
    const m = ($a.attr("onclick") || "").match(/openMainWindow\((?:'|")([^'"]+)(?:'|")\)/);
    if (!m || !/\/data\/rw\d+\.html/i.test(m[1])) return;
    const prefix = $tr.find("div.chtols").first().text().trim();
    const core = $a.text().trim();
    const name = (prefix ? `${prefix}${core}` : core).replace(/\s+/g, " ").trim();
    if (name) out.push({ name, url: abs(m[1]) });
  });
  return out;
}

async function buildNameIndex(): Promise<Map<string, string>> {
  if (!REBUILD_INDEX && existsSync(INDEX_CACHE)) {
    const entries = JSON.parse(readFileSync(INDEX_CACHE, "utf8")) as [string, string][];
    console.log(`  índice de nomes carregado do cache: ${entries.length} nomes`);
    return new Map(entries);
  }
  console.log("  construindo índice de nomes do TGSC (rawmatex-*)...");
  const map = new Map<string, string>();
  for (const L of LETTERS) {
    const u = `${BASE}/rawmatex-${L}.html`;
    const r = await httpGet(u);
    if (!r.ok) { console.warn(`    índice ${L} falhou (${r.status})`); continue; }
    saveRaw(SOURCE, u, r.text);
    let n = 0;
    for (const { name, url } of parseIndexNames(r.text)) {
      const norm = normalizeName(name);
      if (norm && !map.has(norm)) { map.set(norm, url); n++; }
    }
    console.log(`    ${L}: +${n}`);
    await jitter(800, 1500);
  }
  writeFileSync(INDEX_CACHE, JSON.stringify([...map.entries()]));
  console.log(`  índice pronto: ${map.size} nomes (cache: ${INDEX_CACHE})`);
  return map;
}

// -------------------------------------------------------------------------
// PARSE DE PÁGINA DE MATERIAL (mesma lógica do crawl-tgsc)
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
  raw: Record<string, string>;
}

function parseMaterial(html: string): MatData {
  const $ = cheerio.load(html);
  const raw: Record<string, string> = {};

  let name =
    $("h1 [itemprop='name']").first().text().trim() ||
    $("h1").first().text().trim() || null;
  if (!name) {
    const title = $("title").text().trim();
    name = title ? title.split(",")[0].trim() : null;
  }

  $("table.cheminfo tr").each((_, tr) => {
    const tds = $(tr).find("td").toArray();
    if (!tds.length) return;
    if (tds.length >= 2) {
      const label = $(tds[0]).text().replace(/:\s*$/, "").trim();
      const value = $(tds[1]).text().replace(/\s+/g, " ").trim();
      if (label && value && !(label in raw)) raw[label] = value;
    } else {
      const full = $(tds[0]).text().replace(/\s+/g, " ").trim();
      const colon = full.indexOf(":");
      if (colon > 0) {
        const label = full.slice(0, colon).trim();
        const value = full.slice(colon + 1).trim();
        if (label && value && !(label in raw)) raw[label] = value;
      }
    }
  });

  const odor_family = raw["Odor Type"] ?? null;
  const odor_strength_raw = raw["Odor Strength"] ?? null;
  let odor_description: string | null = raw["Odor Description"] ?? null;
  if (odor_description) {
    odor_description = odor_description.replace(/^at\s+[\d.]+\s*%\.?\s*/i, "").trim() || null;
  }

  const molecular_weight = firstNumber(raw["Molecular Weight"]);
  const molecular_formula =
    (raw["Formula"] ?? raw["Molecular Formula"] ?? "").replace(/\s+/g, "") || null;
  const boiling_point_c = boilingPointC(raw["Boiling Point"]);
  const vapor_pressure = firstNumber(raw["Vapor Pressure"]);
  const logp = firstNumber(raw["logP (o/w)"] ?? raw["logP"] ?? raw["LogP"]);

  const cas =
    extractCas(raw["CAS Number"]) ??
    extractCas($("title").text()) ??
    extractCas(html.slice(0, 4000));

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
    name, cas, odor_family, odor_strength_raw, odor_description,
    molecular_weight, molecular_formula, boiling_point_c, vapor_pressure, logp,
    synonyms, raw,
  };
}

// -------------------------------------------------------------------------
// MATCHING
// -------------------------------------------------------------------------
interface Target {
  id: number;
  cas: string | null;
  name_canonical: string;
  odor_family: string | null;
  odor_strength: string | null;
}

/** Acha a url TGSC para um alvo: por name_canonical, senão por qualquer synonym_norm. */
function findUrl(t: Target, idx: Map<string, string>): { url: string; via: string } | null {
  const cn = ptToEn(normalizeName(t.name_canonical));
  if (cn && idx.has(cn)) return { url: idx.get(cn)!, via: "name_canonical" };
  const syns = db
    .prepare("SELECT synonym_norm FROM material_synonyms WHERE material_id=?")
    .all(t.id) as { synonym_norm: string }[];
  for (const s of syns) {
    const key = ptToEn(s.synonym_norm);
    if (key && idx.has(key)) return { url: idx.get(key)!, via: "synonym" };
  }
  return null;
}

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

const UPDATE = db.prepare(
  `UPDATE materials SET
     molecular_weight = COALESCE(molecular_weight, ?),
     boiling_point_c  = COALESCE(boiling_point_c, ?),
     logp             = COALESCE(logp, ?),
     odor_family      = COALESCE(NULLIF(odor_family,''), ?),
     odor_strength    = COALESCE(NULLIF(odor_strength,''), ?),
     odor_description = COALESCE(NULLIF(odor_description,''), ?),
     tgsc_url         = COALESCE(tgsc_url, ?),
     confidence       = COALESCE(confidence, ?),
     updated_at       = datetime('now')
   WHERE id = ?`
);

// -------------------------------------------------------------------------
async function main() {
  console.log(`TGSC enrich — LIMIT=${LIMIT}`);

  // baseline
  const q = (s: string) => (db.prepare(s).get() as { n: number }).n;
  const baseTot = q("SELECT COUNT(*) n FROM materials WHERE is_aroma_chemical=1");
  const baseFam = q("SELECT COUNT(*) n FROM materials WHERE is_aroma_chemical=1 AND odor_family IS NOT NULL AND odor_family<>''");
  const baseStr = q("SELECT COUNT(*) n FROM materials WHERE is_aroma_chemical=1 AND odor_strength IS NOT NULL AND odor_strength<>''");
  console.log(`\n[ANTES] aroma_chemical=${baseTot} | odor_family=${baseFam} (${(100*baseFam/baseTot).toFixed(1)}%) | odor_strength=${baseStr} (${(100*baseStr/baseTot).toFixed(1)}%)`);

  const idx = await buildNameIndex();

  const targets = db.prepare(
    `SELECT id, cas, name_canonical, odor_family, odor_strength
     FROM materials
     WHERE is_aroma_chemical=1
       AND (odor_family IS NULL OR odor_family='' OR odor_strength IS NULL OR odor_strength='')
     ORDER BY (cas IS NOT NULL) DESC, id`
  ).all() as Target[];

  console.log(`\n[ALVOS] ${targets.length} materiais (processando até ${LIMIT})`);

  let processed = 0, noUrl = 0, fetchFail = 0, updatedAny = 0;
  let matchedByCas = 0, matchedByName = 0;
  const showBefore = LIMIT <= 20; // no teste, mostra antes/depois

  for (const t of targets) {
    if (processed >= LIMIT) break;
    const found = findUrl(t, idx);
    if (!found) { noUrl++; continue; }
    processed++;

    let res;
    try {
      res = await httpGet(found.url);
    } catch { fetchFail++; await jitter(800, 1500); continue; }
    if (!res.ok) { fetchFail++; await jitter(800, 1500); continue; }
    saveRaw(SOURCE, found.url, res.text);

    const m = parseMaterial(res.text);
    const odor_strength = normalizeStrength(m.odor_strength_raw);

    // CAS da página bate com o CAS do material?
    const casMatch = !!(t.cas && m.cas && t.cas === m.cas);
    if (casMatch) matchedByCas++; else matchedByName++;
    const confidence = casMatch ? "cas-match" : "name-exact";

    if (showBefore && processed <= 3) {
      console.log(`\n  --- #${t.id} ${t.name_canonical}`);
      console.log(`      ANTES: family=${t.odor_family ?? "NULL"} strength=${t.odor_strength ?? "NULL"} | cas(db)=${t.cas ?? "-"}`);
      console.log(`      TGSC (${found.via}) ${found.url}`);
      console.log(`      página: cas=${m.cas ?? "-"} casMatch=${casMatch} | OdorType=${m.odor_family ?? "-"} | OdorStrength=${m.odor_strength_raw ?? "-"} -> ${odor_strength ?? "-"}`);
      console.log(`      desc=${(m.odor_description ?? "-").slice(0, 90)}`);
    }

    db.exec("BEGIN");
    try {
      UPDATE.run(
        m.molecular_weight,
        m.boiling_point_c,
        m.logp,
        m.odor_family,
        odor_strength,
        m.odor_description,
        found.url,
        confidence,
        t.id
      );
      saveSynonyms(t.id, [m.name, ...m.synonyms].filter((x): x is string => !!x));
      db.exec("COMMIT");
      updatedAny++;
    } catch (e) {
      db.exec("ROLLBACK");
      console.warn(`  ✗ erro update #${t.id}: ${e}`);
    }

    if (showBefore && processed <= 3) {
      const after = db.prepare("SELECT odor_family, odor_strength, odor_description FROM materials WHERE id=?").get(t.id) as any;
      console.log(`      DEPOIS: family=${after.odor_family ?? "NULL"} strength=${after.odor_strength ?? "NULL"} desc=${(after.odor_description ?? "NULL").slice(0,60)}`);
    }

    await jitter(800, 1500);
  }

  // depois
  const aftFam = q("SELECT COUNT(*) n FROM materials WHERE is_aroma_chemical=1 AND odor_family IS NOT NULL AND odor_family<>''");
  const aftStr = q("SELECT COUNT(*) n FROM materials WHERE is_aroma_chemical=1 AND odor_strength IS NOT NULL AND odor_strength<>''");

  console.log(`\n===== RESUMO =====`);
  console.log(`processados=${processed} atualizados=${updatedAny} | sem_url_no_tgsc=${noUrl} | fetch_falhou=${fetchFail}`);
  console.log(`casaram por CAS=${matchedByCas} | casaram por NOME=${matchedByName}`);
  console.log(`[DEPOIS] odor_family=${aftFam} (${(100*aftFam/baseTot).toFixed(1)}%)  [+${aftFam-baseFam}]`);
  console.log(`[DEPOIS] odor_strength=${aftStr} (${(100*aftStr/baseTot).toFixed(1)}%)  [+${aftStr-baseStr}]`);
}

main().catch((e) => { console.error(e); process.exit(1); });
