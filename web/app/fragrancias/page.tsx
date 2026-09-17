"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAllMaterials, type MaterialCard } from "@/lib/catalog";
import { CAP_ORDER, capMeta, type CapColor } from "@/lib/cap-colors";
import * as buylist from "@/lib/buylist";

/**
 * /fragrancias — VOCÊ ESCOLHE as matérias-primas por COR DE TAMPA (família).
 *
 * Diferente de /compras (sugestão pronta, lotes de 20 por cor): aqui o usuário
 * navega pelas 9 cores, lê um RESUMO claro de cada material (nota, força,
 * descrição de odor, "para que serve", dosagem, IFRA, preço) e marca o que quer
 * comprar. A lista marcada é persistida (localStorage via lib/buylist.ts) e um
 * painel mostra o total, a quebra por cor (→ lotes de 20) e permite exportar.
 *
 * 100% client-side/estático (import do JSON), compatível com output:export.
 */

const LOTE = 20;

const NOTE_LABEL: Record<string, string> = { topo: "Topo", coracao: "Coração", base: "Base" };

const SOURCE_LABEL: Record<string, string> = {
  flavorist: "Flavorist",
  perfumistico: "Perfumístico",
  perfumoteca: "Perfumoteca",
  euperfumista: "Eu Perfumista",
};

