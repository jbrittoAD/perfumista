import type { Page } from "playwright";

export interface Accord { name: string; width: number; color: string }
export interface NoteItem { name: string; imageUrl: string | null }
export interface Pyramid { topo: NoteItem[]; coracao: NoteItem[]; base: NoteItem[]; notas: NoteItem[] }
export interface SimilarPerfume { name: string; url: string }

export interface PerfumeData {
  id: number | null;
  url: string;
  name: string;
  brand: string;
  brandUrl: string | null;
  brandLogoUrl: string | null;
  mainImageUrl: string | null;
  year: number | null;
  description: string;
  accords: Accord[];
  pyramid: Pyramid;
  rating: Record<string, number>;      // Amo, Gosto, OK, Não Gosto, Odeio
  ratingValue: number | null;          // nota média (schema.org)
  ratingCount: number | null;
  seasons: Record<string, number>;     // Inverno..Noite
  gender: Record<string, number>;      // Feminino..Masculino
  price: Record<string, number>;       // Muito Caro..Ótimo Preço
  longevity: Record<string, number>;   // Muito Fraco..Eterno
  sillage: Record<string, number>;     // Íntimo..Enorme
  similar: SimilarPerfume[];
}

/**
 * Extrai todos os dados do perfume lendo o DOM JÁ RENDERIZADO no browser.
 * Roda no contexto da página (page.evaluate), então usa só APIs do DOM.
 */
