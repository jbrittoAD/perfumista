import { chromium, type BrowserContext, type Page } from "playwright";
import { join } from "node:path";
import { DATA_DIR } from "./db.js";

const PROFILE_DIR = join(DATA_DIR, ".pw-profile");

// UA realista de Chrome no macOS. Mantém coerência com o Chromium do Playwright.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

let ctx: BrowserContext | null = null;

export async function getContext(): Promise<BrowserContext> {
  if (ctx) return ctx;
  // HEADLESS=0 => janela visível (passa melhor pelo Cloudflare). Default: visível.
  const headless = process.env.HEADLESS === "1";
  // CHANNEL=chromium usa o Chromium do Playwright; default usa o Chrome real instalado.
  const channel = process.env.CHANNEL === "chromium" ? undefined : "chrome";
  // Contexto persistente => guarda cookies (cf_clearance) entre execuções.
  ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless,
    channel,
    userAgent: USER_AGENT,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    viewport: { width: 1366, height: 900 },
    args: ["--disable-blink-features=AutomationControlled"],
  });
  // Esconde o navigator.webdriver que denuncia automação.
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  // tsx/esbuild injeta o helper __name nas funções passadas a page.evaluate;
  // como ele não existe no browser, definimos um no-op no contexto da página.
  await ctx.addInitScript(() => {
    // @ts-ignore
    (globalThis as any).__name = (globalThis as any).__name || ((fn: any) => fn);
  });
  return ctx;
}

export async function closeContext() {
  if (ctx) {
    await ctx.close();
    ctx = null;
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Espera aleatória (pacing humano) entre min e max ms. */
export const jitter = (min: number, max: number) => sleep(min + Math.random() * (max - min));

export interface FetchResult {
  ok: boolean;
  status: number;
  html: string;
  url: string;
}

/**
 * Abre a página de um perfume totalmente renderizada (widgets Vue hidratados).
 * Trata o desafio intermitente do Cloudflare com retries. Retorna o `page` aberto
 * (lembre de fechar) + o HTML final. Lança se não conseguir renderizar.
 */
export async function renderPerfume(url: string): Promise<{ page: import("playwright").Page; html: string }> {
  const context = await getContext();
  const page = await context.newPage();
  let ready = false;
  for (let attempt = 1; attempt <= 4 && !ready; attempt++) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    try {
      await page.waitForSelector('h1[itemprop="name"]', { timeout: 20000 });
      ready = true;
    } catch {
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      await jitter(2000, 4500);
    }
  }
  if (!ready) {
    await page.close();
    throw new Error("bloqueado/timeout (Cloudflare?) — não renderizou h1");
  }
  // rola pra hidratar os widgets client-side
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 70));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForFunction(() => /Longevidade|Rastro|Desempenho/.test(document.body.innerText), { timeout: 12000 }).catch(() => {});
  await jitter(800, 1500);
  const html = await page.content();
  return { page, html };
}

/**
 * Navega até `url` num navegador real. Retorna o HTML.
 * Detecta bloqueio do Cloudflare (403 / página de desafio).
 */
export async function fetchPage(url: string, opts: { waitFor?: string } = {}): Promise<FetchResult> {
  const context = await getContext();
  const page: Page = await context.newPage();
  try {
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    const status = resp?.status() ?? 0;

    // Se caiu no desafio do Cloudflare, espera ele resolver sozinho (JS challenge).
    const title = await page.title().catch(() => "");
    if (status === 403 || /just a moment|checking your browser|attention required/i.test(title)) {
      // dá tempo do challenge rodar e redirecionar
      await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
      await jitter(2000, 4000);
    }

    if (opts.waitFor) {
      await page.waitForSelector(opts.waitFor, { timeout: 15000 }).catch(() => {});
    }

    const html = await page.content();
    const finalStatus = resp?.status() ?? status;
    const blocked =
      finalStatus === 403 ||
      /just a moment|checking your browser|attention required|cf-error/i.test(html.slice(0, 4000));

    return { ok: !blocked, status: finalStatus, html, url: page.url() };
  } finally {
    await page.close();
  }
}
