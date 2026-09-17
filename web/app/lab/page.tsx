/**
 * lab/page.tsx — "Meu Laboratório": tudo que recebeu swipe para a direita.
 *
 * É a paleta pessoal do usuário. Precisa ser filtrável e buscável porque ela
 * cresce rápido (são 590 cartas no baralho) e o uso real é consulta: "o que eu
 * marquei de amadeirado?", "qual o mais barato que eu quero comprar?".
 *
 * A aba também guarda os DESCARTADOS num painel separado — o swipe para a
 * esquerda nunca é destrutivo, dá para voltar atrás a qualquer momento.
 *
 * A lista de compras sai daqui em texto puro (clipboard), que é o formato que
 * serve para colar no WhatsApp do fornecedor.
 */

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Detail from "../detail";
import Photo from "../photo";
import {
  FAMILIES, brlPrecise, familyMeta, getCard, kindLabel, notesShort, perGram,
  type FamilySlug, type Ingredient,
} from "@/lib/deck";
import { clearSwipe, recordSwipe, useDeckState } from "@/lib/deck-store";

type Tab = "like" | "pass";
type SortKey = "recent" | "price" | "inuse" | "family" | "name";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Recentes" },
  { key: "family", label: "Família" },
  { key: "price", label: "Preço/g" },
  { key: "inuse", label: "Custo na fórmula" },
  { key: "name", label: "Nome" },
];

