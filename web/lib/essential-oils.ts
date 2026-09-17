/**
 * essential-oils.ts — Decomposição de óleos essenciais a partir do dataset real
 * (./data/essential-oils.json). Cada OE traz main_constituents com % aproximada,
 * nota (topo/coração/base) e família química. Usado pelo motor (#4) para
 * decompor um OE em vários sub-hits reais em vez do parser de palavras.
 *
 * Fonte: knowledge/data/essential-oils.json (31 OEs; composição típica por GC/lit.).
 */

import oilsData from "./data/essential-oils.json";
import { mapToCanonFamily, type NoteType } from "./accords";

interface RawConstituent {
  compound: string;
  cas?: string;
  pct_approx?: number;
  pct_range?: string;
  note?: string;
  family?: string;
}
interface RawOil {
  name: string;
  name_pt?: string;
  botanical?: string;
  cas?: string;
  family?: string;
  note?: string;
  main_constituents?: RawConstituent[];
}
interface RawOilsFile {
  _meta?: unknown;
  oils: RawOil[];
}

export interface OilConstituentComponent {
  family: string; // família canônica do constituinte
  note: NoteType; // faixa na pirâmide (do dataset)
  descriptor: string; // nome do composto
  weight: number; // fração do OE (soma ~1), derivada de pct_approx
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Uma nota "topo-coracao" é resolvida para a mais volátil citada (topo). */
function resolveNote(raw: string | undefined): NoteType {
  const n = norm(raw ?? "");
  if (n.includes("topo")) return "topo";
  if (n.includes("coracao")) return "coracao";
  if (n.includes("base")) return "base";
  return "coracao";
}

// Índice por nome normalizado (name e name_pt, incluindo variações sem parênteses).
const OIL_INDEX = new Map<string, RawOil>();
function indexKeys(oil: RawOil): string[] {
  const keys = new Set<string>();
  for (const raw of [oil.name, oil.name_pt]) {
    if (!raw) continue;
    const n = norm(raw);
    keys.add(n);
    // versão sem o parêntese: "Lavender (true)" -> "lavender"
    keys.add(n.replace(/\s*\(.*?\)\s*/g, " ").trim());
  }
  return Array.from(keys).filter(Boolean);
}
for (const oil of (oilsData as unknown as RawOilsFile).oils) {
  for (const k of indexKeys(oil)) if (!OIL_INDEX.has(k)) OIL_INDEX.set(k, oil);
}

/**
 * Casa um nome de material (do catálogo/formula) com um OE do dataset. Tenta
 * casamento exato, depois substring (nome do OE contido no material ou vice-versa,
 * ex.: "Óleo Essencial de Bergamota" contém "bergamota").
 */
export function findOilByName(name: string): RawOil | null {
  const n = norm(name);
  if (OIL_INDEX.has(n)) return OIL_INDEX.get(n)!;
  const nClean = n.replace(/oleo essencial de|essential oil|\bde\b|\bof\b/g, " ").replace(/\s+/g, " ").trim();
  if (OIL_INDEX.has(nClean)) return OIL_INDEX.get(nClean)!;
  // substring bidirecional (chave do índice contida no nome limpo ou vice-versa)
  let best: RawOil | null = null;
  let bestLen = 0;
  for (const [key, oil] of OIL_INDEX) {
    if (key.length < 4) continue;
    if ((nClean.includes(key) || key.includes(nClean)) && key.length > bestLen) {
      best = oil;
      bestLen = key.length;
    }
  }
  return best;
}

/**
 * Decompõe um OE (pelo nome) nos seus main_constituents reais. Cada constituinte
 * vira um componente com família canônica, nota (do dataset) e peso = pct_approx
 * normalizado. Retorna [] se o OE não estiver no dataset OU não tiver constituintes
 * (o chamador cai no fallback: parser de palavras / nota única).
 */
export function decomposeOilFromDataset(name: string): OilConstituentComponent[] {
  const oil = findOilByName(name);
  if (!oil || !oil.main_constituents || oil.main_constituents.length === 0) return [];
  const oilFamily = oil.family;
  const withPct = oil.main_constituents.filter((c) => (c.pct_approx ?? 0) > 0);
  const total = withPct.reduce((s, c) => s + (c.pct_approx ?? 0), 0);
  if (total <= 0) return [];
  return withPct.map((c) => ({
    // família do constituinte -> canônica; fallback p/ família do OE inteiro.
    family: mapToCanonFamily(c.family) ?? mapToCanonFamily(oilFamily) ?? "desconhecida",
    note: resolveNote(c.note),
    descriptor: c.compound,
    weight: (c.pct_approx ?? 0) / total,
  }));
}
