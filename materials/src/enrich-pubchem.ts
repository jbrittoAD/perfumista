/**
 * enrich-pubchem.ts — enriquecimento técnico via PubChem PUG REST.
 *
 * Para materiais que já têm CAS mas com molecular_weight/boiling_point_c/etc
 * faltando, consulta a API gratuita do PubChem (SEM chave) e preenche os
 * campos vazios. Limite educado: <= 3 req/s (usamos jitter entre chamadas).
 *
 * Fluxo por material:
 *   1) CAS -> CID   (xref/RegistryID; fallback name)
 *   2) CID -> propriedades (MolecularWeight, MolecularFormula, IUPACName, XLogP)
 *   3) CID -> sinônimos (grava em material_synonyms source='pubchem'; extrai CAS extras)
 *   4) CID -> Boiling Point (PUG-View, parse robusto -> primeiro valor em °C)
 *
 * UPDATE preenche só o que está vazio (COALESCE).
 *
 * Rodar: NODE_NO_WARNINGS=1 npx tsx src/enrich-pubchem.ts
 * Teste: LIMIT (default 3) materiais que tenham cas.
 */
import { db } from "./db.js";
import { httpGet, jitter } from "./http.js";
import { normalizeName, extractCas } from "./normalize.js";

const PUG = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";
const PUGVIEW = "https://pubchem.ncbi.nlm.nih.gov/rest/pug_view";
const LIMIT = Number(process.env.LIMIT ?? 3);

// -------------------------------------------------------------------------
// helpers
// -------------------------------------------------------------------------

async function getJson(url: string): Promise<any | null> {
  const res = await httpGet(url);
  if (!res.ok || !res.text) return null;
  try {
    return JSON.parse(res.text);
  } catch {
    return null;
  }
}

function firstNumber(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = String(text).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

/** CAS -> CID (xref/RegistryID; fallback /name). Retorna o primeiro CID. */
async function casToCid(cas: string): Promise<number | null> {
  const enc = encodeURIComponent(cas);
  let j = await getJson(`${PUG}/compound/xref/RegistryID/${enc}/cids/JSON`);
  let cid = j?.IdentifierList?.CID?.[0];
  if (!cid) {
    await jitter(350, 500);
    j = await getJson(`${PUG}/compound/name/${enc}/cids/JSON`);
    cid = j?.IdentifierList?.CID?.[0];
  }
  return typeof cid === "number" ? cid : null;
}

interface Props {
  molecular_weight: number | null;
  molecular_formula: string | null;
  iupac_name: string | null;
  logp: number | null;
}

async function cidProps(cid: number): Promise<Props> {
  const j = await getJson(
    `${PUG}/compound/cid/${cid}/property/MolecularWeight,MolecularFormula,IUPACName,XLogP/JSON`
  );
  const p = j?.PropertyTable?.Properties?.[0] ?? {};
  return {
    molecular_weight: firstNumber(p.MolecularWeight),
    molecular_formula: p.MolecularFormula ?? null,
    iupac_name: p.IUPACName ?? null,
    logp: typeof p.XLogP === "number" ? p.XLogP : firstNumber(p.XLogP),
  };
}

async function cidSynonyms(cid: number): Promise<string[]> {
  const j = await getJson(`${PUG}/compound/cid/${cid}/synonyms/JSON`);
  const list = j?.InformationList?.Information?.[0]?.Synonym;
  return Array.isArray(list) ? list.map(String) : [];
}

/**
 * Boiling Point via PUG-View. A estrutura é aninhada
 * (Record.Section[].Information[].Value.StringWithMarkup[].String).
 * Fazemos um walk recursivo coletando strings e pegamos o primeiro valor
 * numérico que esteja em °C.
 */
async function cidBoilingPoint(cid: number): Promise<number | null> {
  const j = await getJson(
    `${PUGVIEW}/data/compound/${cid}/JSON?heading=Boiling+Point`
  );
  if (!j) return null;

  const strings: string[] = [];
  const walk = (o: any) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) {
      for (const x of o) walk(x);
      return;
    }
    for (const [k, v] of Object.entries(o)) {
      if (k === "String" && typeof v === "string") strings.push(v);
      else walk(v);
    }
  };
  walk(j);

  for (const s of strings) {
    // aceita "198 °C", "194.00 to 197.00 °C. @ 760 mm Hg", "198-200 °C"
    if (/°?\s*C/i.test(s) || /\bC\b/.test(s)) {
      const n = firstNumber(s);
      if (n !== null) return n;
    }
  }
  // fallback: primeiro número de qualquer string
  for (const s of strings) {
    const n = firstNumber(s);
    if (n !== null) return n;
  }
  return null;
}

