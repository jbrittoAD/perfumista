import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import SwRegister from "./sw-register";
import MobileNav from "./mobile-nav";
import InstallPrompt from "./install-prompt";

// basePath do deploy (vazio na raiz, "/perfumista" no GitHub Pages). O Next NÃO
// prefixa automaticamente metadata.manifest/icons com o basePath, então fazemos
// isso à mão pra os links não darem 404 sob subpath.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "Perfumista — Perfumaria",
  description: "Catálogo de químicos aromáticos, preços e dados técnicos para perfumistas.",
  applicationName: "Perfumista",
  manifest: `${BASE}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Perfumista",
  },
  icons: {
    icon: `${BASE}/icons/icon-192.png`,
    apple: `${BASE}/icons/apple-touch-icon.png`,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0b0d",
};

const NAV_LINKS = [
  { href: "/hoje", label: "Hoje" },
  { href: "/", label: "Catálogo" },
  { href: "/explorar", label: "Explorar" },
  { href: "/comparar", label: "Comparar" },
  { href: "/fragrancias", label: "Fragrâncias" },
  { href: "/acordes", label: "Acordes" },
  { href: "/compras", label: "Compras" },
  { href: "/curso", label: "Curso" },
  { href: "/metodo", label: "Método" },
  { href: "/revisar", label: "Revisar" },
  { href: "/formulas", label: "Fórmulas" },
  { href: "/combinacoes", label: "Combinações" },
  { href: "/direto", label: "Modo Direto" },
  { href: "/reverso", label: "Modo Reverso" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/75 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-2.5 lg:py-3">
            <Link
              href="/hoje"
              className="flex shrink-0 items-center gap-2 font-semibold tracking-tight text-[17px] lg:text-lg"
            >
              <span
                aria-hidden
                className="grid h-8 w-8 place-items-center rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 text-base"
              >
                🧪
              </span>
              <span>Perfumista</span>
            </Link>
            {/* Desktop: todos os itens. No mobile some (usamos a bottom tab bar). */}
            <nav className="hidden lg:flex flex-wrap gap-x-1 gap-y-1 text-sm">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-lg px-2.5 py-1 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        {/* pb extra no mobile para o conteúdo não ficar atrás da bottom tab bar. */}
        <main className="mx-auto w-full max-w-6xl px-4 py-6 flex-1 pb-[calc(env(safe-area-inset-bottom)+5rem)] lg:pb-6">
          {children}
        </main>

        <InstallPrompt />
        <MobileNav />
        <SwRegister />
      </body>
    </html>
  );
}
