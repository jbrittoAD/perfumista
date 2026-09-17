import type { Metadata } from "next";
import Link from "next/link";
import metodo from "@/lib/data/metodo.json";
import { getModule } from "@/lib/course";

export const metadata: Metadata = {
  title: "Método — Perfumista",
  description:
    "A metodologia de aprendizado acelerado do Perfumista: recordação ativa, repetição espaçada, intercalação e treino do nariz.",
};

type Principio = { nome: string; o_que: string; por_que: string; no_app: string };
type Rotina = { passo: string; min: number; detalhe: string; link: string };
type Fase = { fase: string; objetivo: string; modulos: string[]; pratica: string };
type Referencia = { titulo: string; url: string };

type Metodo = {
  titulo: string;
  resumo: string;
  principios: Principio[];
  rotina_diaria: Rotina[];
  fast_track: Fase[];
  treino_nariz: string[];
  srs_config: { explicacao: string; intervalos_dias: number[] };
  referencias: Referencia[];
};

const m = metodo as Metodo;

function moduleLabel(id: string): { title: string; index: number } | null {
  const mod = getModule(id);
  if (!mod) return null;
  // índice 1-based do módulo na ordem do curso
  const idx = Number(id.replace(/^m/, ""));
  return { title: mod.title, index: Number.isFinite(idx) ? idx : 0 };
}

export default function MetodoPage() {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{m.titulo}</h1>
        <p className="mt-3 text-[var(--muted)] leading-relaxed">{m.resumo}</p>
      </header>

      {/* Como usar o app */}
      <section className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/5 p-5">
        <h2 className="text-lg font-medium">Como usar o app para aprender rápido</h2>
        <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">
          Abra o <Link href="/hoje" className="text-[var(--accent)] hover:underline">painel de Hoje</Link> todos
          os dias: ele diz exatamente o que fazer em ~30 min. Comece limpando as{" "}
          <Link href="/revisar" className="text-[var(--accent)] hover:underline">revisões</Link> (repetição
          espaçada), faça 1 aula nova no{" "}
          <Link href="/curso" className="text-[var(--accent)] hover:underline">curso</Link> e 1 exercício de
          nariz. Cada princípio abaixo vira uma tela concreta do app.
        </p>
      </section>

      {/* Princípios */}
      <section>
        <h2 className="text-xl font-light tracking-tight">Os princípios (e onde vivem no app)</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {m.principios.map((p) => (
            <article
              key={p.nome}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <h3 className="font-medium leading-snug">{p.nome}</h3>
              <dl className="mt-3 space-y-3 text-sm leading-relaxed">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    O que é
                  </dt>
                  <dd className="mt-0.5">{p.o_que}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Por que funciona
                  </dt>
                  <dd className="mt-0.5 text-[var(--muted)]">{p.por_que}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                    No app
                  </dt>
                  <dd className="mt-0.5">{p.no_app}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      {/* Rotina diária */}
      <section>
        <h2 className="text-xl font-light tracking-tight">A rotina diária (~30 min)</h2>
        <ol className="mt-4 space-y-3">
          {m.rotina_diaria.map((r, i) => (
            <li
              key={r.passo}
              className="flex gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--accent)] text-sm font-medium text-[var(--accent)]">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={r.link} className="font-medium hover:text-[var(--accent)]">
                    {r.passo}
                  </Link>
                  <span className="shrink-0 text-xs text-[var(--muted)]">{r.min} min</span>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)] leading-relaxed">{r.detalhe}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Fast-track */}
      <section>
        <h2 className="text-xl font-light tracking-tight">Fast-track: a ordem sugerida</h2>
        <div className="mt-4 space-y-4">
          {m.fast_track.map((f) => (
            <article
              key={f.fase}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <h3 className="font-medium">{f.fase}</h3>
              <p className="mt-1 text-sm text-[var(--muted)] leading-relaxed">{f.objetivo}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {f.modulos.map((id) => {
                  const info = moduleLabel(id);
                  return (
                    <Link
                      key={id}
                      href={`/curso#${id}`}
                      title={info?.title ?? id}
                      className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs font-medium transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      <span className="text-[var(--muted)]">M{info?.index ?? id.replace(/^m/, "")}</span>
                      {info?.title ?? id}
                    </Link>
                  );
                })}
              </div>
              <p className="mt-3 text-sm leading-relaxed">
                <span className="font-medium text-[var(--accent)]">Prática: </span>
                {f.pratica}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Treino de nariz */}
      <section>
        <h2 className="text-xl font-light tracking-tight">Treino do nariz</h2>
        <ul className="mt-4 space-y-2">
          {m.treino_nariz.map((t, i) => (
            <li
              key={i}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-relaxed"
            >
              {t}
            </li>
          ))}
        </ul>
      </section>

      {/* SRS */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-medium">Como o SRS agenda suas revisões</h2>
        <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">{m.srs_config.explicacao}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--muted)]">Escada de intervalos (dias):</span>
          {m.srs_config.intervalos_dias.map((d, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium">
                {d}
              </span>
              {i < m.srs_config.intervalos_dias.length - 1 && (
                <span className="text-[var(--muted)]">→</span>
              )}
            </span>
          ))}
        </div>
      </section>

      {/* Referências */}
      <section>
        <h2 className="text-xl font-light tracking-tight">Referências</h2>
        <ul className="mt-4 space-y-1.5">
          {m.referencias.map((r) => (
            <li key={r.url}>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
              >
                {r.titulo} ↗
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
