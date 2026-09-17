/**
 * catalog.ts — Data layer 100% CLIENT-SIDE do catálogo de materiais.
 *
 * Substitui lib/db.ts (que dependia de `node:sqlite` no servidor). Aqui os dados
 * vêm de JSON embutido (materials.json + facets.json, exportados do pipeline via
 * resolveJsonModule), então tudo roda no navegador — pré-requisito para a PWA
 * estática/offline. Funções PURAS, mesma semântica das antigas de lib/db.ts.
 *
 * ESM, sem extensão nos imports. SEM "server-only", SEM node:sqlite.
 */

import materialsData from "./data/materials.json";
import facetsData from "./data/facets.json";
import type { MaterialInput } from "./engine";

// ============================================================================
// TIPOS (idênticos aos antigos de lib/db.ts)
// ============================================================================
export interface MaterialCard {
  id: number;
  cas: string | null;
  name_canonical: string;
  name_pt: string | null;
  odor_family: string | null;
  note_type: string | null;
  material_kind: string | null;
  odor_description: string | null;
  odor_strength: string | null;
  key_uses: string | null;
  min_price: number | null;
  min_price_per_g: number | null;
  offer_count: number;
  sources: string | null;
  cap_color: string | null;
  family_canon: string | null;
}

export interface Offer {
  source: string;
  source_url: string;
  product_name: string;
  size_value: number | null;
  size_unit: string | null;
  dilution: string | null;
  price: number | null;
  price_per_g: number | null;
  in_stock: number | null;
}

/** Material completo (página de detalhe): todos os campos + offers + synonyms. */
export interface MaterialDetail {
  id: number;
  cas: string | null;
  name_canonical: string;
  name_pt: string | null;
  pubchem_cid: number | string | null;
  iupac_name: string | null;
  molecular_formula: string | null;
  molecular_weight: number | null;
  boiling_point_c: number | null;
  vapor_pressure: number | null;
  logp: number | null;
  odor_family: string | null;
  odor_strength: string | null;
  odor_description: string | null;
  note_type: string | null;
  tenacity: string | null;
  recommended_dosage: string | null;
  material_kind: string | null;
  ifra_limit_pct: number | null;
  typical_use_pct: string | null;
  key_uses: string | null;
  min_price: number | null;
  min_price_per_g: number | null;
  offer_count: number;
  sources: string | null;
  cheapest_source: string | null;
  cap_color: string | null;
  family_canon: string | null;
  offers: Offer[];
  synonyms: string[];
}

/** Oferta como aparece no JSON bruto (superset de Offer). */
interface RawOffer extends Offer {
  material_id?: number;
  cas_raw?: string | null;
  brand?: string | null;
}

/** Material completo como aparece no JSON exportado. */
interface RawMaterial {
  id: number;
  cas: string | null;
  name_canonical: string;
  name_pt: string | null;
  pubchem_cid: number | string | null;
  iupac_name: string | null;
  molecular_formula: string | null;
  molecular_weight: number | null;
  boiling_point_c: number | null;
  vapor_pressure: number | null;
  logp: number | null;
  odor_family: string | null;
  odor_strength: "baixa" | "média" | "alta" | null;
  odor_description: string | null;
  note_type: "topo" | "coracao" | "base" | null;
  tenacity: string | null;
  recommended_dosage: string | null;
  is_aroma_chemical: number;
  material_kind: string | null;
  tgsc_url: string | null;
  ifra_limit_pct: number | null;
  typical_use_pct: string | null;
  key_uses: string | null;
  offers: RawOffer[];
  synonyms: string[];
  min_price: number | null;
  min_price_per_g: number | null;
  offer_count: number;
  sources: string | null;
  cheapest_source: string | null;
  cap_color: string | null;
  family_canon: string | null;
  [key: string]: unknown;
}

interface FacetItem {
  v: string;
  n: number;
}
interface FacetsShape {
  notes: FacetItem[];
  families: FacetItem[];
  kinds: FacetItem[];
  strengths: FacetItem[];
  sources: FacetItem[];
  totals: { materials: number; offers: number };
}

// O JSON é dado bruto; tipamos na fronteira. Schema fixo => `as` é seguro.
const MATERIALS = materialsData as unknown as RawMaterial[];
const FACETS = facetsData as unknown as FacetsShape;

// Índice por id para lookup O(1).
const BY_ID = new Map<number, RawMaterial>();
for (const m of MATERIALS) BY_ID.set(m.id, m);

// ============================================================================
// HELPERS
// ============================================================================
function includesCI(hay: string | null | undefined, needle: string): boolean {
  if (!hay) return false;
  return hay.toLowerCase().includes(needle.toLowerCase());
}

/** offers ordenadas: price_per_g não-nulo primeiro, asc; empate por price asc. */
function sortOffers(offers: RawOffer[]): Offer[] {
  return [...offers]
    .sort((a, b) => {
      const an = a.price_per_g == null ? 1 : 0;
      const bn = b.price_per_g == null ? 1 : 0;
      if (an !== bn) return an - bn;
      if (a.price_per_g != null && b.price_per_g != null && a.price_per_g !== b.price_per_g) {
        return a.price_per_g - b.price_per_g;
      }
      return (a.price ?? Infinity) - (b.price ?? Infinity);
    })
    .map((o) => ({
      source: o.source,
      source_url: o.source_url,
      product_name: o.product_name,
      size_value: o.size_value ?? null,
      size_unit: o.size_unit ?? null,
      dilution: o.dilution ?? null,
      price: o.price ?? null,
      price_per_g: o.price_per_g ?? null,
      in_stock: o.in_stock ?? null,
    }));
}

