#!/usr/bin/env node
/**
 * e2e_app.mjs — abre o app num Chrome de verdade e confere o que não dá para
 * conferir lendo código: se a posição de leitura volta, se o áudio toca, se o
 * capítulo guardado toca com a rede cortada.
 *
 * Por que existe: o caso de uso é avião. "Compila" não prova nada disso, e
 * testar na mão toda vez é como as regressões passam.
 *
 *   node web/scripts/e2e_app.mjs            # usa o build local em web/out
 *   node web/scripts/e2e_app.mjs --ar       # testa o site publicado
 *
 * Node 26 tem WebSocket nativo, então não precisa de puppeteer.
 */
import { createServer } from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { rmSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const OUT = join(RAIZ, "web", "out");
const BASE = "/perfumista";
const NO_AR = process.argv.includes("--ar");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".mp3": "audio/mpeg", ".pdf": "application/pdf",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".woff2": "font/woff2", ".txt": "text/plain", ".ico": "image/x-icon" };

/* ---------- servidor que imita o GitHub Pages ---------- */
// Vira true no meio do teste para servir um sw.js com versão nova, que é como
// um deploy chega no aparelho de quem já tem o app instalado.
let deployNovo = false;
// Range é obrigatório: sem ele o <audio> não busca posição nem toca em alguns
// navegadores, e o erro só aparece no aparelho.
function servir(porta) {
  return new Promise((ok) => {
    const s = createServer(async (req, res) => {
      let p = decodeURIComponent(req.url.split("?")[0]);
      if (p.startsWith(BASE)) p = p.slice(BASE.length) || "/";
      let f = normalize(join(OUT, p));
      if (!f.startsWith(OUT)) return res.writeHead(403).end();
      // O export do Next cria livros.html E uma pasta livros/ (sem index).
      // O Pages serve o .html; se procurar a pasta primeiro, dá 404. Ordem:
      // arquivo exato → x.html → índice da pasta.
      let st = await stat(f).catch(() => null);
      if (!st || st.isDirectory()) {
        const html = await stat(f + ".html").catch(() => null);
        if (html) { f += ".html"; st = html; }
        else if (st?.isDirectory()) {
          const idx = join(f, "index.html");
          const i = await stat(idx).catch(() => null);
          if (i) { f = idx; st = i; } else st = null;
        }
      }
      if (!st) return res.writeHead(404).end("404");
      const tipo = TIPOS[extname(f)] || "application/octet-stream";
      let buf = await readFile(f);
      if (deployNovo && f.endsWith("sw.js")) {
        buf = Buffer.from(buf.toString().replace(/perfumista-deck-v\d+/g, "perfumista-deck-v999"));
      }
      const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
      if (range) {
        const ini = Number(range[1] || 0);
        const fim = range[2] ? Number(range[2]) : buf.length - 1;
        res.writeHead(206, { "Content-Type": tipo, "Accept-Ranges": "bytes",
          "Content-Range": `bytes ${ini}-${fim}/${buf.length}`, "Content-Length": fim - ini + 1 });
        return res.end(buf.subarray(ini, fim + 1));
      }
      res.writeHead(200, { "Content-Type": tipo, "Accept-Ranges": "bytes", "Content-Length": buf.length });
      res.end(buf);
    });
    s.listen(porta, () => ok(s));
  });
}

