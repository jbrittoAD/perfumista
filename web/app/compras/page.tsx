"use client";

import { useMemo } from "react";
import Link from "next/link";
import shoppingData from "@/lib/data/shopping.json";
import { CAP_ORDER, capMeta } from "@/lib/cap-colors";

/**
 * /compras — LISTA DE COMPRAS organizada por COR DE TAMPA.
 *
 * Lê shopping.json (objeto { "<cap_color>": [item, ...] } já ordenado do mais
 * disponível/barato) e, para cada cor na ordem canônica, monta um card com a
 * família, a contagem de materiais, quantos lotes de 20 comprar e a lista de
 * materiais (link p/ /material/{id}, preço mínimo em BRL, fornecedor).
 * Os primeiros 20 de cada cor são marcados como "lote 1".
 *
 * 100% client-side/estático (import do JSON), compatível com output:export.
 */

interface ShoppingItem {
  id: number;
  name: string;
  cas: string | null;
  min_price: number | null;
  cheapest_source: string | null;
  offer_count: number;
}

const SHOPPING = shoppingData as unknown as Record<string, ShoppingItem[]>;

const LOTE = 20;

const SOURCE_LABEL: Record<string, string> = {
  flavorist: "Flavorist",
  perfumistico: "Perfumístico",
  perfumoteca: "Perfumoteca",
  euperfumista: "Eu Perfumista",
};

function money(v: number | null) {
  return v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ComprasPage() {
  const { groups, totalColors, totalLotes, totalFrascos, totalCost } = useMemo(() => {
    const groups = CAP_ORDER.map((slug) => {
      const items = SHOPPING[slug] ?? [];
      const lotes = Math.max(1, Math.ceil(items.length / LOTE));
      const cost = items.reduce((sum, it) => sum + (it.min_price ?? 0), 0);
      return { slug, meta: capMeta(slug), items, lotes, cost };
    }).filter((g) => g.meta);

    const totalColors = groups.length;
    const totalLotes = groups.reduce((s, g) => s + g.lotes, 0);
    const totalFrascos = totalLotes * LOTE;
    const totalCost = groups.reduce((s, g) => s + g.cost, 0);
    return { groups, totalColors, totalLotes, totalFrascos, totalCost };
  }, []);

  return (
    <div>
      <div className="mb-5">
        <p className="ui-eyebrow">Organização</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Lista de Compras</h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          Materiais agrupados por <strong className="text-[var(--foreground)]">cor de tampa</strong>{" "}
          (família olfativa). Compre em <strong className="text-[var(--foreground)]">lotes de {LOTE}</strong> por cor.
        </p>
      </div>

      {/* Resumo */}
      <div className="ui-card mb-6 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <div className="text-2xl font-semibold text-[var(--accent)]">{totalColors}</div>
            <div className="text-xs text-[var(--muted)]">cores de tampa</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-[var(--accent)]">{totalLotes}</div>
            <div className="text-xs text-[var(--muted)]">lotes de {LOTE}</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-[var(--accent)]">{totalFrascos}</div>
            <div className="text-xs text-[var(--muted)]">frascos no total</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-[var(--accent)]">{money(totalCost)}</div>
            <div className="text-xs text-[var(--muted)]">estimativa*</div>
          </div>
        </div>
        <p className="mt-3 border-t border-[var(--border)] pt-3 text-[11px] leading-relaxed text-[var(--muted)]">
          {totalLotes} lotes de {LOTE} = {totalFrascos} frascos. *Estimativa somando o preço mínimo de
          1 frasco/decant de cada material listado — o custo real varia por tamanho, diluição e fornecedor.
        </p>
      </div>

      {/* Cards por cor */}
      <div className="flex flex-col gap-5">
        {groups.map(({ slug, meta, items, lotes, cost }) => {
          if (!meta) return null;
          return (
            <section key={slug} className="ui-card overflow-hidden">
              {/* Cabeçalho do card */}
              <header
                className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4"
                style={{ background: `linear-gradient(90deg, ${meta.hex}22, transparent)` }}
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full ring-2 ring-black/30"
                    style={{ backgroundColor: meta.hex }}
                  >
                    <span
                      className="text-xs font-bold"
                      style={{ color: meta.textDark ? "#111" : "#fff" }}
                    >
                      {items.length}
                    </span>
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold leading-tight">{meta.label}</h2>
                    <p className="text-xs capitalize text-[var(--muted)]">Tampa {slug}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="ui-badge border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]">
                    {lotes} {lotes === 1 ? "lote" : "lotes"} de {LOTE}
                  </span>
                  <span className="mt-1 text-[11px] text-[var(--muted)]">
                    {items.length} materiais · ~{money(cost)}
                  </span>
                </div>
              </header>

              {/* Lista de materiais */}
              {items.length === 0 ? (
                <p className="p-4 text-sm text-[var(--muted)]">Nenhum material nesta cor.</p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {items.map((it, i) => {
                    const inLote1 = i < LOTE;
                    return (
                      <li key={it.id}>
                        {i === LOTE && (
                          <div className="bg-[var(--surface-2)] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                            Além do lote 1 ({items.length - LOTE} extra{items.length - LOTE === 1 ? "" : "s"})
                          </div>
                        )}
                        <Link
                          href={`/material/${it.id}`}
                          className={`flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--surface-2)] ${
                            inLote1 ? "" : "opacity-70"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span
                              className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-[10px] font-semibold ${
                                inLote1
                                  ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                                  : "border border-[var(--border)] text-[var(--muted)]"
                              }`}
                            >
                              {i + 1}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm">{it.name}</span>
                              {it.cas && (
                                <span className="block truncate font-mono text-[11px] text-[var(--muted)]">
                                  CAS {it.cas}
                                </span>
                              )}
                            </span>
                          </span>
                          <span className="flex shrink-0 flex-col items-end text-right">
                            <span className="text-sm font-semibold text-[var(--accent)]">
                              {money(it.min_price)}
                            </span>
                            <span className="text-[11px] text-[var(--muted)]">
                              {it.cheapest_source
                                ? SOURCE_LABEL[it.cheapest_source] ?? it.cheapest_source
                                : "—"}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
