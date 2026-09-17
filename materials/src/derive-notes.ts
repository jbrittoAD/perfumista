/**
 * Deriva note_type (topo | coracao | base) de cada material.
 * Prioridade:
 *  1. Dica explícita do fornecedor (note_raw "nota de topo/coração/base")
 *  2. Ponto de ebulição (proxy de volatilidade) — cortes da base de conhecimento
 *  3. Peso molecular (MW < 160 topo; 160–220 coração; > 220 base)
 *  4. Família olfativa (último recurso: tendência típica da família)
 * Cortes calibráveis — ver knowledge/base_conhecimento_perfumaria.md (Poucher CS/SGS).
 */
import { db } from "./db.js";
import { stripAccents } from "./normalize.js";

const BP_TOPO = 200; // °C
const BP_BASE = 260;
const MW_TOPO = 160;
const MW_BASE = 220;

interface Mat { id: number; boiling_point_c: number | null; molecular_weight: number | null; odor_family: string | null }

// Tendência típica de posição por família olfativa (aproximação — base §1/§2.1).
const FAMILY_NOTE: [RegExp, string][] = [
  [/citr|lim[aã]o|lima|bergamot|verde|green|aromatic|arom[aá]t|aqua|aqu[aá]t|marin|ozon|ozôn|menta|mint|fresh|fresc|herbal|erval|aldeh|aldeíd|hesper/, "topo"],
  [/flor|floral|frut|fruit|rosa|rose|jasmin|jasmim|especiar|espec|spicy|muguet|violet|lavand/, "coracao"],
  [/madeir|wood|ambar|âmbar|amber|almisc|almísc|musk|musc|baunilh|vanil|balsam|gourm|doce|sweet|resin|couro|leather|atalcad|powder|tabac|tobacco|animal|patchoul|sandal|s[aâ]ndal|labdan|benzoin|incenso|olibano/, "base"],
];
function fromFamily(family: string | null): string | null {
  if (!family) return null;
  const s = stripAccents(family.toLowerCase());
  for (const [re, note] of FAMILY_NOTE) if (re.test(s)) return note;
  return null;
}

function supplierHint(materialId: number): string | null {
  const rows = db
    .prepare("SELECT note_raw FROM offers WHERE material_id=? AND note_raw IS NOT NULL")
    .all(materialId) as { note_raw: string }[];
  for (const r of rows) {
    const s = r.note_raw.toLowerCase();
    if (/nota de topo|top note|sa[íi]da/.test(s)) return "topo";
    if (/nota de base|base note|fundo/.test(s)) return "base";
    if (/nota de cora|heart|cora[çc][ãa]o/.test(s)) return "coracao";
  }
  return null;
}

function fromBoiling(bp: number | null): string | null {
  if (bp == null) return null;
  if (bp < BP_TOPO) return "topo";
  if (bp <= BP_BASE) return "coracao";
  return "base";
}
function fromMw(mw: number | null): string | null {
  if (mw == null) return null;
  if (mw < MW_TOPO) return "topo";
  if (mw <= MW_BASE) return "coracao";
  return "base";
}

const mats = db.prepare("SELECT id, boiling_point_c, molecular_weight, odor_family FROM materials").all() as Mat[];
const upd = db.prepare("UPDATE materials SET note_type=?, updated_at=datetime('now') WHERE id=?");

let byHint = 0, byBp = 0, byMw = 0, byFam = 0, none = 0;
db.exec("BEGIN");
for (const m of mats) {
  const hint = supplierHint(m.id);
  let note = hint;
  if (note) byHint++;
  else if ((note = fromBoiling(m.boiling_point_c))) byBp++;
  else if ((note = fromMw(m.molecular_weight))) byMw++;
  else if ((note = fromFamily(m.odor_family))) byFam++;
  else { none++; continue; }
  upd.run(note, m.id);
}
db.exec("COMMIT");

console.log(`materiais: ${mats.length}`);
console.log(`note_type por: fornecedor=${byHint} ebulição=${byBp} peso_molecular=${byMw} família=${byFam} | sem dado=${none}`);
console.table(
  db.prepare("SELECT note_type, COUNT(*) n FROM materials GROUP BY note_type").all()
);
