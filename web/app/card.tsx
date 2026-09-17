/**
 * card.tsx — A face da carta no deck.
 *
 * Leitura em 1 segundo, de cima para baixo: foto de tela cheia → família e
 * posição na pirâmide → nome → cheiro em 1–2 linhas → facetas → dose e preço.
 * Todo o resto (aplicação, percepção por concentração, ofertas, ficha técnica)
 * fica na folha de detalhe, que abre no toque.
 */

"use client";

import Photo from "./photo";
import { familyMeta, noteLabel, pct, perGram, type Ingredient } from "@/lib/deck";

export default function Card({
  card,
  eager = false,
  dimmed = false,
}: {
  card: Ingredient;
  eager?: boolean;
  dimmed?: boolean;
}) {
  const fam = familyMeta(card.family);

  return (
    <div className="card-shell" style={{ ["--fam" as string]: fam.hex }}>
      <Photo photoKey={card.photo} eager={eager} />
      <div className="card-scrim absolute inset-0" />

      {dimmed && <div className="absolute inset-0 bg-black/45" />}

      {/* topo: família + posição na pirâmide */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]
                     font-semibold backdrop-blur-md"
          style={{
            background: "color-mix(in srgb, var(--fam) 22%, rgb(0 0 0 / 0.5))",
            color: "color-mix(in srgb, var(--fam) 70%, white)",
            border: "1px solid color-mix(in srgb, var(--fam) 45%, transparent)",
          }}
        >
          <span aria-hidden>{fam.emoji}</span>
          {fam.label}
        </span>
        {card.note && (
          <span className="rounded-full border border-white/15 bg-black/45 px-2.5 py-1
                           text-[11px] font-semibold text-white/85 backdrop-blur-md">
            {noteLabel(card.note)}
          </span>
        )}
      </div>

      {/* rodapé: o conteúdo da carta */}
      <div className="absolute inset-x-0 bottom-0 p-5 pb-5">
        <h2 className="text-[26px] font-bold leading-[1.1] tracking-[-0.02em] text-white">
          {card.name}
        </h2>

        <p className="mt-2 line-clamp-2 text-[13.5px] leading-snug text-white/78">
          {card.smell}
        </p>

        {card.facets.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {card.facets.slice(0, 4).map((f) => (
              <span
                key={f}
                className="rounded-full border border-white/15 bg-white/10 px-2 py-[3px]
                           text-[11px] font-medium text-white/85 backdrop-blur-sm"
              >
                {f}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3 border-t border-white/12 pt-3
                        text-[11.5px] text-white/60">
          <span>
            Dose típica{" "}
            <strong className="font-semibold text-white/85">
              {pct(card.dose.low)}–{pct(card.dose.high)}
            </strong>
          </span>
          <span aria-hidden className="text-white/25">•</span>
          <span className="truncate">{perGram(card.price.perG)}</span>
        </div>

        <p className="mt-2.5 text-[10.5px] font-medium uppercase tracking-[0.1em] text-white/35">
          Toque para ver a ficha completa
        </p>
      </div>
    </div>
  );
}
