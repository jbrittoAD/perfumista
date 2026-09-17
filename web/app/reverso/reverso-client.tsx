"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAllMaterialsForEngine } from "@/lib/catalog";
import {
  suggestReverse,
  classifyNote,
  classifyFamily,
  type MaterialInput,
  type ReverseTarget,
  type ReverseSuggestion,
} from "@/lib/engine";
import { setCurrent, type FormulaItemData } from "@/lib/formula";

// Catálogo carregado do JSON embutido (client-side, offline).
const MATERIALS: MaterialInput[] = getAllMaterialsForEngine();

const NOTE_OPTIONS = [
  { v: "", label: "Qualquer nota" },
  { v: "topo", label: "Topo" },
  { v: "coracao", label: "Coração" },
  { v: "base", label: "Base" },
];

const NOTE_LABEL: Record<string, string> = { topo: "Topo", coracao: "Coração", base: "Base" };
const NOTE_COLOR: Record<string, string> = {
  topo: "text-amber-300 border-amber-400/40 bg-amber-400/10",
  coracao: "text-rose-300 border-rose-400/40 bg-rose-400/10",
  base: "text-orange-300 border-orange-500/40 bg-orange-500/10",
};

function money(v: number | null) {
  return v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface TargetRow {
  key: number;
  family: string;
  note: string;
  description: string;
  intensity: number;
}

let TARGET_SEQ = 1;
function newTarget(): TargetRow {
  return { key: TARGET_SEQ++, family: "", note: "", description: "", intensity: 60 };
}

export default function ReversoClient() {
  const materials = MATERIALS;
  // Famílias canônicas presentes no catálogo (para o dropdown de alvos).
  const families = useMemo(() => {
    const set = new Set<string>();
    for (const m of materials) {
      const f = classifyFamily(m);
      if (f) set.add(f);
    }
    return Array.from(set).sort();
  }, [materials]);

  const router = useRouter();
  const [targets, setTargets] = useState<TargetRow[]>([newTarget()]);
  const [result, setResult] = useState<ReverseSuggestion | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  function updateTarget(key: number, patch: Partial<Omit<TargetRow, "key">>) {
    setTargets((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  }
  function addTarget() {
    setTargets((prev) => [...prev, newTarget()]);
  }
  function removeTarget(key: number) {
    setTargets((prev) => (prev.length > 1 ? prev.filter((t) => t.key !== key) : prev));
  }

  function handleSuggest() {
    const payload: ReverseTarget[] = targets
      .filter((t) => t.family || t.note || t.description.trim())
      .map((t) => ({
        family: t.family || undefined,
        note: t.note || undefined,
        description: t.description.trim() || undefined,
        intensity: t.intensity,
      }));
    // Alvo padrão "qualquer/qualquer" (sem critério): não há como casar. Dá dica.
    if (payload.length === 0) {
      setResult(null);
      setHint(
        "Escolha ao menos uma família, uma nota (topo/coração/base) ou digite uma descrição em algum alvo — " +
          "sem critério não há como sugerir materiais.",
      );
      return;
    }
    setHint(null);
    setResult(suggestReverse(payload, materials));
  }

  function usarNoDireto() {
    if (!result || result.items.length === 0) return;
    // pct sugerido -> gramas proporcionais (usa o pct como gramas relativas; puro=100%).
    const items: FormulaItemData[] = result.items.map((it) => ({
      materialId: it.material.id,
      name: it.material.name,
      grams: Math.round(it.suggestedPct * 100) / 100,
      dilutionPct: 100,
    }));
    setCurrent(items);
    router.push("/direto");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ---------- ALVOS (esquerda) ---------- */}
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <h2 className="text-sm font-medium">Alvos desejados ({targets.length})</h2>
            <button
              type="button"
              onClick={addTarget}
              className="min-h-[40px] px-2 text-xs text-[var(--accent)] hover:opacity-80 transition-opacity"
            >
              + adicionar alvo
            </button>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {targets.map((t) => (
              <li key={t.key} className="px-4 py-3 flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                    Família
                    <select
                      value={t.family}
                      onChange={(e) => updateTarget(t.key, { family: e.target.value })}
                      className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                    >
                      <option value="">Qualquer família</option>
                      {families.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                    Nota
                    <select
                      value={t.note}
                      onChange={(e) => updateTarget(t.key, { note: e.target.value })}
                      className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                    >
                      {NOTE_OPTIONS.map((o) => (
                        <option key={o.v} value={o.v}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                  Descrição (texto livre)
                  <input
                    type="text"
                    value={t.description}
                    onChange={(e) => updateTarget(t.key, { description: e.target.value })}
                    placeholder="ex.: baunilha cremosa, cítrico brilhante…"
                    className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                  <span className="flex justify-between">
                    Intensidade <span className="text-[var(--accent)]">{t.intensity}</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={t.intensity}
                    onChange={(e) => updateTarget(t.key, { intensity: Number(e.target.value) })}
                    className="h-10 accent-[var(--accent)] touch-none"
                  />
                </label>
                {targets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTarget(t.key)}
                    className="self-end min-h-[40px] px-2 text-xs text-[var(--muted)] hover:text-rose-300 transition-colors"
                  >
                    remover alvo
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={handleSuggest}
          className="rounded-lg border border-[var(--accent)] bg-[var(--accent)]/15 px-4 py-2.5 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/25 transition-colors"
        >
          Sugerir ingredientes
        </button>
      </div>

      {/* ---------- RESULTADO (direita) ---------- */}
      <div className="flex flex-col gap-4">
        {hint ? (
          <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-200/90">
            {hint}
          </div>
        ) : result === null ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">
            Defina os alvos e clique em “Sugerir ingredientes”.
          </div>
        ) : (
          <ResultPanel result={result} onUsarNoDireto={usarNoDireto} />
        )}
      </div>
    </div>
  );
}

function ResultPanel({ result, onUsarNoDireto }: { result: ReverseSuggestion; onUsarNoDireto: () => void }) {
  return (
    <>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-medium">Ingredientes sugeridos ({result.items.length})</h3>
          {result.items.length > 0 && (
            <button
              type="button"
              onClick={onUsarNoDireto}
              className="shrink-0 rounded-lg border border-[var(--accent)] bg-[var(--accent)]/15 px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/25 transition-colors"
            >
              Usar no Modo Direto →
            </button>
          )}
        </div>
        {result.items.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">
            Nenhum material do catálogo casou com os alvos. Tente afrouxar os critérios: escolha só a família OU
            só a nota, ou use uma descrição mais genérica.
          </p>
        ) : (
          <ul className="space-y-3">
            {result.items.map((it) => {
              const note = classifyNote(it.material);
              const family = classifyFamily(it.material) ?? it.material.odor_family;
              return (
                <li
                  key={it.material.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/material/${it.material.id}`}
                      className="text-sm font-medium hover:text-[var(--accent)] transition-colors"
                    >
                      {it.material.name}
                    </Link>
                    <span
                      className={`shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                        NOTE_COLOR[note] ?? ""
                      }`}
                    >
                      {NOTE_LABEL[note] ?? note}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                    {family && <span className="capitalize">{family}</span>}
                    <span className="text-[var(--accent)] font-medium">{it.suggestedPct}%</span>
                    <span>a partir de {money(it.material.min_price)}</span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed">{it.reason}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {result.notes.length > 0 && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4">
          <h3 className="text-sm font-medium text-amber-300 mb-2">Notas de equilíbrio</h3>
          <ul className="space-y-1.5 text-xs text-amber-200/90">
            {result.notes.map((n, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden>•</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
