import { renderPerfume, closeContext } from "./browser.js";
import { extractPerfume } from "./extract.js";

const url = process.argv[2] ?? "https://www.fragrantica.com.br/perfume/InEstasy/N-52-59702.html";

const run = async () => {
  console.log(`[test] renderizando ${url}`);
  const { page } = await renderPerfume(url);
  const data = await extractPerfume(page);
  await page.close();

  console.log("\n===== RESULTADO =====");
  console.log("nome:", data.name, "| marca:", data.brand, "| ano:", data.year, "| id:", data.id);
  console.log("imagem:", data.mainImageUrl);
  console.log("logo marca:", data.brandLogoUrl);
  console.log("nota média:", data.ratingValue, "de", data.ratingCount, "votos");
  console.log("acordes:", data.accords.map((a) => `${a.name}(${a.width}%)`).join(", "));
  const p = data.pyramid;
  console.log("pirâmide topo:", p.topo.map((n) => n.name).join(", ") || "-");
  console.log("pirâmide coração:", p.coracao.map((n) => n.name).join(", ") || "-");
  console.log("pirâmide base:", p.base.map((n) => n.name).join(", ") || "-");
  console.log("notas (flat):", p.notas.map((n) => n.name).join(", ") || "-");
  console.log("avaliação:", JSON.stringify(data.rating));
  console.log("estações:", JSON.stringify(data.seasons));
  console.log("gênero:", JSON.stringify(data.gender));
  console.log("preço:", JSON.stringify(data.price));
  console.log("longevidade:", JSON.stringify(data.longevity));
  console.log("rastro:", JSON.stringify(data.sillage));
  console.log("similares:", data.similar.slice(0, 5).map((s) => s.name).join(" | "));

  await closeContext();
};
run().catch((e) => { console.error(e); process.exit(1); });
