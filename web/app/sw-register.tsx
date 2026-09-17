"use client";

import { useEffect } from "react";
import { initSyncOnLoad } from "@/lib/sync";

// basePath do deploy (vazio na raiz, "/perfumista" no GitHub Pages). Inlinado
// no bundle em build time via NEXT_PUBLIC_*.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

/**
 * Registra o Service Worker (${BASE}/sw.js) no window load, com scope ${BASE}/,
 * e dispara a sincronização de progresso em background (se houver código).
 * Componente sem UI, incluído uma vez no layout. Guardado por checagens de
 * ambiente para o pré-render (build) não quebrar. Falhas são silenciosas — o
 * app segue funcionando offline.
 */
export default function SwRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker
        .register(`${BASE}/sw.js`, { scope: `${BASE}/` })
        .catch(() => {
          /* registro falhou: ignora (sem offline, mas app funciona) */
        });
    };
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  // Sincronização inicial em background — não bloqueia a UI; no-op sem código.
  useEffect(() => {
    initSyncOnLoad();
  }, []);

  return null;
}
