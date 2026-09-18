/**
 * paleta/page.tsx — "Montar paleta": planejar a compra de N frascos.
 *
 * Três passos:
 *   1. PLANO   — quantos frascos por família, teto de preço por frasco e,
 *                opcionalmente, reservar vaga para os materiais de uma fórmula
 *                salva (é o que garante que a paleta consiga fazer aquilo).
 *   2. ESCOLHA — família por família, um candidato de cada vez, com o cheiro
 *                explicado. O usuário decide; o app só ordena a fila e reordena
 *                a cada escolha, para não oferecer três materiais parecidos em
 *                seguida.
 *   3. LISTA   — o que foi escolhido, o custo, e a exportação.
 *
 * A escolha é manual de propósito. O seletor automático existe (lib/palette.ts)
 * e é bom para simular cenários, mas comprar 110 frascos sem entender o que cada
 * um cheira é o oposto de montar uma paleta.
 */

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Card from "../card";
import Detail from "../detail";
import Photo from "../photo";
import {
  FAMILIES, brlPrecise, familyMeta, getCard, notesShort, perGram,
  type FamilySlug, type Ingredient,
} from "@/lib/deck";
import {
  palettePick, paletteRemove, paletteReset, paletteSkip, setPalette, useDeckState,
} from "@/lib/deck-store";
import { buildSteps } from "@/lib/palette-flow";
import { ALVOS, resolverAlvo } from "@/lib/alvos";

type Fase = "plano" | "escolha" | "lista";

const PRESETS: { nome: string; nota: string; quotas: Partial<Record<FamilySlug, number>> }[] = [
  {
    // Pesos invertidos em relação ao genérico: a aromática dobra (é a espinha do
    // fougère e a maior família do catálogo), madeira e especiaria sobem, floral
    // cai — mas aldeído NÃO cai: o masculino ensaboado é feito de C-10/C-11/C-12
    // com almíscar branco, e é o perfil mais vendido no Brasil.
    nome: "Masculino · 110",
    nota: "fougère, amadeirado e ensaboado — o eixo masculino",
    quotas: { herbal: 18, woody: 17, citrus: 12, aldehydic: 10, amber: 10, musk: 9,
              spicy: 7, green: 6, balsamic: 5, aquatic: 4, floral: 4, leather: 3,
              gourmand: 3, fruity: 2 },
  },
  {
    nome: "Cobertura completa · 110",
    nota: "todas as famílias, peso no fresco",
    quotas: { aldehydic: 10, citrus: 12, green: 10, aquatic: 8, woody: 12, musk: 8,
              gourmand: 7, floral: 14, amber: 9, herbal: 9, fruity: 6, spicy: 3, balsamic: 3, leather: 1 },
  },
  {
    nome: "Enxuta · 60",
    nota: "o essencial para começar",
    quotas: { aldehydic: 5, citrus: 7, green: 5, aquatic: 4, woody: 7, musk: 5,
              gourmand: 4, floral: 8, amber: 5, herbal: 5, fruity: 3, spicy: 2 },
  },
  {
    nome: "Ampla · 220",
    nota: "quando o armário permite",
    quotas: { aldehydic: 15, citrus: 24, green: 22, aquatic: 14, woody: 26, musk: 22,
              gourmand: 20, floral: 26, amber: 20, herbal: 20, fruity: 14, spicy: 8, balsamic: 8, leather: 4 },
  },
];

