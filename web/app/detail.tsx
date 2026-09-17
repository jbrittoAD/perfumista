/**
 * detail.tsx — Folha de detalhe da carta (abre no toque, rola pra baixo).
 *
 * É o "perfil completo" do ingrediente: cheiro, aplicação, dose, o que cada
 * faixa de concentração PROVOCA, preço por fornecedor e ficha técnica.
 *
 * Duas honestidades ficam explícitas na tela, porque o dado é estimado e o
 * usuário toma decisão de compra a partir daqui:
 *   - a percepção por concentração é heurística (força × dose típica × família);
 *   - o preço é o que foi raspado dos fornecedores, com data de coleta variável.
 *
 * Também mostra o crédito/licença da foto — exigência das licenças CC do Commons.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import Photo from "./photo";
import {
  KIND_LABEL, SOURCE_LABEL, brl, familyMeta, noteLabel, offerLine, pct, perGram,
  photoMeta, usefulSynonyms, type Ingredient,
} from "@/lib/deck";

interface Credit {
  label: string;
  title: string;
  page: string | null;
  author: string | null;
  license: string | null;
}

let creditsCache: Record<string, Credit> | null = null;

export default function Detail({
  card,
  liked,
  onClose,
  onLike,
  onPass,
  onRemove,
}: {
  card: Ingredient;
  liked: boolean | null;
  onClose: () => void;
  onLike?: () => void;
  onPass?: () => void;
  onRemove?: () => void;
}) {
  const fam = familyMeta(card.family);
  const synonyms = usefulSynonyms(card);
  const scroller = useRef<HTMLDivElement>(null);
  const [credit, setCredit] = useState<Credit | null>(creditsCache?.[card.photo] ?? null);

  // Trava o scroll do fundo e devolve no fechamento.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Créditos da foto: arquivo gerado pelo fetch_photos.py, buscado sob demanda
  // (e servido do cache do service worker quando offline).
  useEffect(() => {
    let alive = true;
    if (creditsCache) {
      setCredit(creditsCache[card.photo] ?? null);
      return;
    }
    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    fetch(`${base}/photos/credits.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive || !j) return;
        creditsCache = j as Record<string, Credit>;
        setCredit(creditsCache[card.photo] ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [card.photo]);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={card.name}>
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div
        ref={scroller}
        className="absolute inset-x-0 bottom-0 top-8 mx-auto max-w-lg overflow-y-auto
                   overscroll-contain rounded-t-[1.75rem] border-t border-[var(--border)]
                   bg-[var(--bg-soft)] shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.9)]"
        style={{ ["--fam" as string]: fam.hex }}
      >
        {/* cabeçalho com a foto */}
        <header className="relative h-60 overflow-hidden rounded-t-[1.75rem]">
          <Photo photoKey={card.photo} eager />
          <div className="card-scrim absolute inset-0" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar ficha"
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full
                       border border-white/20 bg-black/50 text-lg text-white/80 backdrop-blur-md"
          >
            ×
          </button>
          <div className="absolute inset-x-0 bottom-0 p-5">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 backdrop-blur-md"
                style={{
                  background: "color-mix(in srgb, var(--fam) 22%, rgb(0 0 0 / 0.5))",
                  color: "color-mix(in srgb, var(--fam) 72%, white)",
                  border: "1px solid color-mix(in srgb, var(--fam) 45%, transparent)",
                }}
              >
                <span aria-hidden>{fam.emoji}</span>
                {fam.label}
              </span>
              {card.note && (
                <span className="rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-white/85 backdrop-blur-md">
                  {noteLabel(card.note)}
                </span>
              )}
              {card.kind && KIND_LABEL[card.kind] && (
                <span className="rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-white/70 backdrop-blur-md">
                  {KIND_LABEL[card.kind]}
                </span>
              )}
            </div>
            <h2 className="mt-2.5 text-[27px] font-bold leading-[1.08] tracking-[-0.02em] text-white">
              {card.name}
            </h2>
            {synonyms.length > 0 && (
              <p className="mt-1 truncate text-[12px] text-white/50">{synonyms.join(" · ")}</p>
            )}
          </div>
        </header>

        <div className="space-y-5 px-5 pb-40 pt-5">
          <Section title="O cheiro">
            <p className="text-[14.5px] leading-relaxed text-[var(--fg-dim)]">{card.smell}</p>
            {card.facets.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {card.facets.map((f) => (
                  <span key={f} className="chip chip-fam">{f}</span>
                ))}
              </div>
            )}
          </Section>

          <Section title="Para que serve">
            <p className="text-[14.5px] leading-relaxed text-[var(--fg-dim)]">{card.uses}</p>
            {card.pairs && (
              <p className="mt-3 rounded-[var(--r-sm)] border border-[var(--border-soft)]
                            bg-[var(--surface)] p-3 text-[13px] leading-relaxed text-[var(--fg-dim)]">
                {card.pairs}
              </p>
            )}
          </Section>

          <Section
            title="Percepção por concentração"
            hint="Estimativa do motor (força × dose típica × família) — não é medição de cheiro."
          >
            <p className="mb-3 text-[13px] text-[var(--muted)]">
              Dosagem típica em fórmulas:{" "}
              <strong className="text-[var(--fg-dim)]">
                {pct(card.dose.low)} a {pct(card.dose.high)}
              </strong>
              {card.dose.label && !sameAsLabel(card) && (
                <span className="text-[var(--muted)]"> (fonte: {card.dose.label})</span>
              )}
            </p>
            <ul className="space-y-2">
              {card.perception.map((p) => (
                <li
                  key={p.band}
                  className="flex gap-3 rounded-[var(--r-sm)] border border-[var(--border-soft)]
                             bg-[var(--surface)] p-3"
                >
                  <span
                    className="mt-[3px] h-[38px] w-[3px] shrink-0 rounded-full"
                    style={{
                      background: "var(--fam)",
                      opacity: p.band === "Baixa" ? 0.35 : p.band === "Média" ? 0.65 : 1,
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[var(--fg)]">
                      {p.band}{" "}
                      <span className="font-normal text-[var(--muted)]">· {p.pct}</span>
                    </p>
                    <p className="mt-0.5 text-[13px] leading-snug text-[var(--fg-dim)]">{p.effect}</p>
                  </div>
                </li>
              ))}
            </ul>
            {card.tech.ifra != null && (
              <p className="mt-3 rounded-[var(--r-sm)] border border-[#ff5f6d]/35 bg-[#ff5f6d]/10
                            p-3 text-[12.5px] leading-snug text-[#ffb3b8]">
                {card.tech.ifra === 0
                  ? "⛔ Material PROIBIDO pela IFRA. Está aqui só para você reconhecer."
                  : `⚠️ Teto IFRA (Cat 4, leave-on): ${card.tech.ifra}% do produto final.`}
              </p>
            )}
          </Section>

          <Section title="Preço no Brasil" hint="Raspado dos fornecedores; confira antes de comprar.">
            <p className="text-[15px] font-semibold text-[var(--fg)]">
              {perGram(card.price.perG)}
              {card.price.min != null && (
                <span className="ml-2 text-[13px] font-normal text-[var(--muted)]">
                  menor frasco {brl(card.price.min)}
                </span>
              )}
            </p>
            {card.price.offers.length > 0 ? (
              <ul className="mt-3 divide-y divide-[var(--border-soft)] overflow-hidden
                             rounded-[var(--r-sm)] border border-[var(--border-soft)] bg-[var(--surface)]">
                {card.price.offers.map((o, i) => (
                  <li key={i}>
                    <a
                      href={o.url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-3 px-3 py-2.5 text-[13px]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-[var(--fg)]">
                          {SOURCE_LABEL[o.s ?? ""] ?? o.s ?? "Fornecedor"}
                        </span>
                        <span className="text-[11.5px] text-[var(--muted)]">{offerLine(o)}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-semibold text-[var(--fg)]">{brl(o.price)}</span>
                        {o.ppg != null && (
                          <span className="text-[11px] text-[var(--muted)]">{perGram(o.ppg)}</span>
                        )}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] text-[var(--muted)]">
                Nenhuma oferta mapeada para este material.
              </p>
            )}
            {card.price.count > card.price.offers.length && (
              <p className="mt-2 text-[11.5px] text-[var(--muted)]">
                Mostrando as {card.price.offers.length} mais baratas de {card.price.count} ofertas.
              </p>
            )}
          </Section>

          <Section title="Ficha técnica">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px]">
              <Fact label="CAS" value={card.cas} />
              <Fact label="Fórmula" value={card.tech.formula} />
              <Fact label="Massa molar" value={card.tech.mw ? `${card.tech.mw} g/mol` : null} />
              <Fact label="Ponto de ebulição" value={card.tech.bp ? `${card.tech.bp} °C` : null} />
              <Fact label="logP" value={card.tech.logp != null ? String(card.tech.logp) : null} />
              <Fact
                label="Força do odor"
                value={card.strength ? card.strength[0].toUpperCase() + card.strength.slice(1) : null}
              />
            </dl>
            {card.familyRaw && (
              <p className="mt-3 text-[11.5px] leading-snug text-[var(--muted)]">
                A fonte classificava como <em>{card.familyRaw}</em>; o app reclassificou para{" "}
                <em>{fam.label.toLowerCase()}</em> a partir dos descritores de cheiro.
              </p>
            )}
            {card.tech.tgsc && (
              <a
                href={card.tech.tgsc}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-[12.5px] font-medium"
                style={{ color: "var(--fam)" }}
              >
                Ficha no The Good Scents Company ↗
              </a>
            )}
          </Section>

          <p className="pt-1 text-[11px] leading-snug text-[var(--muted)]">
            Foto: {photoMeta(card.photo).label}
            {credit ? (
              <>
                {" — "}
                {credit.author ?? "autor não informado"}
                {credit.license ? `, ${credit.license}` : ""}
                {credit.page && (
                  <>
                    {" · "}
                    <a href={credit.page} target="_blank" rel="noopener noreferrer" className="underline">
                      Wikimedia Commons
                    </a>
                  </>
                )}
              </>
            ) : (
              " — Wikimedia Commons"
            )}
            . A imagem ilustra o cheiro, não é o material em si.
          </p>
        </div>

        {/* ações fixas */}
        <div
          className="fixed inset-x-0 bottom-0 mx-auto max-w-lg border-t border-[var(--border-soft)]
                     bg-[var(--bg-soft)]/95 px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]
                     pt-3 backdrop-blur-xl"
        >
          {liked === true ? (
            <div className="flex gap-2">
              <button type="button" onClick={onRemove} className="btn-ghost flex-1">
                Tirar do laboratório
              </button>
              <button type="button" onClick={onClose} className="btn-fam flex-1">
                Fechar
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onPass}
                className="btn flex-1 border"
                style={{ borderColor: "var(--pass)", color: "var(--pass)" }}
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={onLike}
                className="btn flex-1 font-bold text-black"
                style={{ background: "var(--like)" }}
              >
                Quero no laboratório
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** A faixa da fonte vira a mesma coisa depois de formatada? Então não repete. */
function sameAsLabel(card: Ingredient): boolean {
  const digits = (t: string) => (t.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(",", "."));
  const from = digits(card.dose.label ?? "");
  const shown = [String(card.dose.low), String(card.dose.high)];
  return from.length === shown.length && from.every((v, i) => Number(v) === Number(shown[i]));
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="eyebrow mb-2">{title}</h3>
      {children}
      {hint && <p className="mt-2 text-[11px] leading-snug text-[var(--muted)]">{hint}</p>}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className="text-[var(--fg-dim)]">{value ?? "—"}</dd>
    </div>
  );
}
