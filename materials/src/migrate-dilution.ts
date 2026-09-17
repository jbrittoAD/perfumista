/** Migração: adiciona coluna `dilution` em offers e refaz a UNIQUE pra incluí-la.
 *  Idempotente: só roda se a coluna ainda não existe. Preserva as ofertas atuais. */
import { db } from "./db.js";

const cols = db.prepare("PRAGMA table_info(offers)").all() as { name: string }[];
if (cols.some((c) => c.name === "dilution")) {
  console.log("já migrado (coluna dilution existe). nada a fazer.");
  process.exit(0);
}

console.log("migrando offers -> +dilution, nova UNIQUE...");
db.exec("PRAGMA foreign_keys = OFF");
db.exec("BEGIN");
try {
  db.exec(`
    CREATE TABLE offers_new (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id   INTEGER REFERENCES materials(id) ON DELETE SET NULL,
      source        TEXT NOT NULL,
      source_url    TEXT NOT NULL,
      product_name  TEXT NOT NULL,
      cas_raw       TEXT,
      brand         TEXT,
      size_value    REAL,
      size_unit     TEXT,
      dilution      TEXT,
      price         REAL,
      currency      TEXT DEFAULT 'BRL',
      sku           TEXT,
      in_stock      INTEGER,
      odor_desc_raw TEXT,
      note_raw      TEXT,
      dosage_raw    TEXT,
      data_json     TEXT,
      scraped_at    TEXT DEFAULT (datetime('now')),
      UNIQUE (source, source_url, size_value, size_unit, dilution)
    );
    INSERT INTO offers_new (id, material_id, source, source_url, product_name, cas_raw, brand,
      size_value, size_unit, price, currency, sku, in_stock, odor_desc_raw, note_raw, dosage_raw, data_json, scraped_at)
    SELECT id, material_id, source, source_url, product_name, cas_raw, brand,
      size_value, size_unit, price, currency, sku, in_stock, odor_desc_raw, note_raw, dosage_raw, data_json, scraped_at
    FROM offers;
    DROP TABLE offers;
    ALTER TABLE offers_new RENAME TO offers;
    CREATE INDEX IF NOT EXISTS idx_offers_material ON offers(material_id);
    CREATE INDEX IF NOT EXISTS idx_offers_source ON offers(source);
    CREATE INDEX IF NOT EXISTS idx_offers_cas ON offers(cas_raw);
  `);
  db.exec("COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
}
db.exec("PRAGMA foreign_keys = ON");
const n = (db.prepare("SELECT COUNT(*) n FROM offers").get() as { n: number }).n;
console.log(`ok. offers preservadas: ${n}`);
