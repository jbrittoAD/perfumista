/**
 * formulas/page.tsx — "Fórmulas": monta acordes simples com o que está no
 * laboratório e simula o resultado.
 *
 * O usuário escolhe materiais da própria paleta e ajusta PARTES (proporção, não
 * gramas — é assim que acorde se pensa: 4 partes de X, 1 de Y). A simulação usa
 * o motor heurístico do projeto e mostra pirâmide, famílias dominantes, projeção,
 * duração e avisos de IFRA.
 *
 * A previsão é estimativa estrutural — a tela diz isso, porque a decisão final
 * é sempre a fita olfativa.
 */

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Photo from "../photo";
import {
  familyLabelFromEngine, familyMeta, getCard, noteLabel, num, type Ingredient,
} from "@/lib/deck";
import { deleteBlend, saveBlend, useDeckState, type Blend } from "@/lib/deck-store";
import { simulate } from "@/lib/deck-engine";
import type { Prediction } from "@/lib/engine";

interface Row {
  card: Ingredient;
  parts: number;
}

export default function Formulas() {
  const state = useDeckState();
  const [rows, setRows] = useState<Row[]>([]);
  const [picker, setPicker] = useState(false);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [openBlend, setOpenBlend] = useState<string | null>(null);

  const lab = useMemo(() => {
    const out: Ingredient[] = [];
    for (const rec of Object.values(state.swipes)) {
      if (rec.dir !== "like") continue;
      const c = getCard(rec.id);
      if (c) out.push(c);
    }
    return out.sort((a, b) => familyMeta(a.family).order - familyMeta(b.family).order || a.seq - b.seq);
  }, [state.swipes]);

  const available = useMemo(() => {
    const chosen = new Set(rows.map((r) => r.card.id));
    const q = query.trim().toLowerCase();
    return lab.filter(
      (c) =>
        !chosen.has(c.id) &&
        (!q || c.name.toLowerCase().includes(q) || c.facets.some((f) => f.toLowerCase().includes(q))),
    );
  }, [lab, rows, query]);

  const total = rows.reduce((s, r) => s + r.parts, 0);
  const prediction: Prediction | null = useMemo(() => simulate(rows), [rows]);

  function setParts(id: number, parts: number) {
    setRows((rs) => rs.map((r) => (r.card.id === id ? { ...r, parts: Math.max(0, parts) } : r)));
  }

  function add(card: Ingredient) {
    setRows((rs) => [...rs, { card, parts: 1 }]);
    setPicker(false);
    setQuery("");
  }

  function persist() {
    if (rows.length === 0) return;
    const id = `b${Date.now().toString(36)}`;
    saveBlend({
      id,
      name: name.trim() || `Acorde ${new Date().toLocaleDateString("pt-BR")}`,
      items: rows.map((r) => ({ id: r.card.id, parts: r.parts })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setName("");
  }

  function load(blend: Blend) {
    const next: Row[] = [];
    for (const it of blend.items) {
      const c = getCard(it.id);
      if (c) next.push({ card: c, parts: it.parts });
    }
    setRows(next);
    setName(blend.name);
    setOpenBlend(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-20 bg-[var(--bg)]/92 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h1 className="text-[15px] font-bold tracking-tight">Fórmulas</h1>
          {state.blends.length > 0 && (
            <button
              type="button"
              onClick={() => setOpenBlend(openBlend ? null : "list")}
              className="text-[11.5px] font-semibold"
              style={{ color: "var(--fam)" }}
            >
              {state.blends.length} salva{state.blends.length > 1 ? "s" : ""}
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 space-y-4 px-4 pb-8">
        {openBlend === "list" && (
          <section className="panel p-3">
            <h2 className="eyebrow mb-2">Fórmulas salvas</h2>
            <ul className="space-y-1.5">
              {state.blends.map((b) => (
                <li key={b.id} className="flex items-center gap-2">
                  <button type="button" onClick={() => load(b)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-[13.5px] font-medium">{b.name}</p>
                    <p className="text-[11px] text-[var(--muted)]">
                      {b.items.length} materiais · {new Date(b.updatedAt).toLocaleDateString("pt-BR")}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteBlend(b.id)}
                    className="shrink-0 px-2 text-[11px] text-[var(--muted)] underline"
                  >
                    apagar
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {lab.length === 0 ? (
          <div className="panel mt-4 p-6 text-center">
            <p className="text-3xl" aria-hidden>⚗️</p>
            <h2 className="mt-3 text-[16px] font-bold">Primeiro monte a paleta</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
              As fórmulas usam só os materiais que você marcou como favoritos. Passe pelo
              deck e volte aqui.
            </p>
            <Link href="/" className="btn-fam mt-5 inline-flex">Ir para o deck</Link>
          </div>
        ) : (
          <>
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="eyebrow">O acorde</h2>
                {rows.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setRows([]); setName(""); }}
                    className="text-[11.5px] text-[var(--muted)] underline"
                  >
                    limpar
                  </button>
                )}
              </div>

              {rows.length === 0 ? (
                <p className="panel p-4 text-center text-[13px] text-[var(--muted)]">
                  Nenhum material ainda. Adicione de 2 a 5 para um acorde legível.
                </p>
              ) : (
                <ul className="space-y-2">
                  {rows.map((r) => {
                    const fam = familyMeta(r.card.family);
                    const pct = total > 0 ? (r.parts / total) * 100 : 0;
                    return (
                      <li key={r.card.id} className="panel flex items-center gap-3 p-2.5">
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[var(--r-sm)]">
                          <Photo photoKey={r.card.photo} seed={r.card.id} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-semibold leading-tight">{r.card.name}</p>
                          <p className="text-[11px] text-[var(--muted)]">
                            <span style={{ color: fam.hex }}>{fam.label}</span>
                            {r.card.note && ` · ${noteLabel(r.card.note)}`}
                            {` · ${pct.toFixed(1)}%`}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <StepBtn onClick={() => setParts(r.card.id, r.parts - 1)} label="menos">−</StepBtn>
                          <span className="w-6 text-center text-[13px] font-bold tabular-nums">{r.parts}</span>
                          <StepBtn onClick={() => setParts(r.card.id, r.parts + 1)} label="mais">+</StepBtn>
                          <button
                            type="button"
                            onClick={() => setRows((rs) => rs.filter((x) => x.card.id !== r.card.id))}
                            aria-label={`Remover ${r.card.name}`}
                            className="ml-1 px-1 text-[15px] text-[var(--muted)]"
                          >
                            ×
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <button type="button" onClick={() => setPicker(true)} className="btn-ghost mt-2 w-full">
                + Adicionar material do laboratório
              </button>
            </section>

            {prediction && rows.length > 0 && (
              <Result prediction={prediction} rows={rows} total={total} />
            )}

            {rows.length > 0 && (
              <section className="panel p-3">
                <label className="eyebrow mb-2 block" htmlFor="blend-name">Salvar este acorde</label>
                <div className="flex gap-2">
                  <input
                    id="blend-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome da fórmula"
                    className="min-w-0 flex-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)]
                               px-3.5 py-2 text-[13px] placeholder:text-[var(--muted)]"
                  />
                  <button type="button" onClick={persist} className="btn-fam shrink-0">Salvar</button>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {picker && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setPicker(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 top-20 mx-auto max-w-lg overflow-y-auto rounded-t-[1.75rem]
                          border-t border-[var(--border)] bg-[var(--bg-soft)] p-4">
            <div className="sticky -top-4 -mx-4 mb-3 bg-[var(--bg-soft)] px-4 pb-3 pt-1">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[14px] font-bold">Do seu laboratório</h2>
                <button type="button" onClick={() => setPicker(false)} className="text-[13px] text-[var(--muted)]">
                  fechar
                </button>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar…"
                className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)]
                           px-4 py-2 text-[13px] placeholder:text-[var(--muted)]"
              />
            </div>
            {available.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-[var(--muted)]">
                Nada disponível com esse filtro.
              </p>
            ) : (
              <ul className="space-y-1.5 pb-8">
                {available.map((c) => {
                  const fam = familyMeta(c.family);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => add(c)}
                        className="panel flex w-full items-center gap-3 p-2 text-left"
                      >
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[var(--r-sm)]">
                          <Photo photoKey={c.photo} seed={c.id} />
                        </div>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium">{c.name}</span>
                          <span className="block text-[11px]" style={{ color: fam.hex }}>
                            {fam.emoji} {fam.label}
                          </span>
                        </span>
                        <span className="shrink-0 text-[18px] text-[var(--muted)]">+</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Result({ prediction, rows, total }: { prediction: Prediction; rows: Row[]; total: number }) {
  const top = prediction.families.slice(0, 3);
  return (
    <section className="panel space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="eyebrow">Como deve cheirar</h2>
        <span className="text-[11px] text-[var(--muted)]">{rows.length} materiais · {total} partes</span>
      </div>

      {top.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11.5px] text-[var(--muted)]">Famílias dominantes</p>
          <div className="space-y-1.5">
            {top.map((f) => (
              <div key={f.name} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-[12px]">
                  {familyLabelFromEngine(f.name)}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      // `weight` já vem em porcentagem (a soma das famílias dá ~100).
                      width: `${Math.min(100, Math.max(2, f.weight))}%`,
                      background: "var(--fam)",
                    }}
                  />
                </span>
                <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-[var(--muted)]">
                  {Math.round(f.weight)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Projeção" value={`${Math.round(prediction.projection)}/100`} />
        <Stat label="Duração" value={`~${num(prediction.longevityHours)} h`} />
        <Stat label="Acorde" value={prediction.accords[0]?.name ?? "—"} />
      </div>

      <div className="space-y-2">
        {(["topo", "coracao", "base"] as const).map((slot) => {
          const hits = prediction.pyramid[slot];
          if (!hits || hits.length === 0) return null;
          return (
            <div key={slot}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                {noteLabel(slot)}
              </p>
              <p className="text-[12.5px] leading-snug text-[var(--fg-dim)]">
                {/* O motor decompõe óleo essencial em sub-notas rotuladas
                    "Óleo · descritor". Na tela interessa o material, uma vez só. */}
                {[...new Set(hits.map((h) => h.material.split(" · ")[0]))]
                  .slice(0, 5)
                  .join(" · ")}
              </p>
            </div>
          );
        })}
      </div>

      {prediction.warnings.length > 0 && (
        <ul className="space-y-1.5">
          {prediction.warnings.slice(0, 4).map((w, i) => (
            <li
              key={i}
              className="rounded-[var(--r-sm)] border border-[#ff5f6d]/35 bg-[#ff5f6d]/10 p-2.5
                         text-[12px] leading-snug text-[#ffb3b8]"
            >
              {w}
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] leading-snug text-[var(--muted)]">
        Estimativa do motor heurístico a partir de volatilidade, força e família — não é
        medição. Cheire na fita antes de concluir qualquer coisa.
      </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--r-sm)] border border-[var(--border-soft)] bg-[var(--surface-2)] px-2 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-semibold">{value}</p>
    </div>
  );
}

function StepBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-7 w-7 place-items-center rounded-full border border-[var(--border)]
                 bg-[var(--surface-2)] text-[15px] leading-none text-[var(--fg-dim)] active:scale-90"
    >
      {children}
    </button>
  );
}
