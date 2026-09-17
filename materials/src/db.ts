import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = join(__dirname, "..", "data");
mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = join(DATA_DIR, "materials.db");

export const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA synchronous = NORMAL");
db.exec("PRAGMA foreign_keys = ON");
db.exec("PRAGMA busy_timeout = 8000"); // espera em vez de falhar sob escrita concorrente

db.exec(`
  -- ============================================================
  -- MATERIAL CANÔNICO (dicionário mestre, chaveado por CAS quando existir)
  -- Preenchido/enriquecido por TGSC + PubChem; é o "material" único.
  -- ============================================================
  CREATE TABLE IF NOT EXISTS materials (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    cas                TEXT,                 -- ex "78-70-6" (nulo p/ naturais/misturas)
    name_canonical     TEXT NOT NULL,        -- nome canônico (EN, do TGSC/PubChem)
    name_pt            TEXT,                 -- nome em PT quando conhecido
    pubchem_cid        INTEGER,
    iupac_name         TEXT,
    molecular_formula  TEXT,
    molecular_weight   REAL,
    boiling_point_c    REAL,                 -- proxy de volatilidade
    vapor_pressure     REAL,                 -- mmHg @25C, proxy direto de volatilidade
    logp               REAL,

    -- organoléptico (TGSC + fornecedores)
    odor_family        TEXT,                 -- "odor type" TGSC / família olfativa
    odor_strength      TEXT,                 -- baixa | média | alta (normalizado)
    odor_description   TEXT,
    note_type          TEXT,                 -- topo | coracao | base | (derivado da volatilidade)
    tenacity           TEXT,                 -- ex ">170h em blotter"
    recommended_dosage TEXT,                 -- ex "1% a 10%"
    is_aroma_chemical  INTEGER DEFAULT 1,    -- 1=químico aromático, 0=outro material (fixador base, solvente, etc.)
    material_kind      TEXT,                 -- aroma_chemical | essential_oil | absolute | natural | solvent | base | other

    tgsc_url           TEXT,
    confidence         TEXT,                 -- cas-match | name-exact | fuzzy-review
    data_json          TEXT,                 -- captura completa (nunca perde nada)
    created_at         TEXT DEFAULT (datetime('now')),
    updated_at         TEXT DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_materials_cas ON materials(cas) WHERE cas IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name_canonical);
  CREATE INDEX IF NOT EXISTS idx_materials_note ON materials(note_type);
  CREATE INDEX IF NOT EXISTS idx_materials_family ON materials(odor_family);

  -- Sinônimos (de PubChem/TGSC/fornecedores) — base do matching por nome.
  CREATE TABLE IF NOT EXISTS material_synonyms (
    material_id  INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    synonym      TEXT NOT NULL,          -- forma original
    synonym_norm TEXT NOT NULL,          -- forma normalizada (lowercase, sem acento)
    source       TEXT,                   -- pubchem | tgsc | flavorist | ...
    PRIMARY KEY (material_id, synonym_norm)
  );
  CREATE INDEX IF NOT EXISTS idx_syn_norm ON material_synonyms(synonym_norm);

  -- ============================================================
  -- OFERTAS DOS FORNECEDORES (preço/disponibilidade por site e tamanho)
  -- Um material -> muitas ofertas (vários fornecedores x tamanhos).
  -- material_id pode ser NULL até o matching ligar ao material canônico.
  -- ============================================================
  CREATE TABLE IF NOT EXISTS offers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id   INTEGER REFERENCES materials(id) ON DELETE SET NULL,
    source        TEXT NOT NULL,          -- flavorist | perfumoteca | perfumistico
    source_url    TEXT NOT NULL,
    product_name  TEXT NOT NULL,          -- nome como aparece no site (PT)
    cas_raw       TEXT,                   -- CAS extraído do site (se houver)
    brand         TEXT,                   -- IFF, Firmenich, etc. (Perfumístico expõe)
    size_value    REAL,                   -- 100
    size_unit     TEXT,                   -- ml | g
    dilution      TEXT,                   -- ex "10% DPG" / "puro" — mesmo tamanho pode ter diluições diferentes
    price         REAL,
    price_per_g   REAL,                   -- preço por grama de MATERIAL PURO (normaliza tamanho+diluição) p/ comparar honestamente
    currency      TEXT DEFAULT 'BRL',
    sku           TEXT,
    in_stock      INTEGER,                -- 1/0/null
    odor_desc_raw TEXT,                   -- descrição de odor do próprio site
    note_raw      TEXT,                   -- nota/família como o site diz
    dosage_raw    TEXT,
    data_json     TEXT,                   -- todos os campos crus do produto
    scraped_at    TEXT DEFAULT (datetime('now')),
    UNIQUE (source, source_url, size_value, size_unit, dilution)
  );
  CREATE INDEX IF NOT EXISTS idx_offers_material ON offers(material_id);
  CREATE INDEX IF NOT EXISTS idx_offers_source ON offers(source);
  CREATE INDEX IF NOT EXISTS idx_offers_cas ON offers(cas_raw);

  -- ============================================================
  -- FILA RESUMÍVEL (genérica por fonte) — "nunca perde nada", retoma de onde parou
  -- ============================================================
  CREATE TABLE IF NOT EXISTS scrape_queue (
    source       TEXT NOT NULL,           -- flavorist | perfumoteca | perfumistico | tgsc
    url          TEXT NOT NULL,
    kind         TEXT DEFAULT 'product',  -- product | index | material
    status       TEXT NOT NULL DEFAULT 'pendente',  -- pendente | feito | erro
    attempts     INTEGER NOT NULL DEFAULT 0,
    error        TEXT,
    discovered_at TEXT DEFAULT (datetime('now')),
    scraped_at   TEXT,
    PRIMARY KEY (source, url)
  );
  CREATE INDEX IF NOT EXISTS idx_queue_status ON scrape_queue(source, status);

  -- HTML bruto comprimido (gzip) p/ reparsear sem re-raspar.
  CREATE TABLE IF NOT EXISTS pages_raw (
    source      TEXT NOT NULL,
    url         TEXT NOT NULL,
    html_gz     BLOB NOT NULL,
    fetched_at  TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (source, url)
  );

  CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
`);

