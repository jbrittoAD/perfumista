/*
 * sw.js — Service Worker da PWA Perfumista (offline-first).
 *
 * Estratégia:
 *  - install: pré-cacheia o "app shell" essencial ("/", manifest, ícones) para
 *    a primeira carga offline funcionar mesmo sem visitar cada página antes.
 *  - fetch (GET):
 *      * navegações (documentos HTML): network-first com fallback ao cache e,
 *        em último caso, à página "/" cacheada (SPA-like offline).
 *      * demais assets (JS/CSS/JSON/imagens): stale-while-revalidate — responde
 *        do cache imediatamente e atualiza o cache em segundo plano.
 *  - activate: limpa caches de versões antigas.
 *
 * O cache é VERSIONADO: bump CACHE_VERSION a cada deploy para invalidar o antigo.
 */

const CACHE_VERSION = "perfumista-deck-v1";
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// URLs BASE-RELATIVAS: resolvem contra a URL do próprio SW (${base}/sw.js), então
// funcionam tanto na raiz quanto em subpath (ex. /perfumista/) sem alterar nada.
// Pré-cacheia o shell + as telas principais no install, pra offline robusto já
// na 1ª abertura. Os chunks/JS de cada tela entram via runtime (stale-while-revalidate).
const PRECACHE_URLS = [
  "./",
  "./lab",
  "./formulas",
  "./manifest.webmanifest",
  "./photos/credits.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      // Tolerante a falhas: assets ausentes não devem abortar o install.
      await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Coloca uma resposta ok no cache (clone). Ignora erros de quota. */
async function putInCache(request, response) {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, response);
  } catch {
    /* quota/opacity: ignora */
  }
}

/** Stale-while-revalidate: cache imediato + atualização em background. */
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.ok && response.type === "basic") {
        void putInCache(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);
  return cached || (await fetchPromise) || Response.error();
}

/** Navegações: network-first, cai para cache e por fim para o root do escopo. */
async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) void putInCache(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback ao root do ESCOPO do SW (funciona em qualquer base), não "/".
    const rootUrl = new URL("./", self.registration.scope).toString();
    const shell = await caches.match(rootUrl);
    if (shell) return shell;
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Só interceptamos GET same-origin (deixa POST/analytics/externos passarem).
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