function money(v: number | null) {
  return v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function sourceLabel(s: string | null): string {
  if (!s) return "—";
  // `sources` pode vir como CSV; usamos o primeiro/cheapest quando disponível.
  const first = s.split(",")[0]?.trim() ?? s;
  return SOURCE_LABEL[first] ?? first;
}

// Carregado uma vez (módulo puro).
const ALL = getAllMaterials();

// Materiais agrupados por cor (na ordem canônica).
const BY_COLOR: Record<string, MaterialCard[]> = {};
for (const slug of CAP_ORDER) {
  BY_COLOR[slug] = ALL.filter((m) => m.cap_color === slug);
}

export default function FragranciasPage() {
  const [color, setColor] = useState<CapColor>(CAP_ORDER[0]);
  const [q, setQ] = useState("");
  // `marked` espelha o localStorage; iniciamos vazio e hidratamos no cliente
  // (evita divergência de SSR/pré-render). Usamos array de ids.
  const [marked, setMarked] = useState<number[]>([]);

  useEffect(() => {
    setMarked(buylist.list());
  }, []);

  const markedSet = useMemo(() => new Set(marked), [marked]);

  const toggle = useCallback((id: number) => {
    buylist.toggle(id);
    setMarked(buylist.list());
  }, []);

  const clearAll = useCallback(() => {
    buylist.clear();
    setMarked([]);
  }, []);

  // Materiais da cor selecionada, filtrados por busca.
  const visible = useMemo(() => {
    const items = BY_COLOR[color] ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (m) =>
        m.name_canonical.toLowerCase().includes(needle) ||
        (m.name_pt?.toLowerCase().includes(needle) ?? false) ||
        (m.odor_description?.toLowerCase().includes(needle) ?? false) ||
        (m.key_uses?.toLowerCase().includes(needle) ?? false),
    );
  }, [color, q]);

  // Resumo da lista: total + quebra por cor + lotes de 20.
  const summary = useMemo(() => {
    const perColor = CAP_ORDER.map((slug) => {
      const n = (BY_COLOR[slug] ?? []).filter((m) => markedSet.has(m.id)).length;
      return { slug, meta: capMeta(slug), n, lotes: Math.ceil(n / LOTE) };
    }).filter((c) => c.n > 0);
    return { total: marked.length, perColor };
  }, [markedSet, marked.length]);

  return (
    <div>
      <div className="mb-5">
        <p className="ui-eyebrow">Você escolhe</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Fragrâncias</h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          Escolha suas matérias-primas por{" "}
          <strong className="text-[var(--foreground)]">cor de tampa</strong> (família olfativa) e
          monte sua própria lista de compras. Prefere uma sugestão pronta em lotes de {LOTE}?{" "}
          <Link href="/compras" className="text-[var(--accent)] underline">
            Ver Compras
          </Link>
          .
        </p>
      </div>

      {/* Painel: minha lista de compras */}
      <BuyPanel summary={summary} onClear={clearAll} allMarked={marked} />

      {/* Tabs de cores */}
      <div className="mb-4 -mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          {CAP_ORDER.map((slug) => {
            const meta = capMeta(slug);
            if (!meta) return null;
            const active = slug === color;
            const total = (BY_COLOR[slug] ?? []).length;
            return (
              <button
                key={slug}
                type="button"
                onClick={() => setColor(slug)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--foreground)]"
                    : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)]"
                }`}
                aria-pressed={active}
              >
                <span
                  aria-hidden
                  className="inline-block h-3 w-3 shrink-0 rounded-full ring-1 ring-black/30"
                  style={{ backgroundColor: meta.hex }}
                />
                <span>{meta.label}</span>
                <span className="text-[11px] text-[var(--muted)]">{total}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Busca dentro da cor */}
      <div className="mb-4">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar nesta cor (nome, odor, uso)…"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)]/60 focus:outline-none"
        />
      </div>

      {/* Lista de cards */}
      {visible.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Nenhum material encontrado nesta cor.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visible.map((m) => (
            <FragranceCard
              key={m.id}
              m={m}
              marked={markedSet.has(m.id)}
              onToggle={() => toggle(m.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel "Minha lista de compras"
// ---------------------------------------------------------------------------
interface SummaryShape {
  total: number;
  perColor: { slug: string; meta: ReturnType<typeof capMeta>; n: number; lotes: number }[];
}

function BuyPanel({
  summary,
  onClear,
  allMarked,
}: {
  summary: SummaryShape;
  onClear: () => void;
  allMarked: number[];
}) {
  const totalLotes = summary.perColor.reduce((s, c) => s + c.lotes, 0);

  const exportText = useCallback(() => {
    const byId = new Map(ALL.map((m) => [m.id, m]));
    const lines: string[] = ["Minha lista de compras — Perfumista", ""];
    for (const c of summary.perColor) {
      if (!c.meta) continue;
      lines.push(`## ${c.meta.label} (${c.slug}) — ${c.n} item(ns), ${c.lotes} lote(s) de ${LOTE}`);
      for (const id of allMarked) {
        const m = byId.get(id);
        if (m && m.cap_color === c.slug) {
          lines.push(`- ${m.name_canonical}${m.cas ? ` (CAS ${m.cas})` : ""} — ${money(m.min_price)}`);
        }
      }
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lista-compras-perfumista.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [summary.perColor, allMarked]);

  if (summary.total === 0) {
    return (
      <div className="ui-card mb-6 p-4 text-sm text-[var(--muted)]">
        Sua lista está vazia. Toque em <strong className="text-[var(--foreground)]">➕ marcar pra comprar</strong>{" "}
        nos materiais abaixo para montá-la.
      </div>
    );
  }

  return (
    <div className="ui-card mb-6 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Minha lista de compras
          </h2>
          <p className="mt-1 text-2xl font-semibold text-[var(--accent)]">
            {summary.total} <span className="text-sm font-normal text-[var(--muted)]">itens marcados</span>
          </p>
          <p className="text-xs text-[var(--muted)]">
            {totalLotes} lote{totalLotes === 1 ? "" : "s"} de {LOTE} no total
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportText}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-[var(--accent)]/50"
          >
            ⬇️ Exportar
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Quebra por cor */}
      <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
        {summary.perColor.map((c) =>
          c.meta ? (
            <span
              key={c.slug}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs"
            >
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/30"
                style={{ backgroundColor: c.meta.hex }}
              />
              <span className="text-[var(--foreground)]">{c.meta.label}</span>
              <span className="text-[var(--muted)]">
                {c.n} → {c.lotes} lote{c.lotes === 1 ? "" : "s"}
              </span>
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card de material (resumo)
// ---------------------------------------------------------------------------
function FragranceCard({
  m,
  marked,
  onToggle,
}: {
  m: MaterialCard;
  marked: boolean;
  onToggle: () => void;
}) {
  const cap = capMeta(m.cap_color);
  return (
    <div className="ui-card flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold leading-tight">{m.name_canonical}</h3>
          {m.name_pt && m.name_pt !== m.name_canonical && (
            <p className="truncate text-xs text-[var(--muted)]">{m.name_pt}</p>
          )}
        </div>
        {m.note_type && (
          <span className="shrink-0 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--accent)]">
            {NOTE_LABEL[m.note_type] ?? m.note_type}
          </span>
        )}
      </div>

      {/* Cor/família + força */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
        {cap && (
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/30"
              style={{ backgroundColor: cap.hex }}
            />
            {cap.label}
          </span>
        )}
        {m.odor_strength && <span>Força: {m.odor_strength}</span>}
      </div>

      {/* Descrição de odor */}
      {m.odor_description && (
        <p className="mt-2 text-sm text-[var(--foreground)]">{m.odor_description}</p>
      )}

      {/* Para que serve */}
      {m.key_uses && (
        <div className="mt-2">
          <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Para que serve</p>
          <p className="text-sm">{m.key_uses}</p>
        </div>
      )}

      {/* Preço + fornecedor */}
      <div className="mt-3 flex items-end justify-between gap-2 border-t border-[var(--border)] pt-3">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">{money(m.min_price)}</p>
          <p className="text-[11px] text-[var(--muted)]">
            {sourceLabel(m.sources)} · {m.offer_count} oferta{m.offer_count === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href={`/material/${m.id}`}
          className="text-xs text-[var(--muted)] underline transition-colors hover:text-[var(--foreground)]"
        >
          ver detalhe →
        </Link>
      </div>

      {/* Toggle comprar */}
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={marked}
        className={`mt-3 rounded-lg border px-3 py-2 text-xs font-medium uppercase tracking-wide transition-colors ${
          marked
            ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]"
            : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/50 hover:text-[var(--foreground)]"
        }`}
      >
        {marked ? "✓ na lista — remover" : "➕ marcar pra comprar"}
      </button>
    </div>
  );
}
