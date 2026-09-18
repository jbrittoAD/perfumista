/**
 * card.tsx — A face da carta. É a FICHA INTEIRA, não uma prévia.
 *
 * Decisão de produto: nada que importa para decidir "quero ou não quero" pode
 * exigir um toque a mais. Então a carta traz, sem abrir nada:
 *
 *   família · faixa na pirâmide (topo, topo-coração, coração-base…) · tipo do
 *   material (químico aromático / óleo essencial / base / solvente) · descrição
 *   do cheiro · facetas · para que serve · dose típica · o que cada faixa de
 *   concentração provoca · preço.
 *
 * A folha de detalhe continua existindo (toque ou botão ℹ), mas só para o que é
 * consulta e não decisão: ofertas por fornecedor, CAS, massa molar, IFRA, foto.
 *
 * Layout: foto ocupa o topo; o resto rola DENTRO da carta (`touch-action: pan-y`,
 * com o deck travando o eixo no primeiro movimento) para que o arrasto lateral
 * continue sendo swipe e o vertical continue sendo leitura.
 */

"use client";

import Photo from "./photo";
import {
  brlPrecise, dilutionLabel, familyMeta, kindLabel, notesShort, pct, perGram,
  type Ingredient,
} from "@/lib/deck";

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
  const kind = kindLabel(card.kind);
  const dil = dilutionLabel(card.price.dil);

  return (
    <div className="card-shell flex flex-col" style={{ ["--fam" as string]: fam.hex }}>
      {/* ---------- foto ---------- */}
      <div className="relative h-[27%] shrink-0 overflow-hidden">
        <Photo photoKey={card.photo} seed={card.seq} eager={eager} />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgb(22 22 28) 0%, rgb(22 22 28 / .55) 28%, rgb(0 0 0 / .1) 60%, rgb(0 0 0 / .35) 100%)",
          }}
        />
        {dimmed && <div className="absolute inset-0 bg-black/45" />}

        {/* os três rótulos que o usuário precisa ver de cara */}
        <div className="absolute inset-x-0 top-0 flex flex-wrap gap-1.5 p-3">
          <Badge tint>
            <span aria-hidden>{fam.emoji}</span> {fam.label}
          </Badge>
          <Badge>{notesShort(card.notes)}</Badge>
          {kind && <Badge>{kind}</Badge>}
          {dil && <Badge warn>{dil}</Badge>}
        </div>
      </div>

      {/* ---------- ficha (rola dentro da carta) ---------- */}
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2"
        style={{ touchAction: "pan-y" }}
      >
        <h2 className="pt-1 text-[20px] font-bold leading-[1.1] tracking-[-0.02em]">
          {card.name}
        </h2>

        <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-[var(--fg-dim)]">{card.smell}</p>

        {card.facets.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {card.facets.slice(0, 5).map((f) => (
              <span key={f} className="chip chip-fam !px-2 !py-[2px] !text-[10.5px]">
                {f}
              </span>
            ))}
          </div>
        )}

        {/* O baralho põe os parecidos lado a lado; sem isso a pergunta "por que
            este e não o anterior?" fica sem resposta. */}
        {(card.insight || card.diff) && (
          <p
            className="mt-2 rounded-[var(--r-sm)] border-l-2 py-1 pl-2.5 text-[11.5px]
                       leading-snug text-[var(--fg-dim)]"
            style={{ borderColor: "var(--fam)", background: "color-mix(in srgb, var(--fam) 7%, transparent)" }}
          >
            <span className="font-semibold text-[var(--fg)]">
              {card.insight ? "O que distingue: " : "Diferença: "}
            </span>
            {card.insight ?? card.diff}
          </p>
        )}

        <Block title="Para que serve">
          <p className="text-[12.5px] leading-snug text-[var(--fg-dim)]">{card.uses}</p>
        </Block>

        <Block title={`Dose típica ${pct(card.dose.low)}–${pct(card.dose.high)} · o que cada faixa faz`}>
          <ul className="space-y-0.5">
            {card.perception.map((p, i) => (
              <li key={p.band} className="flex gap-2">
                <span
                  className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: "var(--fam)", opacity: 0.4 + i * 0.3 }}
                />
                <p className="text-[12px] leading-snug text-[var(--fg-dim)]">
                  <strong className="font-semibold text-[var(--fg)]">
                    {p.band} ({p.pct})
                  </strong>{" "}
                  {p.effect}
                </p>
              </li>
            ))}
          </ul>
        </Block>

        {card.tech.ifra != null && (
          <p
            className="mt-2.5 rounded-[var(--r-sm)] border px-2.5 py-1.5 text-[11.5px] leading-snug"
            style={{ borderColor: "rgb(255 95 109 / .35)", background: "rgb(255 95 109 / .1)", color: "#ffb3b8" }}
          >
            {card.tech.ifra === 0
              ? "⛔ Proibido pela IFRA — está aqui só para você reconhecer."
              : `⚠️ Teto IFRA: ${pct(card.tech.ifra)} do produto final (Cat 4).`}
          </p>
        )}
      </div>

      {/* ---------- preço, sempre visível ----------
          Duas medidas, porque só o R$/g engana: uma base a R$ 0,30/g usada a 15%
          sai mais cara na fórmula que uma molécula de R$ 500/g usada a 0,1%. */}
      <div className="shrink-0 border-t border-white/10 px-4 py-2">
        <p className="flex items-baseline gap-2 text-[12.5px]">
          <strong className="text-[15px] font-bold" style={{ color: "var(--fam)" }}>
            {perGram(card.price.perG)}
          </strong>
          {card.price.min != null && (
            <span className="text-[var(--muted)]">
              frasco desde{" "}
              {card.price.min.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          )}
          <span className="ml-auto shrink-0 text-[10.5px] uppercase tracking-wide text-[var(--muted)]">
            ℹ ofertas
          </span>
        </p>
        {card.price.inUse != null && (
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--fg-dim)]">
            Na fórmula:{" "}
            <strong className="font-semibold">{brlPrecise(card.price.inUse)}/g</strong>{" "}
            <span className="text-[var(--muted)]">
              a {pct(card.dose.mid)}
              {card.price.isBlend && " · preço do acorde inteiro, não de uma matéria-prima"}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

function Badge({
  children, tint = false, warn = false,
}: { children: React.ReactNode; tint?: boolean; warn?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-semibold backdrop-blur-md"
      style={
        warn
          ? {
              background: "rgb(217 164 65 / .22)",
              color: "#f0cd8a",
              border: "1px solid rgb(217 164 65 / .5)",
            }
          : tint
          ? {
              background: "color-mix(in srgb, var(--fam) 24%, rgb(0 0 0 / .55))",
              color: "color-mix(in srgb, var(--fam) 72%, white)",
              border: "1px solid color-mix(in srgb, var(--fam) 50%, transparent)",
            }
          : {
              background: "rgb(0 0 0 / .55)",
              color: "rgb(255 255 255 / .88)",
              border: "1px solid rgb(255 255 255 / .18)",
            }
      }
    >
      {children}
    </span>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-2.5">
      <h3 className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
        {title}
      </h3>
      {children}
    </section>
  );
}
