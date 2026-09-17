/**
 * recipes.ts — Tipos e acessores das FÓRMULAS reais (recipes.json) e das
 * COMBINAÇÕES (combinations.json). Funções puras/tipadas; ESM, sem extensão nos
 * imports. Importável tanto do servidor quanto (os tipos + helpers puros) do
 * cliente — o JSON entra via resolveJsonModule.
 *
 * As fórmulas são dados de PESQUISA (DIY, publicadas e clássicas). O casamento
 * ingrediente -> material do catálogo é APROXIMADO (por nome normalizado): muitos
 * ingredientes são nomes genéricos que talvez não existam no catálogo BR.
 */

import recipesData from "./data/recipes.json";
import combinationsData from "./data/combinations.json";

// ============================================================================
// TIPOS
// ============================================================================
export type RecipeSource = "diy" | "published" | "classic";
export type RecipeConfidence = "documented" | "partial" | "structure_only";

export interface RecipeIngredient {
  material: string;
  cas: string | null;
  parts: number | null;
  dilution: string | null;
  note: string | null;
}

export interface Recipe {
  id: number;
  source: RecipeSource;
  name: string;
  family: string | null;
  concentration: string | null;
  ingredients: RecipeIngredient[];
  pyramid: { top: string[]; heart: string[]; base: string[] };
  smells_like: string | null;
  what_it_does: string | null;
  source_url: string | null;
  confidence: RecipeConfidence;
}

export interface Combination {
  combo: string[];
  perception: string | null;
  role: Record<string, string>;
  mechanism: string | null;
  typical_ratio: string | null;
  notes_layer: string | null;
  family_result: string | null;
  source_url: string | null;
}

// O JSON é dado bruto; tipamos na fronteira. `as` é seguro porque o schema é fixo.
const RECIPES = recipesData as unknown as Recipe[];
const COMBINATIONS = combinationsData as unknown as Combination[];

// ============================================================================
// ORDENAÇÃO / RÓTULOS
// ============================================================================
export const SOURCE_LABEL: Record<RecipeSource, string> = {
  diy: "DIY",
  published: "Publicada",
  classic: "Clássica",
};

export const CONFIDENCE_LABEL: Record<RecipeConfidence, string> = {
  documented: "Documentada",
  partial: "Parcial",
  structure_only: "Só estrutura",
};

// Ordem de confiança: documented primeiro.
const CONFIDENCE_RANK: Record<RecipeConfidence, number> = {
  documented: 0,
  partial: 1,
  structure_only: 2,
};

/** Lista todas as fórmulas, `documented` primeiro (depois por nome). */
export function listRecipes(): Recipe[] {
  return [...RECIPES].sort(
    (a, b) =>
      (CONFIDENCE_RANK[a.confidence] ?? 9) - (CONFIDENCE_RANK[b.confidence] ?? 9) ||
      a.name.localeCompare(b.name, "pt-BR"),
  );
}

/** Busca uma fórmula pelo id (string ou number). */
export function getRecipe(id: number | string): Recipe | null {
  const n = Number(id);
  return RECIPES.find((r) => r.id === n) ?? null;
}

/** Todas as combinações. */
export function listCombinations(): Combination[] {
  return [...COMBINATIONS];
}

// ============================================================================
// FACETAS (para os filtros)
// ============================================================================
export interface RecipeFacets {
  families: { v: string; n: number }[];
  sources: { v: RecipeSource; n: number }[];
  confidences: { v: RecipeConfidence; n: number }[];
}

export function recipeFacets(): RecipeFacets {
  const famCount = new Map<string, number>();
  const srcCount = new Map<RecipeSource, number>();
  const confCount = new Map<RecipeConfidence, number>();
  for (const r of RECIPES) {
    if (r.family) famCount.set(r.family, (famCount.get(r.family) ?? 0) + 1);
    srcCount.set(r.source, (srcCount.get(r.source) ?? 0) + 1);
    confCount.set(r.confidence, (confCount.get(r.confidence) ?? 0) + 1);
  }
  return {
    families: [...famCount.entries()]
      .map(([v, n]) => ({ v, n }))
      .sort((a, b) => b.n - a.n || a.v.localeCompare(b.v, "pt-BR")),
    sources: (["diy", "published", "classic"] as const)
      .filter((s) => srcCount.has(s))
      .map((v) => ({ v, n: srcCount.get(v) ?? 0 })),
    confidences: (["documented", "partial", "structure_only"] as const)
      .filter((c) => confCount.has(c))
      .map((v) => ({ v, n: confCount.get(v) ?? 0 })),
  };
}

// ============================================================================
// NORMALIZAÇÃO DE NOTA (ingrediente.note é texto livre e ruidoso)
// ============================================================================
/** Reduz o `note` livre do ingrediente a topo/coração/base (ou null). */
export function normalizeIngredientNote(note: string | null): "topo" | "coracao" | "base" | null {
  if (!note) return null;
  const n = note.toLowerCase();
  // pega apenas os tokens canônicos; o resto do texto livre é descartado.
  if (n === "top" || n.startsWith("top ")) return "topo";
  if (n === "heart" || n.startsWith("heart ")) return "coracao";
  if (n === "base" || n.startsWith("base ")) return "base";
  return null;
}

export const NOTE_LABEL: Record<"topo" | "coracao" | "base", string> = {
  topo: "Topo",
  coracao: "Coração",
  base: "Base",
};

// ============================================================================
// CASAMENTO INGREDIENTE -> MATERIAL DO CATÁLOGO (por nome normalizado)
// ============================================================================
/** minúsculas, sem acento, colapsa espaços — chave de casamento por nome. */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacríticos
    .replace(/\s+/g, " ")
    .trim();
}