export default function Paleta() {
  const state = useDeckState();
  const pal = state.palette;
  const [fase, setFase] = useState<Fase>("plano");
  const [famAtiva, setFamAtiva] = useState<FamilySlug | null>(null);
  const [detalhe, setDetalhe] = useState<Ingredient | null>(null);

  const steps = useMemo(
    () => buildSteps(pal.quotas, pal.picks, pal.skipped, pal.maxPerBottle, pal.grams),
    [pal.quotas, pal.picks, pal.skipped, pal.maxPerBottle, pal.grams],
  );

  const escolhidos = useMemo(
    () => pal.picks.map((id) => getCard(id)).filter((c): c is Ingredient => !!c),
    [pal.picks],
  );
  const totalPlanejado = Object.values(pal.quotas).reduce((s, n) => s + (n || 0), 0);
  const custo = escolhidos.reduce((s, c) => s + (c.price.perG ?? 0) * pal.grams, 0);
  const semPreco = escolhidos.filter((c) => c.price.perG == null).length;

  const stepAtivo = steps.find((s) => s.family === famAtiva) ?? steps.find((s) => !s.done);
  const candidato = stepAtivo?.candidates[0] ?? null;

  function ajustar(f: FamilySlug, delta: number) {
    const atual = pal.quotas[f] ?? 0;
    const disponivel = FAMILIES.find((x) => x.slug === f)?.count ?? 0;
    const novo = Math.max(0, Math.min(disponivel, atual + delta));
    setPalette({ quotas: { ...pal.quotas, [f]: novo } });
  }

  async function copiar() {
    const linhas = escolhidos
      .sort((a, b) => familyMeta(a.family).order - familyMeta(b.family).order)
      .map((c) => `• ${c.name} — ${familyMeta(c.family).label} — ${perGram(c.price.perG)}`);
    try {
      await navigator.clipboard.writeText(
        `Paleta Perfumista — ${escolhidos.length} frascos de ${pal.grams}g\n\n${linhas.join("\n")}`,
      );
    } catch {
      /* clipboard bloqueado */
    }
  }

  return (
    <div
      className={`flex flex-col ${fase === "escolha" ? "overflow-hidden" : "min-h-[100dvh]"}`}
      style={
        fase === "escolha"
          ? { height: "calc(100dvh - var(--tab-h) - env(safe-area-inset-bottom, 0px))" }
          : undefined
      }
    >
      <header className="shrink-0 sticky top-0 z-20 bg-[var(--bg)]/92 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h1 className="text-[15px] font-bold tracking-tight">Montar paleta</h1>
          <span className="text-[11.5px] text-[var(--muted)]">
            {escolhidos.length} de {totalPlanejado || "—"}
          </span>
        </div>
        <div className="mt-2.5 flex rounded-full border border-[var(--border)] p-[2px] text-[11.5px] font-semibold">
          {(["plano", "escolha", "lista"] as Fase[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFase(f)}
              className="flex-1 rounded-full py-1 capitalize transition-colors"
              style={{
                background: fase === f ? "var(--surface-2)" : "transparent",
                color: fase === f ? "var(--fg)" : "var(--muted)",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      {fase === "plano" && (
        <Plano
          pal={pal}
          total={totalPlanejado}
          onAjustar={ajustar}
          onPreset={(q) => setPalette({ quotas: q })}
          onTeto={(v) => setPalette({ maxPerBottle: v })}
          onGramas={(v) => setPalette({ grams: v })}
          onComecar={() => setFase("escolha")}
          onReservar={(ids) => ids.forEach(palettePick)}
        />
      )}

      {fase === "escolha" && (
        <Escolha
          steps={steps}
          stepAtivo={stepAtivo ?? null}
          candidato={candidato}
          onFamilia={setFamAtiva}
          onDetalhe={setDetalhe}
          onVerLista={() => setFase("lista")}
        />
      )}

      {fase === "lista" && (
        <Lista
          escolhidos={escolhidos}
          custo={custo}
          semPreco={semPreco}
          gramas={pal.grams}
          onRemover={paletteRemove}
          onDetalhe={setDetalhe}
          onCopiar={copiar}
          onZerar={paletteReset}
        />
      )}

      {detalhe && (
        <Detail
          card={detalhe}
          liked={state.swipes[detalhe.id]?.dir === "like"}
          onClose={() => setDetalhe(null)}
          onLike={() => { palettePick(detalhe.id); setDetalhe(null); }}
          onPass={() => { paletteSkip(detalhe.id); setDetalhe(null); }}
          onRemove={() => { paletteRemove(detalhe.id); setDetalhe(null); }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Plano({
  pal, total, onAjustar, onPreset, onTeto, onGramas, onComecar, onReservar,
}: {
  pal: ReturnType<typeof useDeckState>["palette"];
  total: number;
  onAjustar: (f: FamilySlug, d: number) => void;
  onPreset: (q: Partial<Record<FamilySlug, number>>) => void;
  onTeto: (v: number | null) => void;
  onGramas: (v: number) => void;
  onComecar: () => void;
  onReservar: (ids: number[]) => void;
}) {
  return (
    <div className="flex-1 space-y-4 px-4 pb-8">
      <section>
        <h2 className="eyebrow mb-2">Comece de um plano pronto</h2>
        <div className="space-y-2">
          {PRESETS.map((p) => (
            <button
              key={p.nome}
              type="button"
              onClick={() => onPreset(p.quotas)}
              className="panel w-full p-3 text-left"
            >
              <p className="text-[13.5px] font-semibold">{p.nome}</p>
              <p className="text-[11.5px] text-[var(--muted)]">{p.nota}</p>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="eyebrow mb-2">Garantir que dá para fazer</h2>
        <p className="mb-2 text-[11.5px] leading-snug text-[var(--muted)]">
          Reserva vaga para os materiais do eixo. Reconstrução a partir da pirâmide
          divulgada — a fórmula real é do fabricante.
        </p>
        <div className="space-y-2">
          {ALVOS.map((a) => {
            const itens = resolverAlvo(a).filter((x) => x.card);
            const jaTem = itens.filter((x) => pal.picks.includes(x.card!.id)).length;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onReservar(itens.map((x) => x.card!.id))}
                className="panel w-full p-3 text-left"
              >
                <p className="text-[13.5px] font-semibold">{a.nome}</p>
                <p className="text-[11.5px] text-[var(--muted)]">{a.nota}</p>
                <p className="mt-1 text-[11.5px]" style={{ color: jaTem === itens.length ? "var(--like)" : "var(--fam)" }}>
                  {jaTem === itens.length
                    ? `✓ os ${itens.length} materiais já estão na paleta`
                    : `reservar ${itens.length} materiais (${jaTem} já escolhidos)`}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel p-3">
        <h2 className="eyebrow mb-2">Regras da compra</h2>
        <label className="flex items-center justify-between py-1.5 text-[13px]">
          <span>Tamanho do frasco</span>
          <span className="flex gap-1">
            {[5, 10, 20].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onGramas(g)}
                className="rounded-full px-2.5 py-1 text-[12px] font-semibold"
                style={{
                  background: pal.grams === g ? "var(--fam)" : "var(--surface-2)",
                  color: pal.grams === g ? "#000" : "var(--muted)",
                }}
              >
                {g}g
              </button>
            ))}
          </span>
        </label>
        <label className="flex items-center justify-between py-1.5 text-[13px]">
          <span>
            Teto por frasco
            <span className="block text-[11px] text-[var(--muted)]">
              esconde as especialidades caras
            </span>
          </span>
          <span className="flex gap-1">
            {[60, 120, 250, null].map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => onTeto(v)}
                className="rounded-full px-2.5 py-1 text-[12px] font-semibold"
                style={{
                  background: pal.maxPerBottle === v ? "var(--fam)" : "var(--surface-2)",
                  color: pal.maxPerBottle === v ? "#000" : "var(--muted)",
                }}
              >
                {v ? `R$${v}` : "sem"}
              </button>
            ))}
          </span>
        </label>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="eyebrow">Frascos por família</h2>
          <span className="text-[12px] font-semibold" style={{ color: "var(--fam)" }}>
            {total} no total
          </span>
        </div>
        <ul className="space-y-1.5">
          {FAMILIES.map((f) => {
            const n = pal.quotas[f.slug] ?? 0;
            return (
              <li key={f.slug} className="panel flex items-center gap-3 px-3 py-2">
                <span className="text-[15px]" aria-hidden>{f.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{f.label}</span>
                  <span className="text-[11px] text-[var(--muted)]">{f.count} disponíveis</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <StepBtn onClick={() => onAjustar(f.slug, -1)} label="menos">−</StepBtn>
                  <span className="w-7 text-center text-[13px] font-bold tabular-nums">{n}</span>
                  <StepBtn onClick={() => onAjustar(f.slug, +1)} label="mais">+</StepBtn>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <button type="button" onClick={onComecar} disabled={total === 0} className="btn-fam w-full disabled:opacity-40">
        Escolher os {total || ""} frascos um a um
      </button>
    </div>
  );
}

function Escolha({
  steps, stepAtivo, candidato, onFamilia, onDetalhe, onVerLista,
}: {
  steps: ReturnType<typeof buildSteps>;
  stepAtivo: ReturnType<typeof buildSteps>[number] | null;
  candidato: Ingredient | null;
  onFamilia: (f: FamilySlug) => void;
  onDetalhe: (c: Ingredient) => void;
  onVerLista: () => void;
}) {
  if (steps.length === 0) {
    return (
      <div className="flex-1 px-4">
        <p className="panel mt-6 p-6 text-center text-[13px] text-[var(--muted)]">
          Defina as cotas no passo <strong>plano</strong> primeiro.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
      <div className="scrollbar-none -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
        {steps.map((s) => {
          const f = familyMeta(s.family);
          const ativo = stepAtivo?.family === s.family;
          return (
            <button
              key={s.family}
              type="button"
              onClick={() => onFamilia(s.family)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold"
              style={{
                borderColor: ativo ? f.hex : "var(--border)",
                background: ativo ? `color-mix(in srgb, ${f.hex} 18%, transparent)` : "var(--surface)",
                color: s.done ? "var(--like)" : ativo ? `color-mix(in srgb, ${f.hex} 75%, white)` : "var(--muted)",
              }}
            >
              <span aria-hidden>{f.emoji}</span>
              {s.chosen.length}/{s.quota}
              {s.done && " ✓"}
            </button>
          );
        })}
      </div>

      {stepAtivo && candidato ? (
        <>
          <p className="mb-2 text-[12px] text-[var(--muted)]">
            <strong style={{ color: "var(--fam)" }}>
              {familyMeta(stepAtivo.family).label}
            </strong>{" "}
            — faltam {Math.max(0, stepAtivo.quota - stepAtivo.chosen.length)} de {stepAtivo.quota}
            {" · "}
            {stepAtivo.candidates.length} candidatos na fila
          </p>

          <div className="relative mx-auto w-full min-h-0 max-w-[26rem] flex-1">
            <button
              type="button"
              onClick={() => onDetalhe(candidato)}
              className="absolute inset-0 text-left"
              aria-label={`Ver ficha de ${candidato.name}`}
            >
              <Card card={candidato} eager />
            </button>
          </div>

          <div className="mt-3 flex shrink-0 items-center justify-center gap-4">
            <AcaoBtn onClick={() => paletteSkip(candidato.id)} cor="var(--pass)" rotulo="Pular">✕</AcaoBtn>
            <AcaoBtn onClick={() => onDetalhe(candidato)} cor="var(--fam)" rotulo="Ficha" pequeno>ℹ</AcaoBtn>
            <AcaoBtn onClick={() => palettePick(candidato.id)} cor="var(--like)" rotulo="Comprar">♥</AcaoBtn>
          </div>
        </>
      ) : (
        <div className="panel mt-6 p-6 text-center">
          <p className="text-3xl" aria-hidden>🎉</p>
          <h2 className="mt-3 text-[16px] font-bold">
            {steps.every((s) => s.done) ? "Paleta completa" : "Acabaram os candidatos desta família"}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
            {steps.every((s) => s.done)
              ? "Todas as cotas foram preenchidas."
              : "Você pulou todos os que restavam. Escolha outra família acima ou baixe a cota no plano."}
          </p>
          <button type="button" onClick={onVerLista} className="btn-fam mt-5">
            Ver a lista de compra
          </button>
        </div>
      )}
    </div>
  );
}

function Lista({
  escolhidos, custo, semPreco, gramas, onRemover, onDetalhe, onCopiar, onZerar,
}: {
  escolhidos: Ingredient[];
  custo: number;
  semPreco: number;
  gramas: number;
  onRemover: (id: number) => void;
  onDetalhe: (c: Ingredient) => void;
  onCopiar: () => void;
  onZerar: () => void;
}) {
  const porFamilia = useMemo(() => {
    const m = new Map<FamilySlug, Ingredient[]>();
    for (const c of escolhidos) m.set(c.family, [...(m.get(c.family) ?? []), c]);
    return [...m.entries()].sort((a, b) => familyMeta(a[0]).order - familyMeta(b[0]).order);
  }, [escolhidos]);

  if (escolhidos.length === 0) {
    return (
      <div className="flex-1 px-4">
        <p className="panel mt-6 p-6 text-center text-[13px] text-[var(--muted)]">
          Nada escolhido ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 px-4 pb-8">
      <div className="panel p-3">
        <p className="text-[15px] font-bold">
          {escolhidos.length} frascos de {gramas}g ·{" "}
          <span style={{ color: "var(--fam)" }}>
            {custo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </p>
        {semPreco > 0 && (
          <p className="mt-1 text-[11.5px] text-[var(--muted)]">
            {semPreco} sem preço mapeado — o total real é maior.
          </p>
        )}
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={onCopiar} className="btn-ghost flex-1">Copiar lista</button>
          <Link href="/lab" className="btn-ghost flex-1">Meu laboratório</Link>
        </div>
      </div>

      {porFamilia.map(([fam, cs]) => {
        const f = familyMeta(fam);
        const sub = cs.reduce((s, c) => s + (c.price.perG ?? 0) * gramas, 0);
        return (
          <section key={fam}>
            <h2 className="eyebrow mb-1.5">
              {f.emoji} {f.label} · {cs.length} ·{" "}
              {sub.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </h2>
            <ul className="space-y-1.5">
              {cs.map((c) => (
                <li key={c.id} className="panel flex items-center gap-3 p-2">
                  <button
                    type="button"
                    onClick={() => onDetalhe(c)}
                    className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[var(--r-sm)]"
                    aria-label={`Ficha de ${c.name}`}
                  >
                    <Photo photoKey={c.photo} seed={c.seq} />
                  </button>
                  <button type="button" onClick={() => onDetalhe(c)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-[13.5px] font-semibold">{c.name}</p>
                    <p className="text-[11px] text-[var(--muted)]">
                      {notesShort(c.notes)} · {perGram(c.price.perG)} ·{" "}
                      {brlPrecise((c.price.perG ?? 0) * gramas)} o frasco
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemover(c.id)}
                    className="shrink-0 px-2 text-[15px] text-[var(--muted)]"
                    aria-label={`Tirar ${c.name} da paleta`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <button
        type="button"
        onClick={() => {
          if (window.confirm("Zerar as escolhas da paleta? O plano de cotas continua.")) onZerar();
        }}
        className="w-full text-[12px] text-[var(--muted)] underline"
      >
        Zerar as escolhas
      </button>
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

function AcaoBtn({
  onClick, cor, rotulo, pequeno, children,
}: { onClick: () => void; cor: string; rotulo: string; pequeno?: boolean; children: React.ReactNode }) {
  const dim = pequeno ? "h-[46px] w-[46px] text-[18px]" : "h-[58px] w-[58px] text-[24px]";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      title={rotulo}
      className={`${dim} grid place-items-center rounded-full border-2 bg-[var(--surface)]
                  transition-transform active:scale-90`}
      style={{ borderColor: cor, color: cor }}
    >
      {children}
    </button>
  );
}
