import { fetchPage, closeContext } from "./browser.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR } from "./db.js";

// Página de teste (a mesma dos screenshots). Passe outra URL como argumento se quiser.
const url = process.argv[2] ?? "https://www.fragrantica.com.br/perfume/By-Kilian/Angels-Share-59702.html";

const run = async () => {
  console.log(`[probe] buscando: ${url}`);
  const t0 = Date.now();
  const res = await fetchPage(url, { waitFor: 'h1' });
  console.log(`[probe] status=${res.status} ok=${res.ok} bytes=${res.html.length} em ${Date.now() - t0}ms`);

  const dir = join(DATA_DIR, "html-dumps");
  mkdirSync(dir, { recursive: true });
  const out = join(dir, "probe.html");
  writeFileSync(out, res.html);
  console.log(`[probe] HTML salvo em: ${out}`);

  await closeContext();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