function saveSynonyms(materialId: number, names: string[]) {
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO material_synonyms(material_id, synonym, synonym_norm, source)
     VALUES (?, ?, ?, 'pubchem')`
  );
  const seen = new Set<string>();
  for (const n of names) {
    const norm = normalizeName(n);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    stmt.run(materialId, n, norm);
  }
}

// -------------------------------------------------------------------------
// main
// -------------------------------------------------------------------------

interface Row {
  id: number;
  cas: string;
  name_canonical: string;
  pubchem_cid: number | null;
  molecular_weight: number | null;
  molecular_formula: string | null;
  iupac_name: string | null;
  boiling_point_c: number | null;
  logp: number | null;
}

async function main() {
  console.log(`PubChem enrich — LIMIT=${LIMIT}`);

  // materiais com CAS e faltando ao menos um campo técnico chave
  const rows = db
    .prepare(
      `SELECT id, cas, name_canonical, pubchem_cid, molecular_weight,
              molecular_formula, iupac_name, boiling_point_c, logp
       FROM materials
       WHERE cas IS NOT NULL
         AND (molecular_weight IS NULL
              OR boiling_point_c IS NULL
              OR molecular_formula IS NULL
              OR iupac_name IS NULL
              OR logp IS NULL
              OR pubchem_cid IS NULL)
       ORDER BY id
       LIMIT ?`
    )
    .all(LIMIT) as Row[];

  console.log(`  ${rows.length} materiais a enriquecer\n`);

  for (const r of rows) {
    console.log(`--- ${r.name_canonical} (cas ${r.cas}) ---`);
    console.log(
      `  ANTES: cid=${r.pubchem_cid ?? "-"} mw=${r.molecular_weight ?? "-"} formula=${r.molecular_formula ?? "-"} iupac=${r.iupac_name ?? "-"} bp=${r.boiling_point_c ?? "-"} logp=${r.logp ?? "-"}`
    );

    try {
      const cid = r.pubchem_cid ?? (await casToCid(r.cas));
      await jitter(350, 500);
      if (!cid) {
        console.log("  (sem CID no PubChem)\n");
        continue;
      }

      const props = await cidProps(cid);
      await jitter(350, 500);
      const synonyms = await cidSynonyms(cid);
      await jitter(350, 500);
      // só busca boiling point se ainda faltar (economiza requisições)
      const bp =
        r.boiling_point_c ?? (await cidBoilingPoint(cid));
      await jitter(350, 500);

      db.prepare(
        `UPDATE materials SET
           pubchem_cid       = COALESCE(pubchem_cid, ?),
           molecular_weight  = COALESCE(molecular_weight, ?),
           molecular_formula = COALESCE(molecular_formula, ?),
           iupac_name        = COALESCE(iupac_name, ?),
           logp              = COALESCE(logp, ?),
           boiling_point_c   = COALESCE(boiling_point_c, ?),
           updated_at        = datetime('now')
         WHERE id = ?`
      ).run(
        cid,
        props.molecular_weight,
        props.molecular_formula,
        props.iupac_name,
        props.logp,
        bp,
        r.id
      );

      // sinônimos do PubChem + CAS extras encontrados neles
      saveSynonyms(r.id, synonyms);
      const extraCas = new Set<string>();
      for (const s of synonyms) {
        const c = extractCas(s);
        if (c && c !== r.cas) extraCas.add(c);
      }
      if (extraCas.size) {
        console.log(`  CAS extras nos sinônimos: ${[...extraCas].join(", ")}`);
      }

      const after = db
        .prepare(
          `SELECT pubchem_cid, molecular_weight, molecular_formula, iupac_name,
                  boiling_point_c, logp FROM materials WHERE id = ?`
        )
        .get(r.id) as Row;
      console.log(
        `  DEPOIS: cid=${after.pubchem_cid ?? "-"} mw=${after.molecular_weight ?? "-"} formula=${after.molecular_formula ?? "-"} iupac=${after.iupac_name ?? "-"} bp=${after.boiling_point_c ?? "-"} logp=${after.logp ?? "-"}`
      );
      console.log(`  sinônimos PubChem gravados: ${synonyms.length}\n`);
    } catch (e) {
      console.warn(`  ✗ erro: ${e}\n`);
    }
  }

  // ---- verificação final ----
  const count = (db.prepare("SELECT COUNT(*) n FROM materials").get() as { n: number }).n;
  console.log(`== materials COUNT = ${count} ==`);
  const sample = db
    .prepare(
      `SELECT id, cas, name_canonical, pubchem_cid, molecular_formula,
              molecular_weight, boiling_point_c, vapor_pressure, logp,
              iupac_name, odor_family, odor_strength
       FROM materials
       WHERE pubchem_cid IS NOT NULL
       ORDER BY updated_at DESC LIMIT 3`
    )
    .all();
  console.log("== amostra enriquecida (campos técnicos) ==");
  console.log(JSON.stringify(sample, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
