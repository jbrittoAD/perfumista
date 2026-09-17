import { gzipSync, gunzipSync } from "node:zlib";

/** Remove acentos e baixa caixa. */
export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Normaliza um nome de material para matching:
 * lowercase, sem acento, sem grau/concentração/ruído, espaços colapsados.
 */
export function normalizeName(raw: string): string {
  let s = stripAccents((raw || "").toLowerCase());
  // remove concentração e grau
  s = s.replace(/\b\d+(\.\d+)?\s*%/g, " ");
  s = s.replace(/\b(usp|bp|ep|fcc|grau|puro|pura|natural|sintetico|sintética|reagente|p\.a\.?)\b/g, " ");
  // remove conteúdo entre parênteses (sinônimo comercial) — guardado à parte se necessário
  s = s.replace(/\([^)]*\)/g, " ");
  // remove - CAS ... do título estilo Flavorist "Iso E Super - CAS 54464-57-2"
  s = s.replace(/-?\s*cas\s*[\d-]+/g, " ");
  // pontuação -> espaço
  s = s.replace(/[^a-z0-9]+/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

/** Extrai e valida um número CAS de um texto. Retorna "NNNNN-NN-N" ou null. */
export function extractCas(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(/\b(\d{2,7})-(\d{2})-(\d)\b/);
  if (!m) return null;
  const digits = (m[1] + m[2]).split("").reverse();
  let sum = 0;
  digits.forEach((d, i) => (sum += (i + 1) * parseInt(d, 10)));
  if (sum % 10 !== parseInt(m[3], 10)) return null; // dígito verificador inválido
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/**
 * Dicionário semente PT->EN dos materiais mais comuns (expandir com o tempo).
 * Aplicado antes do matching quando o nome do fornecedor está em PT.
 */
export const PT_EN: Record<string, string> = {
  linalol: "linalool",
  "acetato de linalila": "linalyl acetate",
  vanilina: "vanillin",
  "etil vanilina": "ethyl vanillin",
  cumarina: "coumarin",
  eugenol: "eugenol",
  geraniol: "geraniol",
  citronelol: "citronellol",
  "alcool feniletilico": "phenylethyl alcohol",
  "aldeido c12": "aldehyde c12 lauric",
  "benzoato de benzila": "benzyl benzoate",
  "salicilato de benzila": "benzyl salicylate",
  "musk cetona": "musk ketone",
  "musk cetone": "musk ketone",
  limoneno: "limonene",
  "d-limoneno": "d-limonene",
  "gama undecalactona": "gamma undecalactone",
  "aldeido anisico": "anisic aldehyde",
  heliotropina: "heliotropin",
  cariofileno: "caryophyllene",
};

/** Aplica tradução PT->EN se o nome normalizado bater no dicionário. */
export function ptToEn(nameNorm: string): string {
  return PT_EN[nameNorm] ?? nameNorm;
}

/**
 * Limpa nome canônico dos sufixos de marketing dos fornecedores:
 * "Ambroxan - Âmbar Moderno Perfumaria" -> "Ambroxan"
 * "Isobutil Quinolina – Base Clássica de Couro" -> "Isobutil Quinolina"
 * Preserva hifens internos de nomes químicos (ex "Cis-3-Hexenol", "trans-2-hexenal"),
 * pois só corta em " – "/" - " (hífen/travessão COM espaços).
 */
export function cleanName(raw: string): string {
  let s = (raw || "").trim();
  s = s.split(/\s[–—-]\s/)[0].trim();            // corta no 1º travessão/hífen com espaços
  s = s.replace(/\s*cas\s*:?\s*[\d-]+\s*$/i, ""); // remove "CAS 123-45-6" no fim
  s = s.replace(/\s{2,}/g, " ").trim();
  return s || raw.trim();
}

/** Normaliza rótulos de força de odor para baixa|média|alta. */
export function normalizeStrength(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = stripAccents(raw.toLowerCase());
  if (/\b(low|weak|frac|leve|baix|soft|mild|suave)/.test(s)) return "baixa";
  if (/\b(medium|moderat|media|med)/.test(s)) return "média";
  if (/\b(high|strong|fort|intens|alta|powerful|poderos)/.test(s)) return "alta";
  return null;
}

// ---- gzip helpers para pages_raw ----
export const gz = (html: string): Buffer => gzipSync(Buffer.from(html, "utf8"));
export const ungz = (buf: Buffer): string => gunzipSync(buf).toString("utf8");
