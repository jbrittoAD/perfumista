/**
 * cap-colors.ts — Mapa de COR DE TAMPA → família olfativa + cor da bolinha/badge.
 *
 * Cada material do catálogo tem um `cap_color` (slug). Este mapa dá o rótulo de
 * família em PT-BR e o HEX usado para a bolinha/badge. Alguns tons claros pedem
 * texto escuro por contraste (textDark).
 *
 * 100% client-side/estático; sem dependências. ESM, sem extensão nos imports.
 */

export interface CapMeta {
  /** Rótulo da família olfativa associada à cor da tampa. */
  label: string;
  /** Cor CSS (HEX) da bolinha/badge. */
  hex: string;
  /** Se a bolinha é clara demais, o texto sobre ela deve ser escuro. */
  textDark?: boolean;
}

/** Ordem canônica das cores (usada na página de compras e nos filtros). */
export const CAP_ORDER = [
  "amarelo",
  "pink",
  "verde-folha",
  "verde-escuro",
  "verde-agua",
  "laranja",
  "azul",
  "preto",
  "branco",
] as const;

export type CapColor = (typeof CAP_ORDER)[number];

export const CAP_COLORS: Record<string, CapMeta> = {
  amarelo: { label: "Cítrica", hex: "#e6c84f", textDark: true },
  pink: { label: "Floral", hex: "#e8749e" },
  "verde-folha": { label: "Verde/Herbácea", hex: "#6fbf73", textDark: true },
  "verde-escuro": { label: "Amadeirada/Chipre", hex: "#2f7d4f" },
  "verde-agua": { label: "Aquática/Aldeídica", hex: "#5bc8c2", textDark: true },
  laranja: { label: "Gourmand/Frutada", hex: "#e08a3c" },
  azul: { label: "Aromática/Especiaria", hex: "#3f6fd1" },
  preto: { label: "Oriental/Âmbar/Couro", hex: "#3a3a42" },
  branco: { label: "Almíscar", hex: "#e8e8ee", textDark: true },
};

/** Metadados da cor da tampa a partir do slug (null se desconhecido/ausente). */
export function capMeta(slug: string | null | undefined): CapMeta | null {
  if (!slug) return null;
  return CAP_COLORS[slug] ?? null;
}
