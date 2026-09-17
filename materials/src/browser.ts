import { chromium, type BrowserContext } from "playwright";
import { join } from "node:path";
import { DATA_DIR } from "./db.js";

const PROFILE_DIR = join(DATA_DIR, ".pw-profile");
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

let ctx: BrowserContext | null = null;

/**
 * Contexto Playwright anti-bot: Chrome real + contexto persistente (guarda cf_clearance).
 * HEADLESS=1 força headless; default é headed (passa melhor por Cloudflare).
 * CHANNEL=chromium usa o Chromium do Playwright em vez do Chrome instalado.
 */
export async function getContext(): Promise<BrowserContext> {
  if (ctx) return ctx;
  const headless = process.env.HEADLESS === "1";
  const channel = process.env.CHANNEL === "chromium" ? undefined : "chrome";
  ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless,
    channel,
    userAgent: USER_AGENT,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    viewport: { width: 1366, height: 900 },
    args: ["--disable-blink-features=AutomationControlled"],
  });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    // no-op p/ helper __name que o esbuild injeta em funções de page.evaluate
    (globalThis as any).__name = (globalThis as any).__name || ((fn: any) => fn);
  });
  return ctx;
}

export async function closeContext() {
  if (ctx) { await ctx.close(); ctx = null; }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const jitter = (min: number, max: number) => sleep(min + Math.random() * (max - min));

export interface FetchResult { ok: boolean; status: number; html: string; url: string }

/**
 * Busca o HTML de uma URL num navegador real, tratando o desafio Cloudflare.
 * `waitFor` = seletor que confirma que a página real carregou.
 */
export async function fetchHtml(url: string, opts: { waitFor?: string } = {}): Promise<FetchResult> {
  const context = await getContext();
  const page = await context.newPage();
  try {
    let status = 0;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      status = resp?.status() ?? 0;
      const title = await page.title().catch(() => "");
      const challenged = status === 403 || /just a moment|checking your browser|attention required/i.test(title);
      if (!challenged) {
        if (opts.waitFor) await page.waitForSelector(opts.waitFor, { timeout: 15000 }).catch(() => {});
        break;
      }
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      await jitter(2000, 4000);
    }
    const html = await page.content();
    const blocked =
      /just a moment|checking your browser|attention required|cf-error/i.test(html.slice(0, 4000)) ||
      html.length < 2000;
    return { ok: !blocked, status, html, url: page.url() };
  } finally {
    await page.close();
  }
}
