/**
 * tabs.tsx — Barra de abas inferior (a navegação do app).
 *
 * Três destinos, como manda o desenho: Descobrir (o deck), Meu Laboratório
 * (o que recebeu swipe pra direita) e Fórmulas (simulação de acordes).
 * O contador de favoritos fica no ícone do Laboratório, então o usuário vê a
 * paleta crescer sem sair da tela de swipe.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDeckState } from "@/lib/deck-store";

const TABS = [
  { href: "/", label: "Descobrir", icon: DeckIcon },
  { href: "/lab", label: "Laboratório", icon: FlaskIcon },
  { href: "/paleta", label: "Paleta", icon: GridIcon },
  { href: "/formulas", label: "Fórmulas", icon: DropIcon },
];

export default function Tabs() {
  const pathname = usePathname();
  const state = useDeckState();
  const likes = Object.values(state.swipes).filter((s) => s.dir === "like").length;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-soft)]
                 bg-[var(--bg)]/92 backdrop-blur-xl safe-bottom"
      aria-label="Navegação principal"
    >
      <ul className="mx-auto flex max-w-lg">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          const Icon = t.icon;
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className="flex h-[var(--tab-h)] flex-col items-center justify-center gap-1
                           text-[10.5px] font-semibold tracking-wide transition-colors"
                style={{ color: active ? "var(--fam)" : "var(--muted)" }}
              >
                <span className="relative">
                  <Icon active={active} />
                  {t.href === "/lab" && likes > 0 && (
                    <span
                      className="absolute -right-3 -top-1.5 min-w-[17px] rounded-full px-1
                                 text-center text-[9.5px] font-bold leading-[17px] text-black"
                      style={{ background: "var(--fam)" }}
                    >
                      {likes > 99 ? "99+" : likes}
                    </span>
                  )}
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function DeckIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="6" y="4" width="12" height="16" rx="3" stroke="currentColor" strokeWidth="1.7"
        fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.18 : 0} />
      <path d="M3.5 7.5v9M20.5 7.5v9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function FlaskIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9.5 3v5.2L4.7 17a2.4 2.4 0 0 0 2.1 3.6h10.4a2.4 2.4 0 0 0 2.1-3.6l-4.8-8.8V3"
        stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"
        fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.18 : 0} />
      <path d="M8.2 3h7.6M6.8 14h10.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      {[
        [4, 4], [13.5, 4], [4, 13.5], [13.5, 13.5],
      ].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="6.5" height="6.5" rx="1.6"
          stroke="currentColor" strokeWidth="1.7"
          fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.18 : 0} />
      ))}
    </svg>
  );
}

function DropIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3.2s6 6.4 6 10.3a6 6 0 1 1-12 0C6 9.6 12 3.2 12 3.2Z"
        stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"
        fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.18 : 0} />
    </svg>
  );
}