export async function extractPerfume(page: Page): Promise<PerfumeData> {
  return page.evaluate(() => {
    const clean = (s: string | null | undefined) => (s || "").replace(/\s+/g, " ").trim();
    const ownText = (el: Element) => {
      let t = "";
      el.childNodes.forEach((n) => { if (n.nodeType === 3) t += n.textContent; });
      return clean(t);
    };
    // "14k" -> 14000, "12.4k" -> 12400, "1.9k" -> 1900, "558" -> 558
    const isNum = (s: string) => /^\d[\d.,]*\s*[kKmM]?$/.test(s);
    const parseCount = (s: string): number => {
      s = clean(s).toLowerCase();
      const m = s.match(/([\d.,]+)/);
      if (!m) return 0;
      let n = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
      if (/[.,]\d/.test(m[1])) n = parseFloat(m[1].replace(",", ".")); // "12.4"
      if (/k/.test(s)) n *= 1000;
      if (/m/.test(s)) n *= 1_000_000;
      return Math.round(n);
    };

    /** Lê pares rótulo->número dentro de uma região, na ordem dos rótulos esperados. */
    const readSeries = (root: Element | null, labels: string[]): Record<string, number> => {
      const out: Record<string, number> = {};
      if (!root) return out;
      const all = Array.from(root.querySelectorAll("*"));
      for (let i = 0; i < all.length; i++) {
        // ignora rótulos dos sliders (vue-slider) — não são contagens
        if (all[i].closest(".vue-slider-marks")) continue;
        const own = ownText(all[i]);
        if (labels.includes(own) && out[own] === undefined) {
          for (let j = i + 1; j < Math.min(i + 10, all.length); j++) {
            const t = ownText(all[j]);
            if (t && isNum(t)) { out[own] = parseCount(t); break; }
          }
        }
      }
      return out;
    };

    const byId = (id: string) => document.getElementById(id);
    const attr = (sel: string, a: string) => document.querySelector(sel)?.getAttribute(a) || null;

    // ---- básico ----
    const url = location.href;
    const idMatch = url.match(/-(\d+)\.html/);
    const id = idMatch ? parseInt(idMatch[1], 10) : null;

    const h1 = document.querySelector('h1[itemprop="name"]');
    const rawName = clean(h1?.textContent);
    // remove sufixo de gênero do nome (" Feminino"/" Masculino"/" Unissex")
    const name = rawName.replace(/\s+(Feminino|Masculino|Unissex|para (mulheres|homens).*)$/i, "").trim();

    const brandEl = document.querySelector('[itemprop="brand"]');
    const brand = clean(brandEl?.querySelector("span")?.textContent || brandEl?.textContent);
    const brandLink = brandEl?.querySelector("a") as HTMLAnchorElement | null;
    const brandUrl = brandLink?.href || null;
    const brandLogo = brandEl?.querySelector("img") as HTMLImageElement | null;
    const brandLogoUrl = brandLogo?.src || null;

    const mainImageUrl =
      attr('[itemprop="image"]', "src") || attr('[itemprop="image"]', "content");

    const desc = clean(byId("perfume-description-content")?.textContent);
    const yearMatch = desc.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? parseInt(yearMatch[0], 10) : null;

    // rating schema.org (nota média)
    const ratingValue = parseFloat(attr('[itemprop="ratingValue"]', "content") || "") || null;
    const ratingCount = parseInt(attr('[itemprop="ratingCount"]', "content") || "", 10) || null;

    // ---- acordes ---- (barras com width% + cor)
    const accords: { name: string; width: number; color: string }[] = [];
    document.querySelectorAll('[style*="width"]').forEach((el) => {
      const style = el.getAttribute("style") || "";
      const txt = ownText(el);
      const wm = style.match(/width:\s*([\d.]+)%/);
      const bg = style.match(/background(?:-color)?:\s*(rgb[^;]+|#[0-9a-f]+)/i);
      // acorde = tem texto curto + width + cor de fundo (exclui barras vazias e layout)
      if (txt && txt.length < 40 && wm && bg && /background/.test(style) && !/clear:/.test(style)) {
        accords.push({ name: txt, width: parseFloat(wm[1]), color: bg[1] });
      }
    });

    // ---- pirâmide ---- (#pyramid). Agrupa por "Notas de Topo/Coração/Base" ou flat.
    const pyramid = { topo: [] as any[], coracao: [] as any[], base: [] as any[], notas: [] as any[] };
    const pyr = byId("pyramid");
    if (pyr) {
      const noteFromImg = (img: HTMLImageElement) => ({
        name: clean(img.getAttribute("alt") || img.parentElement?.textContent),
        imageUrl: img.src || null,
      });
      // procura headings de fase
      const headings = Array.from(pyr.querySelectorAll("*")).filter((e) => {
        const t = ownText(e);
        return /^Notas de (Topo|Coração|Base)$/i.test(t);
      });
      if (headings.length) {
        const map: Record<string, "topo" | "coracao" | "base"> = {
          "Notas de Topo": "topo", "Notas de Coração": "coracao", "Notas de Base": "base",
        };
        headings.forEach((h) => {
          const key = map[ownText(h)];
          // imagens até o próximo heading (usa o container irmão)
          const container = h.parentElement;
          const imgs = container ? Array.from(container.querySelectorAll("img")) : [];
          imgs.forEach((img) => (pyramid as any)[key].push(noteFromImg(img as HTMLImageElement)));
        });
      } else {
        // notas planas (sem fases)
        const seen = new Set<string>();
        pyr.querySelectorAll("img").forEach((img) => {
          const n = noteFromImg(img as HTMLImageElement);
          if (n.name && !seen.has(n.name) && /sastojci/.test(n.imageUrl || "")) {
            seen.add(n.name);
            pyramid.notas.push(n);
          }
        });
      }
    }

    // ---- votos por região ----
    const findRegionByHeading = (re: RegExp): Element | null => {
      const els = Array.from(document.querySelectorAll("h1,h2,h3,h4,div,section,span"));
      const h = els.find((e) => re.test(ownText(e)));
      return h ? h.closest("section,div") : null;
    };

    // Avaliação e Estações: containers "flex justify-evenly"
    const findByLabels = (labels: string[]): Element | null => {
      const leafs = Array.from(document.querySelectorAll("*")).filter(
        (e) => labels.includes(ownText(e)) && e.children.length === 0
      );
      if (leafs.length < 2) return null;
      // ancestral comum aproximado: sobe até conter >=2 rótulos
      let node: Element | null = leafs[0].parentElement;
      while (node && labels.filter((l) => node!.textContent?.includes(l)).length < labels.length - 1) {
        node = node.parentElement;
      }
      return node;
    };

    const RAT = ["Amo", "Gosto", "OK", "Não Gosto", "Odeio"];
    const SEA = ["Inverno", "Primavera", "Verão", "Outono", "Dia", "Noite"];
    const GEN = ["Feminino", "Mais Feminino", "Unissex", "Mais Masculino", "Masculino"];
    const PRC = ["Muito Caro", "Caro", "OK", "Bom Preço", "Ótimo Preço"];
    const LON = ["Muito Fraco", "Fraco", "Moderada", "Longa Duração", "Eterno"];
    const SIL = ["Íntimo", "Moderada", "Forte", "Enorme"];

    const perf = byId("performance");
    const demo = byId("demographics");

    const rating = readSeries(findByLabels(RAT), RAT);
    const seasons = readSeries(findByLabels(SEA), SEA);
    const gender = readSeries(demo, GEN);
    const price = readSeries(demo, PRC);
    const longevity = readSeries(perf, LON);
    const sillage = readSeries(perf, SIL);

    // ---- similares ----
    const similar: { name: string; url: string }[] = [];
    byId("similar")?.querySelectorAll("a[href*='/perfume/']").forEach((a) => {
      const el = a as HTMLAnchorElement;
      const nm = clean(el.textContent);
      if (nm) similar.push({ name: nm, url: el.href });
    });

    return {
      id, url, name, brand, brandUrl, brandLogoUrl, mainImageUrl, year, description: desc,
      accords, pyramid, rating, ratingValue, ratingCount, seasons, gender, price,
      longevity, sillage, similar,
    };
  });
}
