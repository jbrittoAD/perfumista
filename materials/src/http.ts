import { db } from "./db.js";
import { gz } from "./normalize.js";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const jitter = (min: number, max: number) => sleep(min + Math.random() * (max - min));

export interface HttpResult { ok: boolean; status: number; text: string }

/**
 * GET simples com headers de navegador, retry + backoff. Para sites SSR sem
 * proteção a bots (Flavorist, Perfumoteca, TGSC, PubChem). Educado por padrão.
 */
export async function httpGet(url: string, tries = 3): Promise<HttpResult> {
  let lastStatus = 0;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": UA,
          "Accept": "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        },
        redirect: "follow",
      });
      lastStatus = res.status;
      if (res.ok) return { ok: true, status: res.status, text: await res.text() };
      if (res.status === 404) return { ok: false, status: 404, text: "" };
    } catch {
      /* rede — tenta de novo */
    }
    await jitter(800 * (i + 1), 1600 * (i + 1)); // backoff
  }
  return { ok: false, status: lastStatus, text: "" };
}

/** Salva o HTML bruto comprimido para permitir reparse sem re-raspar. */
export function saveRaw(source: string, url: string, html: string) {
  db.prepare(
    "INSERT OR REPLACE INTO pages_raw(source,url,html_gz,fetched_at) VALUES(?,?,?,datetime('now'))"
  ).run(source, url, gz(html));
}
