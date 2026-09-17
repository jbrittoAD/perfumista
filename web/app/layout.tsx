import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Tabs from "./tabs";
import SwRegister from "./sw-register";
import InstallPrompt from "./install-prompt";

// Inter auto-hospedada no build: a PWA continua com a tipografia certa offline.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// O Next não prefixa metadata.manifest/icons com o basePath; fazemos à mão para
// o deploy em subpath (GitHub Pages) não dar 404.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "Perfumista — Deck de Matérias-Primas",
  description:
    "Descubra químicos aromáticos no swipe, monte sua paleta e simule acordes. 590 matérias-primas com preço no Brasil.",
  applicationName: "Perfumista",
  manifest: `${BASE}/manifest.webmanifest`,
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Perfumista" },
  icons: { icon: `${BASE}/icons/icon-192.png`, apple: `${BASE}/icons/apple-touch-icon.png` },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#08080a",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full`}>
      <body className="min-h-full antialiased">
        {/* pb = altura da tab bar + safe area, para nada ficar escondido atrás dela */}
        <main className="mx-auto min-h-[100dvh] w-full max-w-lg pb-[calc(var(--tab-h)+env(safe-area-inset-bottom,0px))]">
          {children}
        </main>
        <Tabs />
        <InstallPrompt />
        <SwRegister />
      </body>
    </html>
  );
}
