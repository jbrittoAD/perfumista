import Link from "next/link";
import { notFound } from "next/navigation";
import { getMaterial, getAllMaterials, allMaterialIds } from "@/lib/catalog";
import { capMeta } from "@/lib/cap-colors";
import { findSimilar } from "@/lib/similar";
import AddToDirect from "./add-to-direct";
import { BuylistButton, CompareButton } from "./quick-actions";

const SOURCE_LABEL: Record<string, string> = {
  flavorist: "Flavorist",
  perfumistico: "Perfumístico",
  perfumoteca: "Perfumoteca",
  euperfumista: "Eu Perfumista",
};

function sourcesLabel(csv: string | null): string {
  if (!csv) return "—";
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => SOURCE_LABEL[s] ?? s)
    .join(", ");
}

type Params = { id: string };

/** Pré-renderiza TODOS os materiais no build (export estático). */
export function generateStaticParams(): Params[] {
  return allMaterialIds().map((id) => ({ id: String(id) }));
}

const NOTE_LABEL: Record<string, string> = { topo: "Topo", coracao: "Coração", base: "Base" };

function money(v: number | null) {
  return v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function moneyPerG(v: number | null) {
  return v == null ? "—" : `${v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/g`;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export default async function MaterialPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const m = getMaterial(Number(id));
  if (!m) notFound();

  // Feature 3 — materiais parecidos (mesmo family_canon + note_type, etc.).
  const similar = findSimilar(m, getAllMaterials(), 6);
  // Carrega o detalhe completo de cada parecido só pra pegar ponto de ebulição
  // (não vem no MaterialCard) — explica POR QUE dois materiais da mesma família
  // são diferentes, não só que são "parecidos".
  const similarDetailed = similar.map((s) => ({
    ...s,
    boiling_point_c: getMaterial(s.material.id)?.boiling_point_c ?? null,
  }));

  return (
    <div>
      <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">← Catálogo</Link>

      <div className="mt-3 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{m.name_canonical}</h1>
          {m.name_pt && m.name_pt !== m.name_canonical && (
            <p className="text-[var(--muted)] text-sm">{m.name_pt}</p>
          )}
          {(() => {
            const cap = capMeta(m.cap_color);
            if (!cap) return null;
            return (
              <p className="mt-1.5 flex items-center gap-2 text-sm text-[var(--muted)]">
                <span
                  aria-hidden
                  className="inline-block h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/30"
                  style={{ backgroundColor: cap.hex }}
                />
                <span>
                  Tampa: <span className="capitalize text-[var(--foreground)]">{m.cap_color}</span>{" "}
                  — {cap.label}
                </span>
              </p>
            );
          })()}
        </div>
        <div className="flex items-center gap-3">
          {m.note_type && (
            <span className="text-xs uppercase tracking-wide px-3 py-1 rounded-full border border-[var(--accent)]/40 text-[var(--accent)] bg-[var(--accent)]/10">
              Nota de {NOTE_LABEL[m.note_type] ?? m.note_type}
            </span>
          )}
          <BuylistButton materialId={m.id} />
          <CompareButton materialId={m.id} />
          <AddToDirect materialId={m.id} name={m.name_canonical} />
        </div>
      </div>

      {/* Dados técnicos */}
      <section className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-sm uppercase tracking-wide text-[var(--muted)] mb-4">Dados técnicos</h2>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="CAS" value={m.cas ? <span className="font-mono">{m.cas}</span> : null} />
          <Field label="Família olfativa" value={m.odor_family} />
          <Field label="Força do odor" value={m.odor_strength} />
          <Field label="Dosagem recomendada" value={m.recommended_dosage} />
          <Field label="Fórmula" value={m.molecular_formula} />
          <Field label="Peso molecular" value={m.molecular_weight ? `${m.molecular_weight} g/mol` : null} />
          <Field label="Ponto de ebulição" value={m.boiling_point_c ? `${m.boiling_point_c} °C` : null} />
          <Field label="Pressão de vapor" value={m.vapor_pressure ? `${m.vapor_pressure} mmHg` : null} />
          <Field label="LogP" value={m.logp} />
          <Field label="Tenacidade" value={m.tenacity} />
          <Field label="PubChem CID" value={m.pubchem_cid} />
        </dl>
        {m.odor_description && (
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <dt className="text-[11px] uppercase tracking-wide text-[var(--muted)] mb-1">Descrição de odor</dt>
            <p className="text-sm">{m.odor_description}</p>
          </div>
        )}
      </section>

      {/* Ofertas / preços */}
      <section className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-sm uppercase tracking-wide text-[var(--muted)] mb-4">
          Onde comprar ({m.offers.length})
        </h2>
        {m.offers.length === 0 ? (
          <p className="text-[var(--muted)] text-sm">Sem ofertas registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            {(() => {
              // Índice da oferta mais barata por grama (offers já vêm ordenadas por price_per_g).
              let cheapestIdx = -1;
              let cheapest = Infinity;
              m.offers.forEach((o, i) => {
                if (o.price_per_g != null && o.price_per_g < cheapest) {
                  cheapest = o.price_per_g;
                  cheapestIdx = i;
                }
              });
              return (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--muted)] text-xs uppercase tracking-wide">
                      <th className="py-2 pr-4">Fornecedor</th>
                      <th className="py-2 pr-4">Tamanho</th>
                      <th className="py-2 pr-4">Diluição</th>
                      <th className="py-2 pr-4">Preço</th>
                      <th className="py-2 pr-4">R$/g</th>
                      <th className="py-2 pr-4">Estoque</th>
                      <th className="py-2">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.offers.map((o, i) => (
                      <tr
                        key={i}
                        className={`border-t border-[var(--border)] ${
                          i === cheapestIdx ? "bg-[var(--accent)]/10" : ""
                        }`}
                      >
                        <td className="py-2 pr-4 capitalize">
                          {o.source === "euperfumista" ? "Eu Perfumista" : o.source}
                          {i === cheapestIdx && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-[var(--accent)]">
                              melhor R$/g
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {o.size_value ? `${o.size_value} ${o.size_unit ?? ""}` : "—"}
                        </td>
                        <td className="py-2 pr-4">{o.dilution ?? "—"}</td>
                        <td className="py-2 pr-4 text-[var(--accent)] font-medium">{money(o.price)}</td>
                        <td
                          className={`py-2 pr-4 ${
                            i === cheapestIdx ? "text-[var(--accent)] font-medium" : "text-[var(--muted)]"
                          }`}
                        >
                          {moneyPerG(o.price_per_g)}
                        </td>
                        <td className="py-2 pr-4">
                          {o.in_stock == null ? "—" : o.in_stock ? "✓" : "✗"}
                        </td>
                        <td className="py-2">
                          <a href={o.source_url} target="_blank" rel="noreferrer" className="text-[var(--muted)] hover:text-[var(--foreground)] underline">
                            abrir
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        )}
      </section>

      {/* Materiais parecidos (comparação: por que usar X ou Y) */}
      {similarDetailed.length > 0 && (
        <section className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-sm uppercase tracking-wide text-[var(--muted)] mb-1">Materiais parecidos</h2>
          <p className="mb-4 text-xs text-[var(--muted)]">
            Mesmo perfil olfativo — compare cheiro, força, ebulição e preço antes de escolher. Quer os
            dois lado a lado?{" "}
            <Link href="/comparar" className="text-[var(--accent)] underline">
              Abrir Comparar
            </Link>
            .
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {similarDetailed.map(({ material: s, kind, boiling_point_c }) => {
              const cap = capMeta(s.cap_color);
              return (
                <div key={s.id} className="ui-card flex flex-col p-4">
                  <Link href={`/material/${s.id}`} className="block">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{s.name_canonical}</span>
                        {cap && (
                          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
                            <span
                              aria-hidden
                              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/30"
                              style={{ backgroundColor: cap.hex }}
                            />
                            {cap.label}
                            {s.note_type && ` · ${NOTE_LABEL[s.note_type] ?? s.note_type}`}
                          </span>
                        )}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          kind === "same"
                            ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                            : "border border-[var(--border)] text-[var(--muted)]"
                        }`}
                      >
                        {kind === "same" ? "🟰 Mesmo composto" : "≈ Parecido"}
                      </span>
                    </div>

                    <p className="mt-1.5 text-[11px] italic text-[var(--muted)]">
                      {kind === "same"
                        ? "Escolha pelo preço/fornecedor."
                        : "Compare cheiro/força/uso."}
                    </p>

                    {s.odor_description && (
                      <p className="mt-2 line-clamp-3 text-xs text-[var(--foreground)]">
                        {s.odor_description}
                      </p>
                    )}
                    {s.key_uses && (
                      <p className="mt-1.5 line-clamp-2 text-[11px] text-[var(--muted)]">
                        {s.key_uses}
                      </p>
                    )}

                    {/* Linha de diferenças: o que de fato distingue este parecido do material atual. */}
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-[var(--border)] pt-2 text-[11px] text-[var(--muted)]">
                      <span>Ebulição: {boiling_point_c ? `${boiling_point_c} °C` : "—"}</span>
                      <span>Força: {s.odor_strength ?? "—"}</span>
                      <span className="truncate">Fornecedores: {sourcesLabel(s.sources)}</span>
                      <span className="font-semibold text-[var(--accent)]">{money(s.min_price)}</span>
                    </div>
                  </Link>

                  <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                    <BuylistButton materialId={s.id} />
                    <CompareButton materialId={s.id} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Sinônimos */}
      {m.synonyms.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm uppercase tracking-wide text-[var(--muted)] mb-2">Sinônimos</h2>
          <div className="flex flex-wrap gap-1.5">
            {m.synonyms.map((s: string) => (
              <span key={s} className="text-xs px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
                {s}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