// ---- helpers de fila ----
export function enqueue(source: string, url: string, kind = "product") {
  db.prepare(
    "INSERT OR IGNORE INTO scrape_queue(source,url,kind) VALUES(?,?,?)"
  ).run(source, url, kind);
}
export function nextPending(source: string, limit = 1): { url: string; kind: string }[] {
  return db
    .prepare("SELECT url, kind FROM scrape_queue WHERE source=? AND status='pendente' ORDER BY discovered_at LIMIT ?")
    .all(source, limit) as { url: string; kind: string }[];
}
export function markDone(source: string, url: string) {
  db.prepare("UPDATE scrape_queue SET status='feito', scraped_at=datetime('now') WHERE source=? AND url=?").run(source, url);
}
export function markError(source: string, url: string, err: string) {
  db.prepare(
    "UPDATE scrape_queue SET status='erro', attempts=attempts+1, error=? WHERE source=? AND url=?"
  ).run(err.slice(0, 500), source, url);
}
export function queueStats(source?: string) {
  const q = source
    ? db.prepare("SELECT status, COUNT(*) n FROM scrape_queue WHERE source=? GROUP BY status").all(source)
    : db.prepare("SELECT source, status, COUNT(*) n FROM scrape_queue GROUP BY source, status").all();
  return q;
}

export function setMeta(key: string, value: string) {
  db.prepare("INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key, value);
}
export function getMeta(key: string): string | undefined {
  return (db.prepare("SELECT value FROM meta WHERE key=?").get(key) as { value: string } | undefined)?.value;
}
