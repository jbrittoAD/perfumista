/**
 * Preenche odor_family faltante DERIVANDO da própria odor_description do material
 * (seguro — não chuta de fonte externa). Só toca em quem já tem descrição e não tem família.
 */
import { db } from "./db.js";
import { stripAccents } from "./normalize.js";

// palavra-chave na descrição -> família (ordem importa: mais específico primeiro)
const FAM: [RegExp, string][] = [
  [/marin|aquat|ozon|calone|watery|sea|oceanic/, "aquatic"],
  [/citr|lemon|lim[ãa]o|orange|laranja|bergamot|grapefruit|hesper/, "citrus"],
  [/aldehyd|aldeid/, "aldehydic"],
  [/rose|rosa|jasmin|jasmim|floral|flower|muguet|lily|violet|tuberose|ylang|neroli/, "floral"],
  [/vanil|baunilh|caramel|chocolate|coffee|cafe|honey|mel|gourmand|sugar|a[çc]ucar|praline|tonka|cumar/, "gourmand"],
  [/sandal|cedar|cedro|vetiver|patchoul|wood|madeir|guaiac|oud|agarwood/, "woody"],
  [/amber|ambar|ambrox|labdan|resin|balsam|benzoin|incenso|olibanum|myrrh|mirra/, "balsamic"],
  [/musk|almisc|almiscar|muscen|galaxolide|ambrette/, "musk"],
  [/leather|couro|suede|birch|quinolin/, "leather"],
  [/spic|especi|pepper|pimenta|clove|cravo|cinnam|canela|cardamom|nutmeg|ginger/, "spicy"],
  [/green|verde|leaf|folha|grass|galban|herbal|erval|lavand|rosemary|alecrim|mint|menta|basil|manjeric/, "green"],
  [/fruit|frut|apple|maca|pear|pessego|peach|berry|cassis|coconut|coco|tropical/, "fruity"],
  [/animal|civet|castore|indol|skatole/, "animalic"],
];
function famFromDesc(desc: string | null): string | null {
  if (!desc) return null;
  const s = stripAccents(desc.toLowerCase());
  for (const [re, fam] of FAM) if (re.test(s)) return fam;
  return null;
}

const rows = db
  .prepare("SELECT id, odor_description FROM materials WHERE is_aroma_chemical=1 AND odor_family IS NULL AND odor_description IS NOT NULL")
  .all() as { id: number; odor_description: string }[];
const upd = db.prepare("UPDATE materials SET odor_family=?, updated_at=datetime('now') WHERE id=?");
let n = 0;
db.exec("BEGIN");
for (const r of rows) {
  const f = famFromDesc(r.odor_description);
  if (f) { upd.run(f, r.id); n++; }
}
db.exec("COMMIT");

const cov = db.prepare("SELECT COUNT(*) t, COUNT(odor_family) fam FROM materials WHERE is_aroma_chemical=1").get() as any;
console.log(`famílias preenchidas pela descrição: ${n}`);
console.log(`cobertura família agora: ${cov.fam}/${cov.t} (${Math.round((cov.fam / cov.t) * 100)}%)`);
