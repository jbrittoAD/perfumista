"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getAllMaterialsForEngine } from "@/lib/catalog";
import {
  predictForward,
  type MaterialInput,
  type FormulaItem,
  type Prediction,
  type NoteHit,
} from "@/lib/engine";
import {
  listSaved,
  saveFormula,
  deleteFormula,
  exportJSON,
  importJSON,
  getCurrent,
  clearCurrent,
  type SavedFormula,
} from "@/lib/formula";

// Catálogo carregado do JSON embutido (client-side, offline).
const MATERIALS: MaterialInput[] = getAllMaterialsForEngine();

const NOTE_META: Record<string, { label: string; bar: string; text: string; border: string; bg: string }> = {
  topo: {
    label: "Topo",
    bar: "bg-amber-400",
    text: "text-amber-300",
    border: "border-amber-400/40",
    bg: "bg-amber-400/10",
  },
  coracao: {
    label: "Coração",
    bar: "bg-rose-400",
    text: "text-rose-300",
    border: "border-rose-400/40",
    bg: "bg-rose-400/10",
  },
  base: {
    label: "Base",
    bar: "bg-orange-500",
    text: "text-orange-300",
    border: "border-orange-500/40",
    bg: "bg-orange-500/10",
  },
};

function money(v: number | null) {
  return v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function moneyPerG(v: number | null) {
  return v == null ? "—" : `${v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/g`;
}

interface Row {
  key: number;
  material: MaterialInput;
  grams: number;
  dilutionPct: number;
}

let ROW_SEQ = 1;

export default function DiretoClient() {
  const materials = MATERIALS;
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");

  const byId = useMemo(() => {
    const map = new Map<number, MaterialInput>();
    for (const m of materials) map.set(m.id, m);
    return map;
  }, [materials]);

  // ---- handoff: fórmula atual (vinda do detalhe/reverso) ao montar ----
  const consumedHandoff = useRef(false);
  useEffect(() => {
    if (consumedHandoff.current) return;
    consumedHandoff.current = true;
    const current = getCurrent();
    if (current.length === 0) return;
    const incoming: Row[] = current
      .map((c) => {
        const m = byId.get(c.materialId);
        if (!m) return null;
        return { key: ROW_SEQ++, material: m, grams: c.grams, dilutionPct: c.dilutionPct };
      })
      .filter((r): r is Row => r !== null);
    if (incoming.length > 0) setRows((prev) => [...prev, ...incoming]);
    clearCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byId]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const wordRe = new RegExp(`\\b${esc}`);
    // menor score = mais relevante: nome exato > prefixo > palavra no nome > nome contém > família > descrição
    const score = (m: MaterialInput) => {
      const n = m.name.toLowerCase();
      if (n === q) return 0;
      if (n.startsWith(q)) return 1;
      if (wordRe.test(n)) return 2;
      if (n.includes(q)) return 3;
      if ((m.odor_family ?? "").toLowerCase().includes(q)) return 4;
      if ((m.odor_description ?? "").toLowerCase().includes(q)) return 5;
      return 99;
    };
    return materials
      .map((m) => ({ m, s: score(m) }))
      .filter((x) => x.s < 99)
      .sort((a, b) => a.s - b.s || a.m.name.length - b.m.name.length || a.m.name.localeCompare(b.m.name))
      .slice(0, 8)
      .map((x) => x.m);
  }, [query, materials]);

  const formula: FormulaItem[] = useMemo(
    () => rows.map((r) => ({ material: r.material, grams: r.grams, dilutionPct: r.dilutionPct })),
    [rows],
  );

  const prediction: Prediction = useMemo(() => predictForward(formula), [formula]);

  function addMaterial(m: MaterialInput) {
    setRows((prev) => [...prev, { key: ROW_SEQ++, material: m, grams: 1, dilutionPct: 100 }]);
    setQuery("");
  }

  function updateRow(key: number, patch: Partial<Pick<Row, "grams" | "dilutionPct">>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: number) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  // ---- escalar para N g totais (mantém proporções) ----
  const totalGrams = useMemo(() => rows.reduce((s, r) => s + (r.grams || 0), 0), [rows]);
  const [scaleTarget, setScaleTarget] = useState<number>(0);
  useEffect(() => {
    // inicializa o alvo de escala com o total atual quando muda de 0.
    if (scaleTarget === 0 && totalGrams > 0) setScaleTarget(Math.round(totalGrams * 10) / 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalGrams]);

  function applyScale(target: number) {
    if (totalGrams <= 0 || target <= 0) return;
    const factor = target / totalGrams;
    setRows((prev) => prev.map((r) => ({ ...r, grams: Math.round(r.grams * factor * 1000) / 1000 })));
  }

  // ---- custo estimado do lote ----
  const cost = useMemo(() => {
    const lines = rows.map((r) => {
      const ppg = r.material.min_price_per_g;
      const lineCost = ppg != null ? r.grams * ppg : null;
      return {
        key: r.key,
        name: r.material.name,
        grams: r.grams,
        pricePerG: ppg,
        source: r.material.cheapest_source ?? null,
        lineCost,
      };
    });
    const total = lines.reduce((s, l) => s + (l.lineCost ?? 0), 0);
    const anyMissing = lines.some((l) => l.pricePerG == null);
    return { lines, total, anyMissing };
  }, [rows]);

  // ---- salvar / carregar / exportar / importar (localStorage, offline) ----
  const [saved, setSaved] = useState<SavedFormula[]>([]);
  const [formulaName, setFormulaName] = useState("");
  const [ioMsg, setIoMsg] = useState<string | null>(null);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  function refreshSaved() {
    // localStorage só existe no cliente; roda no efeito de montagem.
    setSaved(listSaved());
    setLoadingSaved(false);
  }

  useEffect(() => {
    refreshSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSave() {
    if (rows.length === 0) return;
    setIoMsg(null);
    try {
      const rec = saveFormula(
        formulaName,
        rows.map((r) => ({
          materialId: r.material.id,
          name: r.material.name,
          grams: r.grams,
          dilutionPct: r.dilutionPct,
        })),
      );
      refreshSaved();
      setFormulaName("");
      setIoMsg(`Salva como "${rec.name}".`);
    } catch (err) {
      setIoMsg(`Falha ao salvar: ${err instanceof Error ? err.message : "erro"}.`);
    }
  }

  function handleLoad(rec: SavedFormula) {
    const loaded: Row[] = rec.items
      .map((it) => {
        const m = byId.get(it.materialId);
        if (!m) return null;
        return { key: ROW_SEQ++, material: m, grams: it.grams, dilutionPct: it.dilutionPct };
      })
      .filter((r): r is Row => r !== null);
    setRows(loaded);
    setIoMsg(`Carregada "${rec.name}" (${loaded.length}/${rec.items.length} materiais encontrados).`);
  }

  function handleDelete(id: string) {
    try {
      deleteFormula(id);
      refreshSaved();
    } catch (err) {
      setIoMsg(`Falha ao excluir: ${err instanceof Error ? err.message : "erro"}.`);
    }
  }

  function handleExport() {
    try {
      const json = exportJSON();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "formulas-perfumista.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setIoMsg(`Falha ao exportar: ${err instanceof Error ? err.message : "erro"}.`);
    }
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file
      .text()
      .then((text) => {
        const n = importJSON(text);
        refreshSaved();
        setIoMsg(`Importadas ${n} fórmula(s).`);
      })
      .catch((err) => setIoMsg(`Falha ao importar: ${err instanceof Error ? err.message : "JSON inválido"}.`));
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ---------- FORM (esquerda) ---------- */}
      <div className="flex flex-col gap-4">
        {/* Busca / autocomplete */}
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar material por nome, família ou descrição de odor…"
            className="w-full min-h-[44px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface-2)] shadow-xl">
              {suggestions.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => addMaterial(m)}
                    className="w-full min-h-[44px] text-left px-4 py-2.5 hover:bg-[var(--surface)] active:bg-[var(--surface)] transition-colors flex items-center justify-between gap-2"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm truncate">{m.name}</span>
                      <span className="block text-xs text-[var(--muted)] truncate">
                        {m.odor_family ?? "família ?"}
                        {m.note_type ? ` · ${NOTE_META[m.note_type]?.label ?? m.note_type}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-[var(--accent)]">{money(m.min_price)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Lista editável */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <h2 className="text-sm font-medium">Fórmula ({rows.length})</h2>
            {rows.length > 0 && (
              <button
                type="button"
                onClick={() => setRows([])}
                className="text-xs text-[var(--muted)] hover:text-rose-300 transition-colors"
              >
                Limpar tudo
              </button>
            )}
          </div>
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--muted)]">
              Busque acima e clique num material para adicioná-lo à fórmula.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {rows.map((r) => (
                <li key={r.key} className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/material/${r.material.id}`}
                      className="text-sm hover:text-[var(--accent)] transition-colors truncate block"
                    >
                      {r.material.name}
                    </Link>
                    <span className="text-xs text-[var(--muted)]">
                      {r.material.odor_family ?? "família ?"}
                    </span>
                  </div>
                  <label className="flex items-center gap-1 text-xs text-[var(--muted)]">
                    g
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={0.1}
                      value={r.grams}
                      onChange={(e) => updateRow(r.key, { grams: Number(e.target.value) })}
                      className="w-20 min-h-[40px] rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-xs text-[var(--muted)]">
                    dil %
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step={1}
                      value={r.dilutionPct}
                      onChange={(e) => updateRow(r.key, { dilutionPct: Number(e.target.value) })}
                      className="w-20 min-h-[40px] rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeRow(r.key)}
                    aria-label="Remover"
                    className="shrink-0 min-h-[40px] rounded-md border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] hover:border-rose-400/50 hover:text-rose-300 transition-colors"
                  >
                    remover
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Escalar fórmula */}
        {rows.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <h2 className="text-sm font-medium mb-1">Escalar lote</h2>
            <p className="text-xs text-[var(--muted)] mb-3">
              Total atual: <span className="text-[var(--foreground)]">{totalGrams.toFixed(2)} g</span>. Ajuste o
              total desejado e as gramas de todos os materiais mudam proporcionalmente (mantendo as proporções).
            </p>
            <div className="flex items-end gap-3 flex-wrap">
              <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                Total desejado (g / ml)
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.5}
                  value={scaleTarget}
                  onChange={(e) => setScaleTarget(Number(e.target.value))}
                  className="w-28 min-h-[40px] rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                />
              </label>
              <button
                type="button"
                onClick={() => applyScale(scaleTarget)}
                className="min-h-[40px] rounded-lg border border-[var(--accent)] bg-[var(--accent)]/15 px-4 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/25 transition-colors"
              >
                Escalar
              </button>
              <div className="flex gap-1.5 flex-wrap">
                {[5, 10, 30, 50, 100].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setScaleTarget(n);
                      applyScale(n);
                    }}
                    className="min-h-[40px] rounded-md border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] hover:border-[var(--accent)]/60 hover:text-[var(--foreground)] transition-colors"
                  >
                    {n} g
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Salvar / carregar / import / export */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-sm font-medium mb-3">Fórmulas salvas</h2>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={formulaName}
              onChange={(e) => setFormulaName(e.target.value)}
              placeholder="Nome da fórmula…"
              className="flex-1 min-h-[40px] rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={rows.length === 0}
              className="min-h-[40px] rounded-lg border border-[var(--accent)] bg-[var(--accent)]/15 px-4 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/25 transition-colors disabled:opacity-50"
            >
              Salvar
            </button>
          </div>

          <div className="flex gap-2 mb-3 flex-wrap">
            <button
              type="button"
              onClick={handleExport}
              disabled={saved.length === 0}
              className="min-h-[40px] rounded-md border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/60 transition-colors disabled:opacity-50"
            >
              Exportar JSON
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="min-h-[40px] rounded-md border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/60 transition-colors disabled:opacity-50"
            >
              Importar JSON
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImportFile} className="hidden" />
          </div>

          {ioMsg && <p className="text-xs text-[var(--accent)] mb-3">{ioMsg}</p>}

          {loadingSaved ? (
            <p className="text-xs text-[var(--muted)]">Carregando fórmulas…</p>
          ) : saved.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">Nenhuma fórmula salva ainda.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {saved.map((f) => (
                <li key={f.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm truncate">{f.name}</div>
                    <div className="text-[11px] text-[var(--muted)]">
                      {f.items.length} {f.items.length === 1 ? "material" : "materiais"} ·{" "}
                      {new Date(f.createdAt).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleLoad(f)}
                      className="min-h-[40px] rounded-md border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/60 transition-colors"
                    >
                      carregar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(f.id)}
                      className="min-h-[40px] rounded-md border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] hover:text-rose-300 hover:border-rose-400/50 transition-colors disabled:opacity-50"
                    >
                      excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ---------- RESULTADO (direita) ---------- */}
      <div className="flex flex-col gap-4">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">
            A previsão aparece aqui assim que você adicionar materiais.
          </div>
        ) : (
          <>
            {/* Custo estimado do lote */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="text-sm font-medium">Custo estimado do lote</h3>
                <span className="text-lg font-light text-[var(--accent)]">{money(cost.total)}</span>
              </div>
              <p className="text-[11px] text-[var(--muted)] mb-3">
                Estimativa: custo = gramas × menor R$/g do material (material puro). Ignora sobra de embalagem
                (você compra em frascos), diluição e frete.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[var(--muted)] uppercase tracking-wide">
                      <th className="py-1 pr-3">Material</th>
                      <th className="py-1 pr-3">g</th>
                      <th className="py-1 pr-3">R$/g</th>
                      <th className="py-1 pr-3">Fornecedor</th>
                      <th className="py-1 text-right">Custo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cost.lines.map((l) => (
                      <tr key={l.key} className="border-t border-[var(--border)]">
                        <td className="py-1.5 pr-3 truncate max-w-[10rem]">{l.name}</td>
                        <td className="py-1.5 pr-3">{l.grams}</td>
                        <td className="py-1.5 pr-3 text-[var(--muted)]">{moneyPerG(l.pricePerG)}</td>
                        <td className="py-1.5 pr-3 capitalize text-[var(--muted)]">{l.source ?? "—"}</td>
                        <td className="py-1.5 text-right text-[var(--foreground)]">
                          {l.lineCost == null ? "sem preço" : money(l.lineCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {cost.anyMissing && (
                <p className="text-[11px] text-amber-300/90 mt-2">
                  Alguns materiais não têm preço/g registrado — o total é um piso (subestima).
                </p>
              )}
            </div>

            <ResultPanel prediction={prediction} />
          </>
        )}
      </div>
    </div>
  );
}

function ResultPanel({ prediction }: { prediction: Prediction }) {
  return (
    <>
      {/* Avisos */}
      {prediction.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4">
          <h3 className="text-sm font-medium text-amber-300 mb-2">Avisos</h3>
          <ul className="space-y-1.5 text-xs text-amber-200/90">
            {prediction.warnings.map((w, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden>▲</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Métricas: projeção + longevidade */}
      <div className="grid grid-cols-2 gap-4">
        <Gauge label="Projeção" value={prediction.projection} suffix="/100" pct={prediction.projection} />
        <Gauge
          label="Longevidade"
          value={prediction.longevityHours}
          suffix=" h"
          pct={Math.min(100, (prediction.longevityHours / 24) * 100)}
        />
      </div>

      {/* Pirâmide */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h3 className="text-sm font-medium mb-3">Pirâmide olfativa</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PyramidColumn note="topo" hits={prediction.pyramid.topo} />
          <PyramidColumn note="coracao" hits={prediction.pyramid.coracao} />
          <PyramidColumn note="base" hits={prediction.pyramid.base} />
        </div>
      </div>

      {/* Acordes */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h3 className="text-sm font-medium mb-3">Acordes detectados</h3>
        {prediction.accords.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">Nenhum acorde clássico reconhecido.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {prediction.accords.map((a) => (
              <span
                key={a.name}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-1 text-sm text-[var(--accent)]"
              >
                {a.name}
                <span className="text-xs text-[var(--muted)]">{a.score}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Famílias */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h3 className="text-sm font-medium mb-3">Famílias olfativas</h3>
        {prediction.families.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">Sem dados de família.</p>
        ) : (
          <div className="space-y-2">
            {prediction.families.map((f) => (
              <div key={f.name}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="capitalize">{f.name}</span>
                  <span className="text-[var(--muted)]">{f.weight}%</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div className="h-full bg-[var(--accent)]" style={{ width: `${f.weight}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h3 className="text-sm font-medium mb-3">Evolução (timeline)</h3>
        <ol className="space-y-3">
          {prediction.timeline.map((phase) => {
            const meta = NOTE_META[phase.phase];
            return (
              <li key={phase.phase} className="flex gap-3">
                <span
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${meta ? meta.bar : "bg-[var(--muted)]"}`}
                  aria-hidden
                />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className={`text-sm ${meta ? meta.text : ""}`}>{phase.label}</span>
                    <span className="text-xs text-[var(--muted)]">
                      {fmtTime(phase.fromMin)}–{fmtTime(phase.toMin)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)]">{phase.notes.join(", ")}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}

function PyramidColumn({ note, hits }: { note: string; hits: NoteHit[] }) {
  const meta = NOTE_META[note];
  return (
    <div className={`rounded-lg border ${meta.border} ${meta.bg} p-3`}>
      <h4 className={`text-xs font-medium uppercase tracking-wide mb-2 ${meta.text}`}>{meta.label}</h4>
      {hits.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">—</p>
      ) : (
        <ul className="space-y-2">
          {hits.map((h, i) => (
            <li key={`${h.material}-${i}`}>
              <div className="flex justify-between gap-2 text-xs mb-0.5">
                <span className="truncate">{h.material}</span>
                <span className="text-[var(--muted)] shrink-0">{h.intensity}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                <div className={`h-full ${meta.bar}`} style={{ width: `${h.intensity}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Gauge({ label, value, suffix, pct }: { label: string; value: number; suffix: string; pct: number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="text-2xl font-light mt-1">
        {value}
        <span className="text-sm text-[var(--muted)]">{suffix}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
        <div className="h-full bg-[var(--accent)]" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
    </div>
  );
}

function fmtTime(min: number): string {
  if (min < 60) return `${min} min`;
  const h = min / 60;
  return Number.isInteger(h) ? `${h} h` : `${h.toFixed(1)} h`;
}
