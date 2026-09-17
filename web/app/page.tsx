"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { listMaterials, facets } from "@/lib/catalog";
import { CAP_ORDER, capMeta } from "@/lib/cap-colors";

const NOTE_LABEL: Record<string, string> = { topo: "Topo", coracao: "Coração", base: "Base" };
const KIND_LABEL: Record<string, string> = {
  aroma_chemical: "químico aromático",
  essential_oil: "óleo essencial",
  solvent: "solvente/diluente",
  base_essencia: "base/essência",
};
const STRENGTH_LABEL: Record<string, string> = { baixa: "Força baixa", "média": "Força média", alta: "Força alta" };
const SOURCE_LABEL: Record<string, string> = {
  flavorist: "Flavorist",
  perfumistico: "Perfumístico",
  perfumoteca: "Perfumoteca",
  euperfumista: "Eu Perfumista",
};
const NOTE_COLOR: Record<string, string> = {
  topo: "text-amber-300 border-amber-400/40 bg-amber-400/10",
  coracao: "text-rose-300 border-rose-400/40 bg-rose-400/10",
  base: "text-orange-300 border-orange-500/40 bg-orange-500/10",
};

function money(v: number | null) {
  return v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function moneyPerG(v: number | null) {
  return v == null ? null : `${v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/g`;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ui-chip ${active ? "ui-chip-on" : "ui-chip-off"}`}
    >
      {children}
    </button>
  );
}

/** Bolinha da cor da tampa (usada nos chips e nos cards). */
function CapDot({ hex, size = 10 }: { hex: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full ring-1 ring-black/30"
      style={{ width: size, height: size, backgroundColor: hex }}
    />
  );
}

interface Filters {
  q: string;
  note: string;
  family: string;
  source: string;
  stock: boolean;
  strength: string;
  kind: string;
  cap: string;
}

const EMPTY: Filters = { q: "", note: "", family: "", source: "", stock: false, strength: "", kind: "", cap: "" };

export default function Home() {
  const { totals, notes, families, kinds, strengths, sources } = useMemo(() => facets(), []);
  const [f, setF] = useState<Filters>(EMPTY);

  // Filtragem 100% no navegador (mesma semântica do antigo listMaterials do SQLite).
  const materials = useMemo(
    () =>
      listMaterials({
        q: f.q || undefined,
        note: f.note || undefined,
        family: f.family || undefined,
        source: f.source || undefined,
        stock: f.stock,
        strength: f.strength || undefined,
        kind: f.kind || undefined,
        cap: f.cap || undefined,
        limit: 300,
      }),
    [f],
  );

  // Alterna um filtro de valor único (clicar no ativo limpa).
  const toggle = (key: keyof Filters, value: string) =>
    setF((prev) => ({ ...prev, [key]: prev[key] === value ? "" : value }));

  return (
    <div>
      <div className="mb-5">
        <p className="ui-eyebrow">Catálogo</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Materiais de Perfumaria
        </h1>
        <p className="text-[var(--muted)] text-sm mt-1.5">
          {totals.materials} materiais (químicos aromáticos, óleos essenciais e solventes) ·{" "}
          {totals.offers} ofertas de fornecedores brasileiros
        </p>
      </div>

      {/* Busca (fica grudada no topo ao rolar) */}
      <div className="sticky top-[calc(env(safe-area-inset-top)+3.25rem)] z-10 -mx-4 mb-3 bg-[var(--background)]/80 px-4 py-2 backdrop-blur lg:top-16 lg:mx-0 lg:rounded-xl lg:px-0 lg:py-0 lg:bg-transparent lg:backdrop-blur-none lg:static">
        <input
          type="search"
          value={f.q}
          onChange={(e) => setF((prev) => ({ ...prev, q: e.target.value }))}
          placeholder="Buscar por nome, CAS ou descrição de odor…"
          className="ui-input"
        />
      </div>

      {/* Filtros de nota */}
      <div className="ui-chip-row mb-2.5">
        <Chip active={!f.note} onClick={() => setF((p) => ({ ...p, note: "" }))}>
          Todas as notas
        </Chip>
        {notes.map((n) => (
          <Chip key={n.v} active={f.note === n.v} onClick={() => toggle("note", n.v)}>
            {NOTE_LABEL[n.v] ?? n.v} ({n.n})
          </Chip>
        ))}
      </div>

      {/* Filtros de família */}
      <div className="ui-chip-row mb-2.5">
        <Chip active={!f.family} onClick={() => setF((p) => ({ ...p, family: "" }))}>
          Todas as famílias
        </Chip>
        {families.slice(0, 12).map((fam) => (
          <Chip key={fam.v} active={f.family === fam.v} onClick={() => toggle("family", fam.v)}>
            {fam.v} ({fam.n})
          </Chip>
        ))}
      </div>

      {/* Filtros por cor de tampa (família por cor) */}
      <div className="ui-chip-row mb-2.5">
        <Chip active={!f.cap} onClick={() => setF((p) => ({ ...p, cap: "" }))}>
          Todas as tampas
        </Chip>
        {CAP_ORDER.map((slug) => {
          const meta = capMeta(slug);
          if (!meta) return null;
          return (
            <Chip key={slug} active={f.cap === slug} onClick={() => toggle("cap", slug)}>
              <span className="flex items-center gap-1.5">
                <CapDot hex={meta.hex} />
                {meta.label}
              </span>
            </Chip>
          );
        })}
      </div>

      {/* Filtros de tipo */}
      <div className="ui-chip-row mb-2.5">
        <Chip active={!f.kind} onClick={() => setF((p) => ({ ...p, kind: "" }))}>
          Todos os tipos
        </Chip>
        {kinds.map((k) => (
          <Chip key={k.v} active={f.kind === k.v} onClick={() => toggle("kind", k.v)}>
            {KIND_LABEL[k.v] ?? k.v} ({k.n})
          </Chip>
        ))}
      </div>

      {/* Filtros de força, fornecedor e estoque */}
      <div className="ui-chip-row mb-6 items-center">
        <Chip active={!f.strength} onClick={() => setF((p) => ({ ...p, strength: "" }))}>
          Qualquer força
        </Chip>
        {strengths.map((s) => (
          <Chip key={s.v} active={f.strength === s.v} onClick={() => toggle("strength", s.v)}>
            {STRENGTH_LABEL[s.v] ?? s.v} ({s.n})
          </Chip>
        ))}
        <span className="mx-1 self-center text-[var(--border)]">|</span>
        {sources.map((s) => (
          <Chip key={s.v} active={f.source === s.v} onClick={() => toggle("source", s.v)}>
            {SOURCE_LABEL[s.v] ?? s.v} ({s.n})
          </Chip>
        ))}
        <span className="mx-1 self-center text-[var(--border)]">|</span>
        <Chip active={f.stock} onClick={() => setF((p) => ({ ...p, stock: !p.stock }))}>
          Em estoque
        </Chip>
      </div>

      {/* Contagem de resultados */}
      <p className="mb-3 text-xs text-[var(--muted)]">
        {materials.length} {materials.length === 1 ? "material" : "materiais"}
      </p>

      {/* Grid */}
      {materials.length === 0 ? (
        <div className="ui-card flex flex-col items-center gap-2 p-10 text-center">
          <span aria-hidden className="text-3xl">🔍</span>
          <p className="font-medium">Nenhum material encontrado</p>
          <p className="text-sm text-[var(--muted)]">Tente limpar alguns filtros ou refinar a busca.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {materials.map((m) => (
            <Link
              key={m.id}
              href={`/material/${m.id}`}
              className="ui-card-link flex flex-col gap-2 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="flex items-start gap-2 font-medium leading-tight">
                  {(() => {
                    const cap = capMeta(m.cap_color);
                    return cap ? (
                      <span className="mt-1" title={`Tampa ${m.cap_color} — ${cap.label}`}>
                        <CapDot hex={cap.hex} size={12} />
                      </span>
                    ) : null;
                  })()}
                  <span>{m.name_canonical}</span>
                </h3>
                {m.note_type && (
                  <span className={`ui-badge shrink-0 ${NOTE_COLOR[m.note_type] ?? ""}`}>
                    {NOTE_LABEL[m.note_type] ?? m.note_type}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {m.material_kind && KIND_LABEL[m.material_kind] && (
                  <span className="ui-badge border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
                    {KIND_LABEL[m.material_kind]}
                  </span>
                )}
                {m.odor_family && (
                  <span className="ui-badge border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
                    {m.odor_family}
                  </span>
                )}
              </div>
              {m.cas && <div className="text-xs text-[var(--muted)] font-mono">CAS {m.cas}</div>}
              {m.odor_description && (
                <p className="text-xs text-[var(--muted)] line-clamp-2">{m.odor_description}</p>
              )}
              <div className="mt-auto flex items-end justify-between gap-2 border-t border-[var(--border)] pt-3">
                <span className="flex flex-col">
                  <span className="text-lg font-semibold text-[var(--accent)]">{money(m.min_price)}</span>
                  {moneyPerG(m.min_price_per_g) && (
                    <span className="text-[11px] text-[var(--muted)]">{moneyPerG(m.min_price_per_g)}</span>
                  )}
                </span>
                <span className="text-right text-[11px] text-[var(--muted)]">
                  {m.offer_count} {m.offer_count === 1 ? "oferta" : "ofertas"}
                  {m.sources ? ` · ${m.sources}` : ""}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