/* ---------- Chrome por CDP ---------- */
class Aba {
  constructor(ws) { this.ws = ws; this.n = 0; this.pend = new Map(); this.sess = null;
    ws.addEventListener("message", (e) => {
      const m = JSON.parse(e.data);
      if (m.id && this.pend.has(m.id)) {
        const { ok, no } = this.pend.get(m.id); this.pend.delete(m.id);
        m.error ? no(new Error(m.error.message)) : ok(m.result);
      }
    });
  }
  cmd(method, params = {}) {
    const id = ++this.n;
    // sessionId: null faz o Chrome recusar o comando. Só vai quando existe.
    const msg = { id, method, params };
    if (this.sess) msg.sessionId = this.sess;
    this.ws.send(JSON.stringify(msg));
    return new Promise((ok, no) => {
      this.pend.set(id, { ok, no });
      setTimeout(() => this.pend.has(id) && (this.pend.delete(id), no(new Error(`timeout ${method}`))), 180000);
    });
  }
  async js(expr) {
    const r = await this.cmd("Runtime.evaluate", {
      expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "erro no js");
    return r.result.value;
  }
  ir(url) { return this.cmd("Page.navigate", { url }); }
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function abrirChrome(porta) {
  const perfil = `/tmp/chrome-e2e-${Date.now()}`;
  let ultimo = null;
  const p = spawn(CHROME, ["--headless=new", "--disable-gpu", "--mute-audio",
    "--autoplay-policy=no-user-gesture-required", `--remote-debugging-port=${porta}`,
    `--user-data-dir=${perfil}`, "--no-first-run", "--no-default-browser-check", "about:blank"],
    { stdio: "ignore" });
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${porta}/json/list`);
      const alvos = (await r.json()).filter((t) => t.type === "page");
      if (alvos[0]) {
        const ws = new WebSocket(alvos[0].webSocketDebuggerUrl);
        await new Promise((ok) => ws.addEventListener("open", ok, { once: true }));
        const aba = new Aba(ws);
        await aba.cmd("Page.enable"); await aba.cmd("Runtime.enable"); await aba.cmd("Network.enable");
        return { aba, p, perfil };
      }
    } catch (e) { ultimo = e; }
    await espera(250);
  }
  throw new Error(`o Chrome não subiu: ${ultimo?.message ?? "sem alvo de página"}`);
}

/* ---------- os testes ---------- */
const provas = [];
const prova = (nome, ok, detalhe = "") => {
  provas.push({ nome, ok, detalhe });
  console.log(`  ${ok ? "ok " : "FALHOU"}  ${nome}${detalhe ? `  — ${detalhe}` : ""}`);
};

async function carregar(aba, url) {
  await aba.ir(url);
  for (let i = 0; i < 80; i++) {
    const pronto = await aba.js(`return document.readyState === "complete" && !!document.querySelector("main, body > div")`).catch(() => false);
    if (pronto) { await espera(400); return; }
    await espera(250);
  }
  throw new Error(`não carregou: ${url}`);
}

async function main() {
  const porta = 4577, cdp = 9377;
  const srv = NO_AR ? null : await servir(porta);
  const RAIZ_URL = NO_AR ? "https://jbrittoad.github.io/perfumista" : `http://localhost:${porta}${BASE}`;
  console.log(`testando ${RAIZ_URL}\n`);
  const { aba, p, perfil } = await abrirChrome(cdp);
  try {
    /* 1. o app abre e tem as 5 abas */
    await carregar(aba, `${RAIZ_URL}/`);
    const abas = await aba.js(`return [...document.querySelectorAll('nav a')].map(a => a.textContent.trim())`);
    prova("o app abre com as 5 abas", abas.length >= 5, abas.join(" · "));

    /* 2. o service worker registra (é ele que faz o offline) */
    const sw = await aba.js(`
      const r = await navigator.serviceWorker.getRegistration();
      if (r) return true;
      await new Promise(ok => setTimeout(ok, 3000));
      return !!(await navigator.serviceWorker.getRegistration());`);
    prova("service worker registrado", sw === true);

    /* 3. a estante lista os livros */
    await carregar(aba, `${RAIZ_URL}/livros`);
    // Contar link solto dá número inflado (o cabeçalho e o card do áudio também
    // apontam pra /livros/). Contar destino único é o que pega livro faltando.
    const nLivros = await aba.js(`
      const u = new Set([...document.querySelectorAll('a[href*="/livros/"]')]
        .map(a => a.getAttribute('href')).filter(h => !h.endsWith('/audio')));
      return u.size;`);
    prova("a estante lista os 18 livros", nLivros === 18, `${nLivros} livros`);

    /* 4. a posição de leitura volta ao reabrir */
    await carregar(aba, `${RAIZ_URL}/livros/04-sabonete`);
    await aba.js(`
      const el = document.scrollingElement;
      el.scrollTop = Math.round(el.scrollHeight * 0.45);
      window.dispatchEvent(new Event("scroll"));
      await new Promise(ok => setTimeout(ok, 1200));
      return el.scrollTop;`);
    const salvo = await aba.js(`return JSON.parse(localStorage.getItem("perfumista:livros") || "{}")["04-sabonete"] ?? null`);
    await carregar(aba, `${RAIZ_URL}/livros/04-sabonete`);
    await espera(1500);
    const voltou = await aba.js(`return document.scrollingElement.scrollTop`);
    prova("a leitura volta onde parou", salvo !== null && voltou > 100,
      `salvo ${JSON.stringify(salvo)} · voltou a ${voltou}px`);

    /* 5. o audiolivro lista os capítulos e toca */
    await carregar(aba, `${RAIZ_URL}/livros/audio`);
    // Um botão "Guardar" por faixa: é o contador exato, não 'ul li' solto.
    const nFaixas = await aba.js(`return document.querySelectorAll('button[aria-label^="Guardar"]').length`);
    prova("o audiolivro lista os 16 capítulos", nFaixas === 16, `${nFaixas} faixas`);

    const tocou = await aba.js(`
      document.querySelector('button[aria-label^="Guardar"]').closest('li').querySelector('button').click();
      await new Promise(ok => setTimeout(ok, 3500));
      const a = document.querySelector('audio');
      return { t: a?.currentTime ?? 0, src: a?.currentSrc ?? "", dur: a?.duration ?? 0 };`);
    prova("o áudio realmente toca", tocou.t > 0.4,
      `${tocou.t.toFixed(1)}s de ${isFinite(tocou.dur) ? tocou.dur.toFixed(0) : "?"}s`);

    /* 6. guarda um capítulo e toca com a rede cortada */
    // 3,9 MB de rede de verdade. Contra o site recém-publicado o CDN está frio
    // (x-proxy-cache: MISS) e isso passa de 30 s — o teste precisa medir o
    // tempo, não chutar um limite curto e culpar o app.
    const guardou = await aba.js(`
      const t0 = Date.now();
      const b = [...document.querySelectorAll('ul li button[aria-label^="Guardar"]')][0];
      if (!b) return { erro: "botão não encontrado" };
      b.click();
      for (let i = 0; i < 240; i++) {
        await new Promise(ok => setTimeout(ok, 500));
        const k = await (await caches.open("perfumista-audio")).keys();
        if (k.length) return { urls: k.map(r => r.url), seg: ((Date.now() - t0) / 1000).toFixed(1) };
      }
      return { erro: "não guardou em 120s" };`);
    prova("guarda o capítulo no aparelho", !!guardou.urls,
      guardou.erro ?? `${guardou.urls[0].split("/").pop()} em ${guardou.seg}s`);

    /* 6b. o PDF também tem de ser guardável */
    await carregar(aba, `${RAIZ_URL}/livros`);
    const pdf = await aba.js(`
      // A tela só mostra o botão depois de checar o Cache Storage (useEffect
      // assíncrono). Procurar no primeiro quadro encontra a tela em "checando".
      let b = null;
      for (let i = 0; i < 40; i++) {
        b = [...document.querySelectorAll('button')].find(x => /Guardar o PDF/i.test(x.textContent));
        if (b) break;
        const ja = (await caches.open("perfumista-downloads")).then;
        await new Promise(ok => setTimeout(ok, 250));
      }
      if (!b) {
        const n = (await (await caches.open("perfumista-downloads")).keys()).length;
        return n > 0 ? { ok: true } : { erro: "botão não apareceu e nada no cache" };
      }
      b.click();
      for (let i = 0; i < 80; i++) {
        await new Promise(ok => setTimeout(ok, 500));
        const c = await caches.open("perfumista-downloads");
        if ((await c.keys()).length > 0) return { ok: true };
      }
      return { erro: "não guardou" };`);
    prova("guarda o PDF no aparelho", pdf.ok === true, pdf.erro ?? "");

    await carregar(aba, `${RAIZ_URL}/livros/audio`);
    await aba.cmd("Network.emulateNetworkConditions",
      { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });

    await carregar(aba, `${RAIZ_URL}/livros/audio`).catch(() => {});
    const offline = await aba.js(`
      const ul = document.querySelectorAll('button[aria-label^="Guardar"]').length;
      const g = await caches.open("perfumista-audio");
      const k = (await g.keys()).map(r => r.url);
      if (!k.length) return { ul, tocou: 0, erro: "cache vazio" };
      const a = new Audio(k[0]);
      a.muted = true;
      try { await a.play(); } catch (e) { return { ul, tocou: 0, erro: String(e).slice(0, 80) }; }
      await new Promise(ok => setTimeout(ok, 2500));
      return { ul, tocou: a.currentTime, erro: "" };`);
    prova("o app abre offline", offline.ul === 16, `${offline.ul} faixas na lista`);
    prova("o capítulo guardado toca offline", offline.tocou > 0.4,
      offline.erro || `${offline.tocou.toFixed(1)}s com a rede cortada`);

    // O caso de uso principal: ler o livro no avião. Tem de ser um livro NUNCA
    // aberto nesta sessão — senão o teste só provaria o cache de runtime, e não
    // o precache de instalação, que é o que salva quem instala e embarca.
    await carregar(aba, `${RAIZ_URL}/livros/09-negocio`).catch(() => {});
    const livroOffline = await aba.js(`
      const txt = document.body.innerText || "";
      return { chars: txt.length, tem: /ANVISA|MEI|preço|custo/i.test(txt) };`);
    prova("lê offline um livro nunca aberto antes", livroOffline.tem && livroOffline.chars > 2000,
      `${livroOffline.chars} caracteres na tela, sem rede`);

    await aba.cmd("Network.emulateNetworkConditions",
      { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

    /* 7. publicar uma atualização NÃO pode apagar o que o usuário baixou */
    // Só dá para provar localmente: depende de servir um sw.js com versão nova,
    // e o site publicado é estático. Contra --ar isto é pulado, não reprovado —
    // teste que falha por não poder rodar ensina a ignorar a saída.
    if (NO_AR) {
      console.log("  pula  atualizar o app não apaga o que foi baixado  — só roda local");
    } else {
    deployNovo = true;
    const sobreviveuAoDeploy = await aba.js(`
      // Esperar o cache novo APARECER não serve: ele nasce no install, e quem
      // apaga é o activate, que vem depois. O sinal de que o activate rodou é o
      // cache da versão ANTIGA ter sumido.
      const antes = (await caches.keys()).filter(k => /perfumista-deck-v\\d+/.test(k));
      const reg = await navigator.serviceWorker.getRegistration();
      await reg.update();
      let limpou = false;
      for (let i = 0; i < 60; i++) {
        await new Promise(ok => setTimeout(ok, 500));
        const ks = await caches.keys();
        if (antes.length && antes.every(k => !ks.includes(k)) && ks.some(k => k.includes("v999"))) {
          limpou = true; break;
        }
      }
      const ks = await caches.keys();
      const n = (await (await caches.open("perfumista-audio")).keys()).length;
      const q = (await (await caches.open("perfumista-downloads")).keys()).length;
      return { limpou, faixasGuardadas: n, pdfGuardado: q, antes, depois: ks };`);
    prova("atualizar o app não apaga o que foi baixado",
      sobreviveuAoDeploy.limpou && sobreviveuAoDeploy.faixasGuardadas > 0
        && sobreviveuAoDeploy.pdfGuardado > 0,
      sobreviveuAoDeploy.limpou
        ? `${sobreviveuAoDeploy.faixasGuardadas} faixa(s) e ${sobreviveuAoDeploy.pdfGuardado} PDF sobreviveram`
        : `o activate do SW novo não rodou — caches: ${sobreviveuAoDeploy.depois.join(", ")}`);
    deployNovo = false;
    }

    /* 8. o que eu curti no baralho não some */
    await carregar(aba, `${RAIZ_URL}/`);
    // A chave do swipe é NUMÉRICA e o dir é "like"/"pass" — o sanitize descarta
    // qualquer outra coisa. E o updatedAt precisa ser novo, senão o estado do
    // IndexedDB (mais recente) ganha na hidratação e a curtida "some".
    const deck = await aba.js(`
      const antes = JSON.parse(localStorage.getItem("perfumista:deck-state") || "{}");
      const agora = Date.now();
      localStorage.setItem("perfumista:deck-state", JSON.stringify({
        ...antes, updatedAt: agora,
        swipes: { ...(antes.swipes || {}), 999001: { id: 999001, dir: "like", at: agora } },
      }));
      return true;`);
    await carregar(aba, `${RAIZ_URL}/livros/audio`);
    const sobreviveu = await aba.js(`
      const s = JSON.parse(localStorage.getItem("perfumista:deck-state") || "{}");
      const l = localStorage.getItem("perfumista:livros");
      return { curtida: s.swipes?.["999001"]?.dir === "like", leitura: !!l };`);
    prova("curtida e leitura não derrubam uma à outra", deck && sobreviveu.curtida && sobreviveu.leitura,
      `curtida ${sobreviveu.curtida ? "ok" : "sumiu"} · leitura ${sobreviveu.leitura ? "ok" : "sumiu"}`);
  } finally {
    // p.kill() mata só o processo pai: o Chrome deixa renderer, GPU e rede
    // vivos, e eles ficam rodando na máquina depois do teste. Fecha pelo
    // perfil, que é exclusivo desta execução.
    p.kill();
    // síncrono de propósito: o processo sai logo abaixo, e um pkill assíncrono
    // não chega a rodar.
    spawnSync("pkill", ["-f", `user-data-dir=${perfil}`], { stdio: "ignore" });
    rmSync(perfil, { recursive: true, force: true });   // o perfil é descartável
    srv?.close();
  }

  const ruins = provas.filter((x) => !x.ok);
  console.log();
  console.log(ruins.length ? `${ruins.length} de ${provas.length} falharam` : `${provas.length} provas, todas passaram`);
  process.exit(ruins.length ? 1 : 0);
}

main().catch((e) => { console.error("erro:", e.message); process.exit(2); });