function toCard(m: RawMaterial): MaterialCard {
  return {
    id: m.id,
    cas: m.cas,
    name_canonical: m.name_canonical,
    name_pt: m.name_pt,
    odor_family: m.odor_family,
    note_type: m.note_type,
    material_kind: m.material_kind,
    odor_description: m.odor_description,
    odor_strength: m.odor_strength,
    key_uses: m.key_uses ?? null,
    min_price: m.min_price,
    min_price_per_g: m.min_price_per_g,
    offer_count: m.offer_count,
    sources: m.sources,
    cap_color: m.cap_color ?? null,
    family_canon: m.family_canon ?? null,
  };
}

// ============================================================================
// listMaterials — mesma semântica de lib/db.ts (filtra o array em memória)
// ============================================================================
export function listMaterials(
  opts: {
    q?: string;
    note?: string;
    family?: string;
    source?: string;
    stock?: boolean;
    strength?: string;
    kind?: string;
    cap?: string;
    limit?: number;
  } = {},
): MaterialCard[] {
  const q = opts.q?.trim();
  let rows = MATERIALS.filter((m) => {
    // is_aroma_chemical=1 já garantido no export, mas mantemos por robustez.
    if (m.is_aroma_chemical !== 1) return false;
    if (q) {
      const hit =
        includesCI(m.name_canonical, q) ||
        includesCI(m.name_pt, q) ||
        includesCI(m.cas, q) ||
        includesCI(m.odor_description, q);
      if (!hit) return false;
    }
    if (opts.note && m.note_type !== opts.note) return false;
    if (opts.family && !includesCI(m.odor_family, opts.family)) return false;
    if (opts.kind && m.material_kind !== opts.kind) return false;
    if (opts.strength && m.odor_strength !== opts.strength) return false;
    if (opts.cap && m.cap_color !== opts.cap) return false;
    if (opts.source && !m.offers.some((o) => o.source === opts.source)) return false;
    if (opts.stock && !m.offers.some((o) => o.in_stock === 1)) return false;
    return true;
  });

  // ORDER BY offer_count DESC, name_canonical (mesma ordem do SQL antigo).
  rows = rows.sort(
    (a, b) => b.offer_count - a.offer_count || a.name_canonical.localeCompare(b.name_canonical, "pt-BR"),
  );

  return rows.slice(0, opts.limit ?? 200).map(toCard);
}

// ============================================================================
// getAllMaterials — TODOS os cards (aroma chemicals), sem limite. Usado por
// telas 100% client-side (ex.: /fragrancias, "materiais parecidos").
// ============================================================================
export function getAllMaterials(): MaterialCard[] {
  return MATERIALS.filter((m) => m.is_aroma_chemical === 1)
    .sort(
      (a, b) => b.offer_count - a.offer_count || a.name_canonical.localeCompare(b.name_canonical, "pt-BR"),
    )
    .map(toCard);
}

// ============================================================================
// getMaterial — material completo + offers ordenadas + synonyms
// ============================================================================
export function getMaterial(id: number): MaterialDetail | null {
  const m = BY_ID.get(id);
  if (!m) return null;
  return {
    id: m.id,
    cas: m.cas,
    name_canonical: m.name_canonical,
    name_pt: m.name_pt,
    pubchem_cid: m.pubchem_cid,
    iupac_name: m.iupac_name,
    molecular_formula: m.molecular_formula,
    molecular_weight: m.molecular_weight,
    boiling_point_c: m.boiling_point_c,
    vapor_pressure: m.vapor_pressure,
    logp: m.logp,
    odor_family: m.odor_family,
    odor_strength: m.odor_strength,
    odor_description: m.odor_description,
    note_type: m.note_type,
    tenacity: m.tenacity,
    recommended_dosage: m.recommended_dosage,
    material_kind: m.material_kind,
    ifra_limit_pct: m.ifra_limit_pct,
    typical_use_pct: m.typical_use_pct,
    key_uses: m.key_uses ?? null,
    min_price: m.min_price,
    min_price_per_g: m.min_price_per_g,
    offer_count: m.offer_count,
    sources: m.sources,
    cheapest_source: m.cheapest_source,
    cap_color: m.cap_color ?? null,
    family_canon: m.family_canon ?? null,
    offers: sortOffers(m.offers),
    synonyms: (m.synonyms ?? []).slice(0, 30),
  };
}

// ============================================================================
// getAllMaterialsForEngine — mapeia p/ MaterialInput (formato do motor)
// ============================================================================
export function getAllMaterialsForEngine(): MaterialInput[] {
  return MATERIALS.filter((m) => m.is_aroma_chemical === 1)
    .slice()
    .sort((a, b) => a.name_canonical.localeCompare(b.name_canonical, "pt-BR"))
    .map((m) => ({
      id: m.id,
      name: m.name_canonical,
      note_type: m.note_type,
      odor_family: m.odor_family,
      odor_description: m.odor_description,
      odor_strength: m.odor_strength,
      molecular_weight: m.molecular_weight,
      boiling_point_c: m.boiling_point_c,
      vapor_pressure: m.vapor_pressure,
      logp: m.logp,
      material_kind: m.material_kind,
      min_price: m.min_price,
      min_price_per_g: m.min_price_per_g,
      cheapest_source: m.cheapest_source,
      ifra_limit_pct: m.ifra_limit_pct,
      typical_use_pct: m.typical_use_pct,
    }));
}

// ============================================================================
// facets — lê o JSON pré-computado (mesma forma do retorno antigo)
// ============================================================================
export function facets(): FacetsShape {
  return FACETS;
}

// ============================================================================
// allMaterialIds — todos os ids (para generateStaticParams das rotas dinâmicas)
// ============================================================================
export function allMaterialIds(): number[] {
  return MATERIALS.map((m) => m.id);
}