export default function Lab() {
  const state = useDeckState();
  const [tab, setTab] = useState<Tab>("like");
  const [query, setQuery] = useState("");
  const [famFilter, setFamFilter] = useState<FamilySlug | null>(null);
  const [sort, setSort] = useState<SortKey>("recent");
  const [detail, setDetail] = useState<Ingredient | null>(null);
  const [copied, setCopied] = useState(false);

  const picked = useMemo(() => {
    const out: { card: Ingredient; at: number }[] = [];
    for (const rec of Object.values(state.swipes)) {
      if (rec.dir !== tab) continue;
      const card = getCard(rec.id);
      if (card) out.push({ card, at: rec.at });
    }
    return out;
  }, [state.swipes, tab]);

  const famCounts = useMemo(() => {
    const m = new Map<FamilySlug, number>();
    for (const { card } of picked) m.set(card.family, (m.get(card.family) ?? 0) + 1);
    return m;
  }, [picked]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = picked;
    if (famFilter) out = out.filter((x) => x.card.family === famFilter);
    if (q) {
      out = out.filter(({ card }) =>
        card.name.toLowerCase().includes(q) ||
        card.facets.some((f) => f.toLowerCase().includes(q)) ||
        card.smell.toLowerCase().includes(q) ||
        (card.cas ?? "").includes(q),
      );
    }
    const sorted = [...out];
    sorted.sort((a, b) => {
      if (sort === "recent") return b.at - a.at;
      if (sort === "name") return a.card.name.localeCompare(b.card.name, "pt-BR");
      if (sort === "price") {
        const av = a.card.price.perG ?? Number.POSITIVE_INFINITY;
        const bv = b.card.price.perG ?? Number.POSITIVE_INFINITY;
        return av - bv;
      }
      if (sort === "inuse") {
        // o que o material custa POR GRAMA DE FÓRMULA — comparável entre base
        // pronta e molécula de traço, ao contrário do preço de frasco
        const av = a.card.price.inUse ?? Number.POSITIVE_INFINITY;
        const bv = b.card.price.inUse ?? Number.POSITIVE_INFINITY;
        return av - bv;
      }
      const fa = familyMeta(a.card.family).order;
      const fb = familyMeta(b.card.family).order;
      return fa !== fb ? fa - fb : a.card.seq - b.card.seq;
    });
    return sorted;
  }, [picked, query, famFilter, sort]);

  // Custo de montar a paleta: 10 g de cada, que é o tamanho de frasco de estudo.
  const estimate = useMemo(() => {
    let known = 0;
    let missing = 0;
    let blends = 0;
    for (const { card } of picked) {
      if (card.price.perG != null) known += card.price.perG * 10;
      else missing++;
      if (card.price.isBlend) blends++;
    }
    return { known, missing, blends };
  }, [picked]);

  async function copyList() {
    const lines = list.map(({ card }) => {
      const price = card.price.perG != null ? ` — ${perGram(card.price.perG)}` : "";
      return `• ${card.name} (${familyMeta(card.family).label})${price}`;
    });
    const header = `Lista Perfumista — ${list.length} materiais\n`;
    try {
      await navigator.clipboard.writeText(header + lines.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-20 bg-[var(--bg)]/92 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 pt-3">
          <h1 className="text-[15px] font-bold tracking-tight">Meu Laboratório</h1>
          <div className="flex rounded-full border border-[var(--border)] p-[2px] text-[11.5px] font-semibold">
            <TabBtn active={tab === "like"} onClick={() => { setTab("like"); setFamFilter(null); }}>
              Favoritos
            </TabBtn>
            <TabBtn active={tab === "pass"} onClick={() => { setTab("pass"); setFamFilter(null); }}>
              Descartados
            </TabBtn>
          </div>
        </div>

        <div className="px-4 pt-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, faceta ou CAS…"
            className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)]
                       px-4 py-2.5 text-[13.5px] placeholder:text-[var(--muted)]"
          />
        </div>

        <div className="scrollbar-none mt-2.5 flex gap-2 overflow-x-auto px-4 pb-3">
          <MiniPill active={!famFilter} onClick={() => setFamFilter(null)} hex="#d9a441">
            Todas {picked.length}
          </MiniPill>
          {FAMILIES.filter((f) => (famCounts.get(f.slug) ?? 0) > 0).map((f) => (
            <MiniPill
              key={f.slug}
              active={famFilter === f.slug}
              onClick={() => setFamFilter(famFilter === f.slug ? null : f.slug)}
              hex={f.hex}
            >
              {f.emoji} {f.label} {famCounts.get(f.slug)}
            </MiniPill>
          ))}
        </div>
      </header>

      <div className="flex-1 px-4 pb-6">
        {picked.length === 0 ? (
          <div className="panel mt-6 p-6 text-center">
            <p className="text-3xl" aria-hidden>{tab === "like" ? "🧪" : "🗂️"}</p>
            <h2 className="mt-3 text-[16px] font-bold">
              {tab === "like" ? "Sua paleta está vazia" : "Nada descartado ainda"}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
              {tab === "like"
                ? "Arraste cartas para a direita em Descobrir e elas aparecem aqui."
                : "O que você arrastar para a esquerda fica guardado aqui, e dá para voltar atrás."}
            </p>
            <Link href="/" className="btn-fam mt-5 inline-flex">Ir para o deck</Link>
          </div>
        ) : (
          <>
            {tab === "like" && (
              <div className="panel mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-3.5 py-3 text-[12px]">
                <span className="text-[var(--muted)]">
                  Montar a paleta com 10 g de cada:{" "}
                  <strong className="text-[var(--fg)]">
                    ~{estimate.known.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </strong>
                </span>
                {estimate.blends > 0 && (
                  <span className="text-[var(--muted)]">
                    ({estimate.blends} {estimate.blends > 1 ? "são bases prontas" : "é base pronta"} —
                    entram na fórmula em dose bem maior)
                  </span>
                )}
                {estimate.missing > 0 && (
                  <span className="text-[var(--muted)]">({estimate.missing} sem preço mapeado)</span>
                )}
              </div>
            )}

            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="scrollbar-none flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
                {SORTS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSort(s.key)}
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors"
                    style={{
                      background: sort === s.key ? "var(--surface-2)" : "transparent",
                      color: sort === s.key ? "var(--fg)" : "var(--muted)",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={copyList} className="shrink-0 pl-2 text-[11.5px] font-semibold"
                style={{ color: copied ? "var(--like)" : "var(--fam)" }}>
                {copied ? "copiado ✓" : "copiar lista"}
              </button>
            </div>

            {list.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-[var(--muted)]">
                Nada corresponde a esse filtro.
              </p>
            ) : (
              <ul className="space-y-2">
                {list.map(({ card }) => (
                  <li key={card.id}>
                    <Row
                      card={card}
                      onOpen={() => setDetail(card)}
                      onToggle={() => {
                        if (tab === "like") clearSwipe(card.id);
                        else recordSwipe(card.id, "like");
                      }}
                      actionLabel={tab === "like" ? "Tirar" : "Quero"}
                      actionColor={tab === "like" ? "var(--muted)" : "var(--like)"}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {detail && (
        <Detail
          card={detail}
          liked={state.swipes[detail.id]?.dir === "like"}
          onClose={() => setDetail(null)}
          onLike={() => { recordSwipe(detail.id, "like"); setDetail(null); }}
          onPass={() => { recordSwipe(detail.id, "pass"); setDetail(null); }}
          onRemove={() => { clearSwipe(detail.id); setDetail(null); }}
        />
      )}
    </div>
  );
}

function Row({
  card, onOpen, onToggle, actionLabel, actionColor,
}: {
  card: Ingredient; onOpen: () => void; onToggle: () => void;
  actionLabel: string; actionColor: string;
}) {
  const fam = familyMeta(card.family);
  return (
    <div className="panel flex items-center gap-3 p-2.5" style={{ ["--fam" as string]: fam.hex }}>
      <button
        type="button"
        onClick={onOpen}
        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[var(--r-sm)]"
        aria-label={`Abrir ficha de ${card.name}`}
      >
        <Photo photoKey={card.photo} seed={card.id} />
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className="truncate text-[14px] font-semibold leading-tight">{card.name}</p>
        <p className="mt-0.5 truncate text-[11.5px] text-[var(--muted)]">
          <span style={{ color: fam.hex }}>{fam.emoji} {fam.label}</span>
          {` · ${notesShort(card.notes)}`}
          {card.kind !== "aroma_chemical" && kindLabel(card.kind) && ` · ${kindLabel(card.kind)}`}
          {card.facets.length > 0 && ` · ${card.facets.slice(0, 2).join(", ")}`}
        </p>
        <p className="mt-0.5 text-[11.5px] text-[var(--fg-dim)]">
          {perGram(card.price.perG)}
          {card.price.inUse != null && (
            <span className="text-[var(--muted)]">
              {" · "}
              {brlPrecise(card.price.inUse)}/g na fórmula
            </span>
          )}
        </p>
      </button>
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
        style={{ borderColor: actionColor, color: actionColor }}
      >
        {actionLabel}
      </button>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-3 py-1 transition-colors"
      style={{ background: active ? "var(--surface-2)" : "transparent", color: active ? "var(--fg)" : "var(--muted)" }}
    >
      {children}
    </button>
  );
}

function MiniPill({
  active, onClick, hex, children,
}: { active: boolean; onClick: () => void; hex: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11.5px] font-medium"
      style={{
        borderColor: active ? hex : "var(--border)",
        background: active ? `color-mix(in srgb, ${hex} 16%, transparent)` : "var(--surface)",
        color: active ? `color-mix(in srgb, ${hex} 75%, white)` : "var(--muted)",
      }}
    >
      {children}
    </button>
  );
}
