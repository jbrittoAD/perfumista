/**
 * descriptor-tags.ts — tags de DESCRITOR DE CHEIRO (doce, medicinal, cremoso…)
 * que CORTAM TRANSVERSALMENTE as 15 famílias (family_canon): duas famílias
 * diferentes podem ter materiais "doces", por exemplo. Servem pro filtro
 * "quero"/"não quero" de /explorar — diferente da família (eixo principal de
 * navegação), aqui o usuário refina por textura/caráter dentro ou entre
 * famílias (ex.: "quero doce, mas não quero medicinal").
 *
 * Keywords minerados com contagem real contra os 614 materiais de
 * web/lib/data/materials.json (workflow de mineração, ago/2026) — cada tag só
 * entrou na lista com ocorrência confirmada nos dados, não é uma lista
 * teórica. Mesmo padrão de match dos filtros já existentes: substring
 * case-insensitive sobre nome/descrição/família/uso, sem normalizar acento
 * (os próprios dados vêm com/sem acento misturados, então os keywords já
 * cobrem as duas formas quando relevante).
 */

import type { MaterialCard } from "@/lib/catalog";

export interface DescriptorTag {
  id: string;
  label: string;
  keywords: string[];
}

export const DESCRIPTOR_TAGS: DescriptorTag[] = [
  { id: "doce", label: "Doce", keywords: ["doce", "sweet"] },
  {
    id: "limpo_sabao",
    label: "Limpo / Sabão",
    keywords: ["limpo", "clean", "limpa ", "sabão", "sabao", "soapy", " soap ", "ensaboad"],
  },
  {
    id: "picante_quente",
    label: "Picante / Especiado-quente",
    keywords: ["picante", "spicy", "pimenta", "pepper", "condimentad", "especiad"],
  },
  { id: "empoado", label: "Empoado (pó-de-arroz)", keywords: ["powdery", "pulverul", "atalcad", " talco"] },
  {
    id: "cremoso",
    label: "Cremoso",
    keywords: ["cremoso", "creamy", "creme", "leitos", "lácté", "lactôn"],
  },
  { id: "ceroso", label: "Ceroso", keywords: ["ceroso", "waxy", "cerosa", "cerosas", "cerosos"] },
  { id: "mentolado", label: "Mentolado / Refrescante", keywords: ["mentol", "cânfor", "canfor", "cooling", "camphor"] },
  { id: "gorduroso", label: "Gorduroso", keywords: ["gordu", "fatty", "oleoso", "oily"] },
  { id: "terroso", label: "Terroso", keywords: ["terroso", "earthy", "terrosa", "terrosas", "terrosos"] },
  { id: "resinoso", label: "Resinoso", keywords: ["resinos", "resina "] },
  // Exemplo explícito do usuário — algo que ele quer poder EXCLUIR.
  { id: "medicinal", label: "Medicinal", keywords: ["medicinal", "fenólic", "phenolic"] },
  { id: "metalico", label: "Metálico", keywords: ["metálic", "metallic"] },
  {
    id: "aquoso",
    label: "Aquoso / Aguado",
    keywords: ["aquoso", "aguado", "watery", "marinho", "aquático", "marine"],
  },
  { id: "tabaco", label: "Tabaco", keywords: ["tabaco", "tobacco"] },
  { id: "amendoa", label: "Amêndoa / Marzipã", keywords: ["amêndoa", "marzip", "maçapão", "amendoado"] },
  { id: "fumado", label: "Fumado / Esfumaçado", keywords: ["defumad", "esfumaç", " fumo", "fumaça", "smoky", "smoked"] },
  {
    id: "alcoolico",
    label: "Alcoólico (Boozy)",
    keywords: ["alcoólico", "conhaque", "vinho", "cerveja", " rum ", "champanhe"],
  },
  // Exemplo explícito do usuário — algo que ele quer poder INCLUIR.
  { id: "algodao_doce", label: "Algodão-doce", keywords: ["algodão", "algodao", "cotton"] },
];

const BY_ID = new Map(DESCRIPTOR_TAGS.map((t) => [t.id, t]));

function haystack(m: MaterialCard): string {
  return `${m.name_canonical} ${m.name_pt ?? ""} ${m.odor_description ?? ""} ${m.odor_family ?? ""} ${m.key_uses ?? ""}`.toLowerCase();
}

/** true se o material bate com pelo menos um keyword da tag. */
export function materialHasTag(m: MaterialCard, tagId: string): boolean {
  const tag = BY_ID.get(tagId);
  if (!tag) return false;
  const hay = haystack(m);
  return tag.keywords.some((kw) => hay.includes(kw));
}

/** true se o material bate com QUALQUER uma das tags dadas (match OR). */
export function materialHasAnyTag(m: MaterialCard, tagIds: string[]): boolean {
  if (tagIds.length === 0) return false;
  const hay = haystack(m);
  return tagIds.some((id) => {
    const tag = BY_ID.get(id);
    return tag ? tag.keywords.some((kw) => hay.includes(kw)) : false;
  });
}
