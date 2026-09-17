import { getContext, closeContext, jitter, sleep } from "./browser.js";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR } from "./db.js";

const url = process.argv[2] ?? "https://www.fragrantica.com.br/perfume/InEstasy/N-52-59702.html";

const run = async () => {
  const ctx = await getContext();
  const page = await ctx.newPage();

  console.log(`[probe2] ${url}`);
  // Retry: o Turnstile é intermitente. Tenta até o <h1 itemprop=name> aparecer.
  let ready = false;
  for (let attempt = 1; attempt <= 4 && !ready; attempt++) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    try {
      await page.waitForSelector('h1[itemprop="name"]', { timeout: 20000 });
      ready = true;
    } catch {
      console.log(`  tentativa ${attempt}: desafio/lento, esperando...`);
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      await jitter(2000, 4000);
    }
  }
  console.log(`  h1 pronto: ${ready}`);

  // Rola pra disparar render dos widgets client-side.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  });

  // Espera os widgets de voto hidratarem (label injetado no DOM visível).
  await page
    .waitForFunction(() => /Longevidade|Rastro/.test(document.body.innerText), { timeout: 15000 })
    .catch(() => console.log("  (aviso: 'Longevidade' não apareceu no texto)"));
  await sleep(1500);

  const html = await page.content();
  writeFileSync(join(DATA_DIR, "html-dumps", "probe2.html"), html);
  console.log(`  bytes renderizados: ${html.length}`);

  // Reporta o que está VISÍVEL agora
  const checks = ["Longa Duração", "Moderada", "Inverno", "Amo", "Odeio", "Muito Caro", "Unissex", "Principais Acordes", "Notas de Topo"];
  for (const c of checks) console.log(`  ${c}: ${html.includes(c) ? "SIM" : "não"}`);

  await closeContext();
};
run().catch((e) => { console.error(e); process.exit(1); });
