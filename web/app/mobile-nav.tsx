"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navegação mobile: barra inferior fixa (bottom tab bar) com os 5 itens
 * principais + um botão "Mais" que abre um drawer com os demais. Só aparece no
 * mobile (lg:hidden no wrapper). Alvos >=44px, respeitando a safe-area inferior.
 */

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const PRIMARY: NavItem[] = [
  { href: "/hoje", label: "Hoje", icon: "☀️" },
  { href: "/curso", label: "Curso", icon: "🎓" },
  { href: "/", label: "Catálogo", icon: "🧪" },
  { href: "/fragrancias", label: "Fragrâncias", icon: "🌸" },
  { href: "/direto", label: "Direto", icon: "🎯" },
];

const MORE: NavItem[] = [
  { href: "/explorar", label: "Explorar", icon: "🧭" },
  { href: "/comparar", label: "Comparar", icon: "⚖️" },
  { href: "/acordes", label: "Acordes", icon: "🎼" },
  { href: "/compras", label: "Compras", icon: "🛒" },
  { href: "/revisar", label: "Revisar", icon: "🔁" },
  { href: "/metodo", label: "Método", icon: "📐" },
  { href: "/reverso", label: "Modo Reverso", icon: "🔬" },
  { href: "/formulas", label: "Fórmulas", icon: "📋" },
  { href: "/combinacoes", label: "Combinações", icon: "🧩" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const moreActive = MORE.some((i) => isActive(pathname, i.href));

  return (
    <>
      {/* Drawer "Mais" */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-[var(--border)] bg-[var(--surface)] p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
            <div className="mx-auto mb-2 mt-1 h-1 w-10 rounded-full bg-[var(--border)]" aria-hidden />
            <ul className="grid grid-cols-1 gap-1">
              {MORE.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex min-h-[52px] items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${
                      isActive(pathname, item.href)
                        ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                        : "text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    <span aria-hidden className="text-lg">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav
        className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
        aria-label="Navegação principal"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-6 px-1">
          {PRIMARY.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`group flex min-h-[58px] flex-col items-center justify-center gap-1 px-1 pt-2 pb-1.5 text-[10px] font-medium transition-colors ${
                    active ? "text-[var(--accent)]" : "text-[var(--muted)]"
                  }`}
                >
                  <span
                    className={`flex h-7 w-11 items-center justify-center rounded-full text-lg leading-none transition-colors ${
                      active ? "bg-[var(--accent)]/15" : "group-active:bg-[var(--surface-2)]"
                    }`}
                  >
                    <span aria-hidden>{item.icon}</span>
                  </span>
                  <span className="leading-none">{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              className={`group flex min-h-[58px] w-full flex-col items-center justify-center gap-1 px-1 pt-2 pb-1.5 text-[10px] font-medium transition-colors ${
                moreActive || moreOpen ? "text-[var(--accent)]" : "text-[var(--muted)]"
              }`}
            >
              <span
                className={`flex h-7 w-11 items-center justify-center rounded-full text-lg leading-none transition-colors ${
                  moreActive || moreOpen ? "bg-[var(--accent)]/15" : "group-active:bg-[var(--surface-2)]"
                }`}
              >
                <span aria-hidden>⋯</span>
              </span>
              <span className="leading-none">Mais</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
