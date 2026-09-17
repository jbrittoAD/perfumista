"use client";

import { useEffect, useState } from "react";

/**
 * InstallPrompt — banner discreto no rodapé (acima da bottom-nav) que ajuda a
 * instalar a PWA:
 *
 *  - Android / Chrome desktop: captura `beforeinstallprompt`, previne o mini-
 *    infobar e mostra um botão "📲 Instalar app" que dispara prompt(). Some ao
 *    receber `appinstalled`.
 *  - iOS Safari: não há API de instalação — detecta iOS + não-standalone e
 *    mostra a instrução manual (Compartilhar → Adicionar à Tela de Início).
 *  - Não aparece se já está rodando standalone (app instalado aberto).
 *  - Dismissível: o "fechar" é lembrado no localStorage (não incomoda de novo).
 *
 * Sem dependências externas; guardado para o pré-render (build) não quebrar.
 * ESM, sem extensão nos imports.
 */

const DISMISS_KEY = "perfumista:install-dismissed";

/** Evento não-tipado no lib.dom padrão; declaramos o mínimo que usamos. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mm = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  // iOS expõe navigator.standalone (não-padrão) quando aberto da tela de início.
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mm || iosStandalone;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOSDevice = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ se identifica como Mac; detecta pelo toque.
  const iPadOS = /macintosh/i.test(ua) && typeof document !== "undefined" && "ontouchend" in document;
  return iOSDevice || iPadOS;
}

function wasDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberDismiss(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* ignora quota / modo privado */
  }
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true); // começa oculto (evita flash)

  useEffect(() => {
    if (isStandalone() || wasDismissed()) return;

    // iOS: sem beforeinstallprompt — mostra a dica manual (só no Safari mobile).
    if (isIos()) {
      setIosHint(true);
      setDismissed(false);
      return;
    }

    // Android/desktop Chrome: aguarda o evento de instalação.
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setDismissed(false);
    };
    const onInstalled = () => {
      setDeferred(null);
      setDismissed(true);
    };
    window.addEventListener("beforeinstallprompt", onBip as EventListener);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip as EventListener);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function close() {
    rememberDismiss();
    setDismissed(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setDeferred(null);
      setDismissed(true);
    }
  }

  // Nada a mostrar: fechado, ou nem iOS nem prompt disponível.
  if (dismissed || (!iosHint && !deferred)) return null;

  return (
    <div
      className="fixed inset-x-0 z-30 px-3"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.5rem)" }}
      role="region"
      aria-label="Instalar app"
    >
      <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-[var(--fam)]/40 bg-[var(--surface)]/95 p-3 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        <span aria-hidden className="text-xl leading-none">📲</span>
        {deferred ? (
          <>
            <p className="min-w-0 flex-1 text-xs leading-snug text-[var(--fg)]">
              Instale o Perfumista pra abrir offline, direto da tela de início.
            </p>
            <button
              type="button"
              onClick={install}
              className="shrink-0 rounded-lg border border-[var(--fam)] bg-[var(--fam)]/15 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-[var(--fam)] transition-colors hover:bg-[var(--fam)]/25"
            >
              Instalar app
            </button>
          </>
        ) : (
          <p className="min-w-0 flex-1 text-xs leading-snug text-[var(--fg)]">
            Pra instalar: toque em <strong>Compartilhar ⬆️</strong> e{" "}
            <strong>“Adicionar à Tela de Início”</strong>.
          </p>
        )}
        <button
          type="button"
          onClick={close}
          aria-label="Fechar aviso de instalação"
          className="shrink-0 rounded-md px-1.5 py-1 text-lg leading-none text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
        >
          ×
        </button>
      </div>
    </div>
  );
}
