/**
 * Mescla a base de referência da pesquisa (knowledge/data/aroma-chemicals.json)
 * nos materiais: preenche odor_family, note_type, odor_strength (COALESCE, não
 * sobrescreve) e sempre grava ifra_limit_pct + typical_use_pct.
 * Casa por CAS (forte) e por nome/sinônimo normalizado (fallback).
 */
import { db } from "./db.js";
import { normalizeName, extractCas, ptToEn } from "./normalize.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR } from "./db.js";

// adiciona colunas se faltarem
const cols = db.prepare("PRAGMA table_info(materials)").all() as { name: string }[];
const has = (c: string) => cols.some((x) => x.name === c);
if (!has("ifra_limit_pct")) db.exec("ALTER TABLE materials ADD COLUMN ifra_limit_pct REAL");
if (!has("typical_use_pct")) db.exec("ALTER TABLE materials ADD COLUMN typical_use_pct TEXT");

interface Ref {
  name: string; name_pt: string | null; synonyms: string[]; cas: string | null;
  odor_family: string | null; note: string | null; strength: string | null;
  descriptors: string[]; typical_use_pct: string | null; ifra_limit_pct: number | null; key_uses: string | null;
}
const path = join(DATA_DIR, "..", "..", "knowledge", "data", "aroma-chemicals.json");
const refs = JSON.parse(readFileSync(path, "utf8")) as Ref[];

// índices de busca
const byCas = new Map<string, Ref>();
const byName = new Map<string, Ref>();
for (const r of refs) {
  const cas = extractCas(r.cas);
  if (cas) byCas.set(cas, r);
  const names = [r.name, r.name_pt, ...(r.synonyms || [])].filter(Boolean) as string[];
  for (const n of names) { const k = ptToEn(normalizeName(n)); if (k && !byName.has(k)) byName.set(k, r); }
}

const NOTE_MAP: Record<string, string> = { topo: "topo", top: "topo", coracao: "coracao", "coração": "coracao", heart: "coracao", base: "base" };

const mats = db.prepare("SELECT id, cas, name_canonical, odor_family, note_type, odor_strength, odor_description FROM materials").all() as any[];
const synonymsOf = db.prepare("SELECT synonym_norm FROM material_synonyms WHERE material_id=?");
const upd = db.prepare(`UPDATE materials SET
  odor_family=COALESCE(odor_family,?), note_type=COALESCE(note_type,?), odor_strength=COALESCE(odor_strength,?),
  odor_description=COALESCE(odor_description,?), ifra_limit_pct=?, typical_use_pct=?, updated_at=datetime('now') WHERE id=?`);
const addSyn = db.prepare("INSERT OR IGNORE INTO material_synonyms(material_id,synonym,synonym_norm,source) VALUES(?,?,?,'research')");

let byCasN = 0, byNameN = 0, none = 0;
db.exec("BEGIN");
for (const m of mats) {
  let ref: Ref | undefined;
  const cas = extractCas(m.cas);
  if (cas) ref = byCas.get(cas);
  if (!ref) {
    const keys = [ptToEn(normalizeName(m.name_canonical)), ...(synonymsOf.all(m.id) as any[]).map((s) => s.synonym_norm)];
    for (const k of keys) { if (byName.has(k)) { ref = byName.get(k); break; } }
    if (ref) byNameN++;
  } else byCasN++;
  if (!ref) { none++; continue; }

  const note = ref.note ? NOTE_MAP[ref.note.toLowerCase()] ?? null : null;
  const desc = ref.descriptors?.length ? ref.descriptors.join(", ") : null;
  upd.run(ref.odor_family, note, ref.strength, desc, ref.ifra_limit_pct, ref.typical_use_pct, m.id);
  for (const s of [ref.name, ...(ref.synonyms || [])].filter(Boolean)) {
    const sn = ptToEn(normalizeName(s as string)); if (sn) addSyn.run(m.id, s, sn);
  }
}
db.exec("COMMIT");

console.log(`materiais: ${mats.length} | casaram por CAS=${byCasN} por NOME=${byNameN} | sem match=${none}`);
const s = db.prepare("SELECT COUNT(*) t, COUNT(odor_family) fam, COUNT(note_type) nota, COUNT(odor_strength) forca, COUNT(ifra_limit_pct) ifra, COUNT(typical_use_pct) uso FROM materials WHERE is_aroma_chemical=1").get() as any;
console.log(`[is_aroma_chemical=1] total=${s.t} família=${s.fam} nota=${s.nota} força=${s.forca} ifra=${s.ifra} uso%=${s.uso}`);
