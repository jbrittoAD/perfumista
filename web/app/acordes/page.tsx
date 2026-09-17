"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ACCORDS, type Accord } from "@/lib/accords";
import { getAllMaterialsForEngine } from "@/lib/catalog";
import { normalizeName } from "@/lib/recipes";
import { capMeta } from "@/lib/cap-colors";
import * as buylist from "@/lib/buylist";

/**
 * /acordes — catálogo NAVEGÁVEL dos acordes clássicos (antes só usados por
 * dentro do motor de previsão em /direto). Cada componente livre (ex.
 * "Bergamot") tenta casar com um material real do catálogo BR pelo mesmo
 * padrão de nome normalizado já usado em formulas/[id] — quando casa, linka
 * direto pra comprar; quando não, fica só texto. É um v1: casamento por nome
 * livre é aproximado por natureza.
 *
 * A família do acorde (`familia`) usa a taxonomia do MOTOR (accords.ts), que é
 * mais rica que a dos materiais (inclui "chypre"/"fougere" como famílias
 * próprias) — por isso o mapeamento pra cor de tampa é próprio desta tela,
 * não o family_canon dos materiais.
 */

const ACCORD_FAMILY_META: Record<string, { label: string; cap: string }> = {
  aldeidico: { label: "Aldeídica", cap: "verde-agua" },
  citrus: { label: "Cítrica", cap: "amarelo" },
  floral: { label: "Floral", cap: "pink" },
  aromatico: { label: "Aromática", cap: "azul" },
  verde: { label: "Verde", cap: "verde-folha" },
  frutado: { label: "Frutada", cap: "laranja" },
  aquatico: { label: "Aquática", cap: "verde-agua" },
  woody: { label: "Amadeirada", cap: "verde-escuro" },
  amber: { label: "Âmbar/Oriental", cap: "preto" },
  chypre: { label: "Chipre", cap: "verde-escuro" },
  fougere: { label: "Fougère", cap: "azul" },
  leather: { label: "Couro", cap: "preto" },
  musk: { label: "Almiscarada", cap: "branco" },
  gourmand: { label: "Gourmand", cap: "laranja" },
  especiado: { label: "Especiada", cap: "azul" },
  animalico: { label: "Animálica", cap: "preto" },
  desconhecida: { label: "—", cap: "" },
};

const NOTE_LABEL: Record<string, string> = { topo: "Topo", coracao: "Coração", base: "Base" };

// Índice nome-normalizado -> material do catálogo (mesmo padrão de formulas/[id]/page.tsx).
const BY_NORM = new Map<string, { id: number; name: string }>();
for (const m of getAllMaterialsForEngine()) {
  const key = normalizeName(m.name);
  if (!BY_NORM.has(key)) BY_NORM.set(key, { id: m.id, name: m.name });
}

function matchMaterial(name: string) {
  return BY_NORM.get(normalizeName(name)) ?? null;
}

function AccordCard({ accord }: { accord: Accord }) {
  const [open, setOpen] = useState(false);
  const meta = ACCORD_FAMILY_META[accord.familia] ?? { label: accord.familiaRaw, cap: "" };
  const cap = capMeta(meta.cap);
  const matchedCount = accord.componentes.filter((c) => matchMaterial(c.material)).length;

  return (
    <article className="ui-card flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{accord.nome}</h3>
          <span className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
            {cap && (
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/30"
                style={{ backgroundColor: cap.hex }}
              />
            )}
            {meta.label}
          </span>
        </div>
        <span className="shrink-0 text-[11px] text-[var(--muted)]">
          {matchedCount}/{accord.componentes.length} no catálogo
        </span>
      </div>

      {accord.descricao && <p className="text-sm">{accord.descricao}</p>}

      {(accord.notesExpected.topo.length || accord.notesExpected.coracao.length || accord.notesExpected.base.length) ? (
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {(["topo", "coracao", "base"] as const).map((k) =>
            accord.notesExpected[k].map((n, i) => (
              <span
                key={`${k}-${i}`}
                className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[var(--muted)]"
              >
                {NOTE_LABEL[k]}: {n}
              </span>
            )),
          )}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="self-start rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:border-[var(--accent)]/50 hover:text-[var(--foreground)]"
      >
        {open ? "Ocultar componentes" : `Ver ${accord.componentes.length} componentes`}
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[var(--muted)] uppercase tracking-wide">
                <th className="py-1.5 pr-3">Papel</th>
                <th className="py-1.5 pr-3">Material</th>
                <th className="py-1.5 pr-3">Proporção</th>
                <th className="py-1.5">Catálogo</th>
              </tr>
            </thead>
            <tbody>
              {accord.componentes.map((c, i) => {
                const hit = matchMaterial(c.material);
                return (
                  <tr key={i} className="border-t border-[var(--border)]">
                    <td className="py-1.5 pr-3 text-[var(--muted)]">{c.papel}</td>
                    <td className="py-1.5 pr-3">{c.material}</td>
                    <td className="py-1.5 pr-3 text-[var(--muted)]">
                      {(c.proporcao * 100).toFixed(0)}%
                    </td>
                    <td className="py-1.5">
                      {hit ? (
                        <span className="flex items-center gap-2">
                          <Link href={`/material/${hit.id}`} className="text-[var(--accent)] underline">
                            ver
                          </Link>
                          <button
                            type="button"
                            onClick={() => buylist.toggle(hit.id)}
                            className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--muted)] hover:border-[var(--accent)]/50 hover:text-[var(--foreground)]"
                          >
                            + comprar
                          </button>
                        </span>
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

export default function AcordesPage() {
  const [q, setQ] = useState("");
  const [family, setFamily] = useState("");

  const families = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of ACCORDS) counts.set(a.familia, (counts.get(a.familia) ?? 0) + 1);
    return [...counts.entries()]
      .map(([v, n]) => ({ v, n, label: ACCORD_FAMILY_META[v]?.label ?? v }))
      .sort((a, b) => b.n - a.n);
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ACCORDS.filter((a) => {
      if (family && a.familia !== family) return false;
      if (!needle) return true;
      const hay = `${a.nome} ${a.descricao} ${a.componentes.map((c) => c.material).join(" ")}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [q, family]);

  return (
    <div>
      <div className="mb-5">
        <p className="ui-eyebrow">Acordes</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Acordes clássicos
        </h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          {ACCORDS.length} acordes de referência (o mesmo dado usado pelo motor em{" "}
          <Link href="/direto" className="text-[var(--accent)] underline">
            Modo Direto
          </Link>
          ), agora navegáveis: componentes que casam com o catálogo BR já linkam pra comprar.
        </p>
      </div>

      <div className="mb-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, descrição ou material…"
          className="ui-input"
        />
      </div>

      <div className="ui-chip-row mb-5">
        <button
          type="button"
          onClick={() => setFamily("")}
          className={`ui-chip ${!family ? "ui-chip-on" : "ui-chip-off"}`}
        >
          Todas as famílias
        </button>
        {families.map((f) => (
          <button
            key={f.v}
            type="button"
            onClick={() => setFamily((prev) => (prev === f.v ? "" : f.v))}
            className={`ui-chip ${family === f.v ? "ui-chip-on" : "ui-chip-off"}`}
          >
            {f.label} ({f.n})
          </button>
        ))}
      </div>

      <p className="mb-3 text-xs text-[var(--muted)]">
        {filtered.length} de {ACCORDS.length} acordes
      </p>

      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Nenhum acorde encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a, i) => (
            <AccordCard key={i} accord={a} />
          ))}
        </div>
      )}
    </div>
  );
}
