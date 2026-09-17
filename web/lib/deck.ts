/**
 * deck.ts — Camada de dados do baralho (100% client-side, JSON embutido).
 *
 * O deck.json é gerado por scripts/build_deck.py a partir de materials.json:
 * texto limpo, facetas em PT, dose, percepção por concentração, foto e — o que
 * mais importa para a mecânica — a ORDEM. As cartas já vêm agrupadas por família
 * e, dentro da família, encadeadas por proximidade olfativa (todos os limões,
 * depois as bergamotas, depois as laranjas). Aqui não se reordena nada: só se
 * fatia, filtra e formata.
 *
 * Sem dependência de servidor: é o que permite a PWA rodar offline.
 */

import deckData from "./data/deck.json";

export type FamilySlug =
  | "citrus" | "aldehydic" | "green" | "herbal" | "aquatic" | "fruity" | "floral"
  | "spicy" | "woody" | "balsamic" | "amber" | "gourmand" | "leather" | "animalic" | "musk";

export type NoteSlot = "topo" | "coracao" | "base" | null;

export interface Offer {
  s: string | null;
  url: string | null;
  size: number | null;
  unit: string | null;
  dil: string | null;
  price: number | null;
  ppg: number | null;
}

export interface PerceptionBand {
  band: string;
  pct: string;
  effect: string;
}

/** Uma carta do baralho — é exatamente o que a UI desenha. */
export interface Ingredient {
  id: number;
  name: string;
  syn: string[];
  cas: string | null;
  family: FamilySlug;
  /** Família que vinha da fonte, quando o build corrigiu a classificação. */
  familyRaw: string | null;
  cap: string;
  note: NoteSlot;
  kind: string | null;
  strength: "baixa" | "média" | "alta" | null;
  /** Descrição do cheiro, 1–2 linhas. */
  smell: string;
  /** "Combina bem com ..." quando a fonte trouxe. */
  pairs: string | null;
  facets: string[];
  uses: string;
  dose: { low: number; mid: number; high: number; label: string | null };
  perception: PerceptionBand[];
  photo: string;
  price: {
    perG: number | null;
    min: number | null;
    source: string | null;
    count: number;
    offers: Offer[];
  };
  tech: {
    mw: number | null; bp: number | null; logp: number | null;
    formula: string | null; ifra: number | null;
    tgsc: string | null; cid: number | string | null;
  };
  /** Posição da carta dentro da família (0 = primeira). */
  seq: number;
}

export interface FamilyMeta {
  slug: FamilySlug;
  label: string;
  cap: string;
  hex: string;
  emoji: string;
  blurb: string;
  order: number;
  count: number;
  capLabel: string;
}

export interface PhotoMeta {
  label: string;
  emoji: string;
  grad: [string, string];
}

interface DeckFile {
  version: number;
  count: number;
  families: FamilyMeta[];
  photos: Record<string, PhotoMeta>;
  cards: Ingredient[];
}

const DECK = deckData as unknown as DeckFile;

export const FAMILIES: FamilyMeta[] = DECK.families;
export const CARDS: Ingredient[] = DECK.cards;
export const PHOTOS: Record<string, PhotoMeta> = DECK.photos;
export const TOTAL = DECK.cards.length;

const BY_ID = new Map<number, Ingredient>(CARDS.map((c) => [c.id, c]));
const BY_FAMILY = new Map<FamilySlug, Ingredient[]>();
for (const c of CARDS) {
  const list = BY_FAMILY.get(c.family);
  if (list) list.push(c);
  else BY_FAMILY.set(c.family, [c]);
}

export function getCard(id: number): Ingredient | undefined {
  return BY_ID.get(id);
}

export function cardsOfFamily(slug: FamilySlug): Ingredient[] {
  return BY_FAMILY.get(slug) ?? [];
}

export function familyMeta(slug: FamilySlug): FamilyMeta {
  return FAMILIES.find((f) => f.slug === slug) ?? FAMILIES[0];
}

/* ------------------------------------------------------------------ */
/* Apresentação                                                        */
/* ------------------------------------------------------------------ */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Caminho da foto do objeto que o cheiro evoca (respeita o basePath do deploy). */
export function photoSrc(key: string): string {
  return `${BASE}/photos/${key}.webp`;
}

export function photoMeta(key: string): PhotoMeta {
  return PHOTOS[key] ?? { label: "", emoji: "🧪", grad: ["#4a4a55", "#1a1a20"] };
}

export const NOTE_LABEL: Record<string, string> = {
  topo: "Topo",
  coracao: "Coração",
  base: "Base",
};

export const KIND_LABEL: Record<string, string> = {
  aroma_chemical: "Químico aromático",
  essential_oil: "Óleo essencial",
  base: "Base pronta",
  solvent: "Solvente / diluente",
};

export const SOURCE_LABEL: Record<string, string> = {
  flavorist: "Flavorist",
  perfumistico: "Perfumístico",
  perfumoteca: "Perfumoteca",
  euperfumista: "Eu Perfumista",
};

export function noteLabel(n: NoteSlot): string {
  return n ? NOTE_LABEL[n] ?? "—" : "—";
}

export function brl(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Preço por grama, com casas suficientes para material barato não virar "R$ 0,00". */
export function perGram(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "preço não mapeado";
  const digits = v < 1 ? 2 : v < 10 ? 2 : 0;
  return `R$ ${v.toFixed(digits).replace(".", ",")}/g`;
}

/** Faixa de preço do frasco, para a linha "Preço médio" da carta. */
export function priceLine(c: Ingredient): string {
  const { min, perG, source } = c.price;
  if (min == null && perG == null) return "Preço não mapeado nos fornecedores";
  const parts: string[] = [];
  if (perG != null) parts.push(perGram(perG));
  if (min != null) parts.push(`menor frasco ${brl(min)}`);
  const where = source ? ` · ${SOURCE_LABEL[source] ?? source}` : "";
  return parts.join(" · ") + where;
}

/** O motor devolve a família no slug canônico (EN). Aqui ela vira o rótulo PT. */
export function familyLabelFromEngine(raw: string): string {
  const hit = FAMILIES.find((f) => f.slug === raw.toLowerCase());
  if (hit) return hit.label;
  const alias: Record<string, string> = {
    aldeidico: "Aldeídica", citrico: "Cítrica", amadeirado: "Amadeirada",
    ambar: "Âmbar / Oriental", almiscar: "Almíscar", especiaria: "Especiaria",
  };
  const k = raw.toLowerCase();
  return alias[k] ?? raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Número em pt-BR com no máximo 1 casa (2.5 → "2,5"). */
export function num(v: number, digits = 1): string {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: digits });
}

/** Porcentagem em pt-BR (vírgula decimal, sem zeros à toa). */
export function pct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const s = v >= 10 ? v.toFixed(0) : v >= 1 ? String(+v.toFixed(1)) : String(+v.toFixed(3));
  return s.replace(".", ",") + "%";
}

/** Sinônimos que só repetem o nome (com cauda de e-commerce) não ajudam ninguém. */
export function usefulSynonyms(c: Ingredient): string[] {
  const base = c.name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return c.syn.filter((s) => {
    const n = s.toLowerCase().replace(/[^a-z0-9]+/g, "");
    return n.length > 2 && !n.startsWith(base) && !base.startsWith(n);
  });
}

export function offerLine(o: Offer): string {
  const size = o.size != null ? `${o.size}${o.unit ?? "g"}` : "—";
  const dil = o.dil ? ` (${o.dil})` : "";
  return `${size}${dil}`;
}
