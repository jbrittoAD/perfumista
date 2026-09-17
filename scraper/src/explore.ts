import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { DATA_DIR } from "./db.js";

const html = readFileSync(join(DATA_DIR, "html-dumps", "probe2.html"), "utf8");
const $ = cheerio.load(html);

function ancestorWithId(el: cheerio.Cheerio<any>): string {
  const withId = el.parents().filter((i, e) => !!$(e).attr("id")).first();
  return withId.attr("id") || "(sem id ancestral)";
}

// 1) PIRÂMIDE
console.log("\n===== PIRÂMIDE (#pyramid) =====");
const pyramid = $("#pyramid");
console.log("existe:", pyramid.length > 0, "| filhos:", pyramid.children().length);
console.log("innerText (primeiros 400):", pyramid.text().replace(/\s+/g, " ").trim().slice(0, 400));
console.log("exemplo de nota (img+label):");
pyramid.find("img").slice(0, 3).each((i, e) => {
  console.log(`  img src=${$(e).attr("src")} alt=${$(e).attr("alt")}`);
});

// 2) VOTOS: achar os textos-âncora e reportar id ancestral + estrutura
for (const anchor of ["Amo", "Inverno", "Longa Duração", "Muito Caro", "Unissex", "Íntimo"]) {
  const leaf = $("*").filter((i, e) => {
    const own = $(e).clone().children().remove().end().text().trim();
    return own === anchor;
  }).first();
  console.log(`\n===== "${anchor}" =====`);
  if (!leaf.length) { console.log("  não achado como folha"); continue; }
  console.log("  tag:", (leaf.get(0) as any).tagName, "| classe:", ($(leaf).attr("class") || "").slice(0, 60));
  console.log("  id ancestral:", ancestorWithId(leaf));
  const block = leaf.closest("[id]");
  console.log("  bloco pai innerText:", block.text().replace(/\s+/g, " ").trim().slice(0, 160));
}
