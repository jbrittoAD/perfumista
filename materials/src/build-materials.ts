/**
 * CONSOLIDAÇÃO: transforma OFFERS (cruas, por fornecedor) em MATERIALS canônicos
 * únicos e liga cada oferta ao seu material (offers.material_id).
 *
 * Chave: CAS quando existir (Flavorist tem); senão nome normalizado (Perfumoteca).
 * Idempotente e resumível — pode rodar quantas vezes quiser.
 */
import { db } from "./db.js";
import { normalizeName, extractCas, normalizeStrength, ptToEn, cleanName } from "./normalize.js";

interface OfferRow {
  id: number;
  source: string;
  product_name: string;
  cas_raw: string | null;
  odor_desc_raw: string | null;
  note_raw: string | null;
  dosage_raw: string | null;
  material_id: number | null;
}

/** Deriva família olfativa e dica de nota (topo/coração/base) do texto do fornecedor. */
function parseNoteRaw(noteRaw: string | null): { family: string | null; noteHint: string | null } {
  if (!noteRaw) return { family: null, noteHint: null };
  const s = noteRaw.toLowerCase();
  let noteHint: string | null = null;
  if (/nota de topo|top note|sa[íi]da/.test(s)) noteHint = "topo";
  else if (/nota de cora|heart|cora[çc][ãa]o|corpo/.test(s)) noteHint = "coracao";
  else if (/nota de base|base note|fundo/.test(s)) noteHint = "base";
  // família = último segmento após "—" ou "/" (ex "Nota de base — Floral")
  const famMatch = noteRaw.split(/[—\-\/|]/).map((x) => x.trim()).filter(Boolean).pop();
  const family = famMatch && famMatch.length < 40 && !/nota|corpo|difusiv/i.test(famMatch) ? famMatch : null;
  return { family, noteHint };
}

const findByCas = db.prepare("SELECT id FROM materials WHERE cas=?");
const findBySynonym = db.prepare(
  "SELECT material_id AS id FROM material_synonyms WHERE synonym_norm=? LIMIT 1"
);
const insertMaterial = db.prepare(`
  INSERT INTO materials (cas, name_canonical, name_pt, odor_family, odor_strength, odor_description,
                         recommended_dosage, material_kind, confidence, data_json)
  VALUES (@cas, @name_canonical, @name_pt, @odor_family, @odor_strength, @odor_description,
          @recommended_dosage, @material_kind, @confidence, @data_json)
`);
const addSynonym = db.prepare(
  "INSERT OR IGNORE INTO material_synonyms(material_id,synonym,synonym_norm,source) VALUES(?,?,?,?)"
);
const linkOffer = db.prepare("UPDATE offers SET material_id=? WHERE id=?");
const fillMaterial = db.prepare(`
  UPDATE materials SET
    odor_family        = COALESCE(odor_family, @odor_family),
    odor_strength      = COALESCE(odor_strength, @odor_strength),
    odor_description   = COALESCE(odor_description, @odor_description),
    recommended_dosage = COALESCE(recommended_dosage, @recommended_dosage),
    name_pt            = COALESCE(name_pt, @name_pt),
    updated_at         = datetime('now')
  WHERE id=@id
`);

function run() {
  const offers = db
    .prepare(
      `SELECT id, source, product_name, cas_raw, odor_desc_raw, note_raw, dosage_raw, material_id
       FROM offers ORDER BY (cas_raw IS NULL), id`
    )
    .all() as OfferRow[];

  let created = 0, linked = 0;
  db.exec("BEGIN");
  try {
    for (const o of offers) {
      const cas = extractCas(o.cas_raw) || extractCas(o.product_name);
      const nameNorm = ptToEn(normalizeName(o.product_name));
      const { family, noteHint } = parseNoteRaw(o.note_raw);

      // 1) acha material existente: por CAS, senão por sinônimo/nome
      let matId: number | undefined;
      if (cas) matId = (findByCas.get(cas) as { id: number } | undefined)?.id;
      if (!matId && nameNorm) matId = (findBySynonym.get(nameNorm) as { id: number } | undefined)?.id;

      // 2) cria se não existe
      if (!matId) {
        const info = insertMaterial.run({
          cas: cas ?? null,
          name_canonical: cleanName(o.product_name) || nameNorm,
          name_pt: o.product_name,
          odor_family: family,
          odor_strength: normalizeStrength(o.note_raw),
          odor_description: o.odor_desc_raw,
          recommended_dosage: o.dosage_raw,
          material_kind: "aroma_chemical",
          confidence: cas ? "cas-match" : "name-only",
          data_json: JSON.stringify({ from_offer: o.id, source: o.source, noteHint }),
        });
        matId = Number(info.lastInsertRowid);
        created++;
      } else {
        // enriquece campos vazios com o que a oferta traz
        fillMaterial.run({
          id: matId, odor_family: family, odor_strength: normalizeStrength(o.note_raw),
          odor_description: o.odor_desc_raw, recommended_dosage: o.dosage_raw, name_pt: o.product_name,
        });
      }

      // 3) registra sinônimos (nome do produto + versão normalizada) e liga a oferta
      if (nameNorm) addSynonym.run(matId, o.product_name, nameNorm, o.source);
      linkOffer.run(matId, o.id);
      linked++;
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }

  console.log(`ofertas processadas: ${offers.length}`);
  console.log(`materiais criados: ${created} | ofertas ligadas: ${linked}`);
  const stats = db.prepare(
    "SELECT COUNT(*) total, COUNT(cas) com_cas FROM materials"
  ).get() as { total: number; com_cas: number };
  console.log(`materiais totais: ${stats.total} (com CAS: ${stats.com_cas})`);
}

run();
