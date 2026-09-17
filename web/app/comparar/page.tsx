"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAllMaterials, getMaterial, type MaterialDetail } from "@/lib/catalog";
import { capMeta } from "@/lib/cap-colors";
import * as buylist from "@/lib/buylist";
import * as compareset from "@/lib/compareset";

/**
 * /comparar — resposta direta ao "se existem dois cheiros de limão, qual a
 * diferença entre eles?": tabela lado a lado com TODOS os campos técnicos +
 * ofertas de até compareset.MAX materiais. A seleção vem de /explorar,
 * /material/[id] ("⚖️ comparar") ou da busca desta própria página — tudo
 * persistido em lib/compareset.ts (localStorage, só nesta sessão de uso).
 */

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
function moneyPerG(v: number | null) {
  return v == null ? "—" : `${v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/g`;
}
function sourcesLabel(csv: string | null): string {
  if (!csv) return "—";
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => SOURCE_LABEL[s] ?? s)
    .join(", ");
}

// Carregado uma vez — usado só pra alimentar a busca de "adicionar material".
const ALL = getAllMaterials();

interface Row {
  label: string;
  render: (m: MaterialDetail) => React.ReactNode;
}

const ROWS: Row[] = [
  {
    label: "Família",
    render: (m) => {
      const cap = capMeta(m.cap_color);
      return (
        <span className="flex items-center gap-1.5">
          {cap && (
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/30"
              style={{ backgroundColor: cap.hex }}
            />
          )}
          {m.odor_family ?? cap?.label ?? "—"}
        </span>
      );
    },
  },
  { label: "Nota", render: (m) => (m.note_type ? NOTE_LABEL[m.note_type] ?? m.note_type : "—") },
  { label: "CAS", render: (m) => m.cas ?? "—" },
  { label: "Força de odor", render: (m) => m.odor_strength ?? "—" },
  { label: "Ponto de ebulição", render: (m) => (m.boiling_point_c ? `${m.boiling_point_c} °C` : "—") },
  { label: "Peso molecular", render: (m) => (m.molecular_weight ? `${m.molecular_weight} g/mol` : "—") },
  { label: "LogP", render: (m) => (m.logp != null ? String(m.logp) : "—") },
  { label: "Tenacidade", render: (m) => m.tenacity ?? "—" },
  { label: "Dosagem recomendada", render: (m) => m.recommended_dosage ?? "—" },
  { label: "Limite IFRA", render: (m) => (m.ifra_limit_pct != null ? `${m.ifra_limit_pct}%` : "—") },
  { label: "Descrição de odor", render: (m) => m.odor_description ?? "—" },
  { label: "Para que serve", render: (m) => m.key_uses ?? "—" },
  { label: "Preço mínimo", render: (m) => money(m.min_price) },
  { label: "R$/g (material puro)", render: (m) => moneyPerG(m.min_price_per_g) },
  { label: "Ofertas", render: (m) => `${m.offer_count} (${sourcesLabel(m.sources)})` },
];

export default function CompararPage() {
  const [ids, setIds] = useState<number[]>([]);
  const [q, setQ] = useState("");
  const [marked, setMarked] = useState<number[]>([]);

  useEffect(() => {
    setIds(compareset.list());
    setMarked(buylist.list());
  }, []);

  const markedSet = useMemo(() => new Set(marked), [marked]);
  const toggleBuy = useCallback((id: number) => {
    buylist.toggle(id);
    setMarked(buylist.list());
  }, []);

  const materials = useMemo(
    () => ids.map((id) => getMaterial(id)).filter((m): m is MaterialDetail => m != null),
    [ids],
  );

  const remove = useCallback((id: number) => setIds(compareset.remove(id)), []);
  const clearAll = useCallback(() => {
    compareset.clear();
    setIds([]);
  }, []);

  const [full, setFull] = useState(false);
  const addResult = useCallback((id: number) => {
    const res = compareset.add(id);
    setIds(res.list);
    setFull(!res.ok);
    setQ("");
  }, []);

  const searchResults = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const idSet = new Set(ids);
    return ALL.filter(
      (m) =>
        !idSet.has(m.id) &&
        (m.name_canonical.toLowerCase().includes(needle) ||
          (m.name_pt?.toLowerCase().includes(needle) ?? false) ||
          (m.cas?.toLowerCase().includes(needle) ?? false)),
    ).slice(0, 8);
  }, [q, ids]);

  return (
    <div>
      <div className="mb-5">
        <p className="ui-eyebrow">Comparar</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Diferença lado a lado
        </h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          Até {compareset.MAX} materiais, todos os campos técnicos e ofertas juntos. Adicione a partir
          da busca abaixo, ou pelo botão "⚖️ comparar" em{" "}
          <Link href="/explorar" className="text-[var(--accent)] underline">
            Explorar
          </Link>{" "}
          e no detalhe de cada material.
        </p>
      </div>

      {/* Adicionar material */}
      <div className="ui-card mb-5 p-4">
        <div className="flex items-center justify-between gap-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou CAS pra adicionar…"
            disabled={ids.length >= compareset.MAX}
            className="ui-input"
          />
          {ids.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="ml-2 shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              Limpar
            </button>
          )}
        </div>
        {ids.length >= compareset.MAX && (
          <p className="mt-2 text-xs text-amber-300">
            Máximo de {compareset.MAX} materiais — remova um antes de adicionar outro.
          </p>
        )}
        {full && <p className="mt-2 text-xs text-amber-300">Cheio — remova um antes de adicionar.</p>}
        {searchResults.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {searchResults.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => addResult(m.id)}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-left text-sm hover:border-[var(--accent)]/50"
              >
                <span className="truncate">{m.name_canonical}</span>
                <span className="shrink-0 text-xs text-[var(--muted)]">{money(m.min_price)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {materials.length === 0 ? (
        <div className="ui-card flex flex-col items-center gap-2 p-10 text-center">
          <span aria-hidden className="text-3xl">⚖️</span>
          <p className="font-medium">Nenhum material selecionado</p>
          <p className="text-sm text-[var(--muted)]">
            Busque acima ou marque "⚖️ comparar" no catálogo/detalhe de um material.
          </p>
        </div>
      ) : materials.length === 1 ? (
        <p className="text-sm text-[var(--muted)]">
          Só {materials[0].name_canonical} selecionado — adicione pelo menos mais um pra comparar.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left">
                <th className="w-40 py-2 pl-4 pr-3 text-xs uppercase tracking-wide text-[var(--muted)]">
                  Campo
                </th>
                {materials.map((m) => (
                  <th key={m.id} className="min-w-[200px] py-2 px-3 align-top">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/material/${m.id}`} className="font-semibold hover:underline">
                        {m.name_canonical}
                      </Link>
                      <button
                        type="button"
                        onClick={() => remove(m.id)}
                        aria-label={`Remover ${m.name_canonical}`}
                        className="shrink-0 text-[var(--muted)] hover:text-[var(--foreground)]"
                      >
                        ✕
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleBuy(m.id)}
                      className={`mt-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
                        markedSet.has(m.id)
                          ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]"
                          : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/50 hover:text-[var(--foreground)]"
                      }`}
                    >
                      {markedSet.has(m.id) ? "✓ na lista" : "➕ lista de compras"}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-b border-[var(--border)] last:border-b-0">
                  <td className="py-2 pl-4 pr-3 align-top text-xs uppercase tracking-wide text-[var(--muted)]">
                    {row.label}
                  </td>
                  {materials.map((m) => (
                    <td key={m.id} className="py-2 px-3 align-top">
                      {row.render(m)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
