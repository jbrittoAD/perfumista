import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = join(__dirname, "..", "data");
export const IMAGES_DIR = join(DATA_DIR, "images");
mkdirSync(IMAGES_DIR, { recursive: true });

const DB_PATH = join(DATA_DIR, "perfumista.db");

// SQLite embutido do Node 24 — sem compilação nativa.
export const db = new DatabaseSync(DB_PATH);
// WAL = escritas mais seguras/concorrentes; NORMAL = bom equilíbrio durabilidade/velocidade.
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA synchronous = NORMAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  -- Índice de marcas (fase 1 de descoberta)
  CREATE TABLE IF NOT EXISTS designers (
    url          TEXT PRIMARY KEY,
    name         TEXT,
    status       TEXT NOT NULL DEFAULT 'pendente',  -- pendente | feito | erro
    attempts     INTEGER NOT NULL DEFAULT 0,
    error        TEXT,
    scraped_at   TEXT
  );

  -- Fila + dados dos perfumes. status controla a retomada resumível.
  CREATE TABLE IF NOT EXISTS perfumes (
    id             INTEGER PRIMARY KEY,     -- id numérico do Fragrantica (da URL)
    url            TEXT UNIQUE NOT NULL,
    name           TEXT,
    brand          TEXT,
    status         TEXT NOT NULL DEFAULT 'pendente',  -- pendente | feito | erro
    attempts       INTEGER NOT NULL DEFAULT 0,
    error          TEXT,
    discovered_at  TEXT,
    scraped_at     TEXT,

    -- campos indexados pra busca no app (o completo fica em data_json)
    brand_logo_url  TEXT,
    brand_logo_path TEXT,
    main_image_url  TEXT,
    main_image_path TEXT,
    gender_label    TEXT,
    rating_value    REAL,
    rating_count    INTEGER,
    year            INTEGER,

    data_json      TEXT                     -- captura COMPLETA parseada (nunca perde nada)
  );
  CREATE INDEX IF NOT EXISTS idx_perfumes_status ON perfumes(status);
  CREATE INDEX IF NOT EXISTS idx_perfumes_brand  ON perfumes(brand);

  -- HTML bruto comprimido: permite reparsear sem re-raspar o site.
  CREATE TABLE IF NOT EXISTS pages_raw (
    perfume_id  INTEGER PRIMARY KEY REFERENCES perfumes(id) ON DELETE CASCADE,
    html_gz     BLOB NOT NULL,
    fetched_at  TEXT NOT NULL
  );

  -- Notas da pirâmide (normalizadas pra query)
  CREATE TABLE IF NOT EXISTS notes (
    perfume_id  INTEGER NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
    phase       TEXT NOT NULL,   -- topo | coracao | base | linear
    position    INTEGER NOT NULL,
    name        TEXT NOT NULL,
    image_url   TEXT,
    image_path  TEXT,
    PRIMARY KEY (perfume_id, phase, position)
  );

  -- Acordes principais
  CREATE TABLE IF NOT EXISTS accords (
    perfume_id  INTEGER NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
    position    INTEGER NOT NULL,
    name        TEXT NOT NULL,
    width       REAL,   -- largura % da barra
    color       TEXT,
    PRIMARY KEY (perfume_id, position)
  );

  CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
`);

export function setMeta(key: string, value: string) {
  db.prepare(
    "INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
  ).run(key, value);
}
export function getMeta(key: string): string | undefined {
  const row = db.prepare("SELECT value FROM meta WHERE key=?").get(key) as { value: string } | undefined;
  return row?.value;
}
