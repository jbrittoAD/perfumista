/**
 * (1) MESCLA duplicatas sem-CAS nos materiais com CAS (por nome/sinônimo) —
 *     junta ofertas de vários fornecedores num material canônico só.
 * (2) CLASSIFICA cada material e marca is_aroma_chemical.
 *     Fora do escopo do app (is_aroma_chemical=0): bases/reconstituições,
 *     contratipos, essências, óleos essenciais/mistura, solventes/diluentes.
 *     Dentro: químicos aromáticos (moléculas únicas, sintéticas OU naturais).
 * Idempotente e reversível (só mexe em material_kind/is_aroma_chemical + funde dups).
 */
import { db } from "./db.js";
import { normalizeName, ptToEn } from "./normalize.js";

const norm = (s: string) => ptToEn(normalizeName(s));

// ---------- (1) MERGE ----------
interface M { id: number; name_canonical: string }
const noCas = db.prepare("SELECT id, name_canonical FROM materials WHERE cas IS NULL").all() as M[];
const findCasByName = db.prepare(
  `SELECT m.id FROM materials m WHERE m.cas IS NOT NULL AND (
     m.name_canonical = ?
     OR EXISTS (SELECT 1 FROM material_synonyms s WHERE s.material_id=m.id AND s.synonym_norm = ?)
   ) LIMIT 1`
);
const casByNorm = new Map<string, number>();
for (const m of db.prepare("SELECT id, name_canonical FROM materials WHERE cas IS NOT NULL").all() as M[]) {
  casByNorm.set(norm(m.name_canonical), m.id);
}

let merged = 0;
db.exec("BEGIN");
for (const m of noCas) {
  const n = norm(m.name_canonical);
  let target = casByNorm.get(n);
  if (!target) target = (findCasByName.get(m.name_canonical, n) as { id: number } | undefined)?.id;
  if (target && target !== m.id) {
    db.prepare("UPDATE offers SET material_id=? WHERE material_id=?").run(target, m.id);
    db.prepare(
      "INSERT OR IGNORE INTO material_synonyms(material_id,synonym,synonym_norm,source) SELECT ?, synonym, synonym_norm, source FROM material_synonyms WHERE material_id=?"
    ).run(target, m.id);
    db.prepare("DELETE FROM material_synonyms WHERE material_id=?").run(m.id);
    db.prepare("DELETE FROM materials WHERE id=?").run(m.id);
    merged++;
  }
}
db.exec("COMMIT");

// ---------- (2) CLASSIFICAÇÃO ----------
// Regra: quem tem CAS é químico aromático (molécula definida) — a menos que seja
// explicitamente solvente ou óleo essencial. Bases/essências/contratipos saem;
// "base"/"acorde" no título só excluem quando NÃO há CAS (senão é só marketing).
const SOLVENT = /(dipropileno|propileno ?glicol|\bglicol\b|miristato de isoprop|isopropyl myristate|\bipm\b|dietil ?ftalato|\bdep\b|triacetin|benzoato de benzila)/i;
const ESSENTIAL_OIL = /(óleo essencial|oleo essencial|\babsolut)/i;
// ESCONDIDOS do app (base_essencia): contratipos, colônias e perfumes/essências
// PRONTAS (produto final), não são matéria-prima de formulação.
const COMPOUND_HIDDEN = /(contratipo|inspirad|col[ôo]nia|fragr(a|â)ncia pronta|perfume pronto|\bess[êe]ncia\b)/i;
// VISÍVEIS como acordes/bases (material_kind='base'): reconstruções (Artessence),
// bases de especialidade (Givco), replacers/substitutos e qualquer "base/acorde".
const BASE_VISIBLE = /(\bbases?\b|\bacordes?\b|reconstitu|reconstru|replacer|substitut|givco|artessence|\bspecialty\b)/i;

const all = db.prepare("SELECT id, name_canonical, cas FROM materials").all() as { id: number; name_canonical: string; cas: string | null }[];
const upd = db.prepare("UPDATE materials SET material_kind=?, is_aroma_chemical=? WHERE id=?");
let aroma = 0, solvent = 0, eo = 0, base = 0, nonchem = 0;
db.exec("BEGIN");
// is_aroma_chemical = flag "aparece no app". Incluímos químicos aromáticos +
// solventes/diluentes + óleos essenciais + ACORDES/BASES prontos (kind='base').
// Excluímos SÓ contratipos/colônias/perfumes-essências PRONTAS (base_essencia).
for (const m of all) {
  const name = m.name_canonical;
  let kind = "aroma_chemical";
  if (SOLVENT.test(name)) { kind = "solvent"; solvent++; }
  else if (ESSENTIAL_OIL.test(name)) { kind = "essential_oil"; eo++; }
  else if (COMPOUND_HIDDEN.test(name)) { kind = "base_essencia"; nonchem++; }
  else if (BASE_VISIBLE.test(name)) { kind = "base"; base++; }
  else aroma++;
  const isA = kind === "base_essencia" ? 0 : 1; // esconde só contratipos/colônias/prontos
  upd.run(kind, isA, m.id);
}
db.exec("COMMIT");
console.log(`(óleos essenciais: ${eo} | acordes/bases: ${base})`);

console.log(`mesclados (dup sem-CAS -> CAS): ${merged}`);
console.log(`classificação: aroma=${aroma} solvente=${solvent} base=${base} escondidos(contratipo/pronto)=${nonchem}`);
console.log(`\ntotal materiais agora: ${(db.prepare("SELECT COUNT(*) n FROM materials").get() as any).n}`);
console.log(`químicos aromáticos (no app): ${(db.prepare("SELECT COUNT(*) n FROM materials WHERE is_aroma_chemical=1").get() as any).n}`);
console.log("\n=== amostra EXCLUÍDOS ===");
for (const r of db.prepare("SELECT name_canonical, material_kind FROM materials WHERE is_aroma_chemical=0 LIMIT 25").all() as any[])
  console.log(` - [${r.material_kind}] ${r.name_canonical}`);
