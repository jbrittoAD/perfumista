import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allLessons, findLesson, levelStyle, totalLessons } from "@/lib/course";
import LessonMarkdown from "../markdown";
import DoneToggle from "./done-toggle";

type Params = { lessonId: string };

export function generateStaticParams(): Params[] {
  return allLessons.map((e) => ({ lessonId: e.lesson.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lessonId } = await params;
  const found = findLesson(lessonId);
  if (!found) return { title: "Aula não encontrada — Perfumista" };
  return { title: `${found.lesson.title} — Curso Perfumista` };
}

function isInternal(href: string): boolean {
  return href.startsWith("/");
}

export default async function LessonPage({ params }: { params: Promise<Params> }) {
  const { lessonId } = await params;
  const found = findLesson(lessonId);
  if (!found) notFound();

  const { lesson, module, prev, next, position } = found;
  const badge = levelStyle(module.level);
  const isLastOfModule = module.lessons[module.lessons.length - 1]?.id === lesson.id;
  const hasQuiz = (module.quiz?.length ?? 0) > 0;

  return (
    <article className="max-w-3xl mx-auto">
      {/* cabeçalho */}
      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-2">
          <Link href="/curso" className="hover:text-[var(--foreground)]">
            Curso
          </Link>
          <span aria-hidden>/</span>
          <span>{module.title}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-light tracking-tight leading-tight">
          {lesson.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
          <span>·</span>
          <span>{lesson.duration_min} min de leitura</span>
          <span>·</span>
          <span>
            Aula {position} de {totalLessons}
          </span>
        </div>
      </header>

      {/* corpo em markdown */}
      <LessonMarkdown>{lesson.body_md}</LessonMarkdown>

      {/* pontos-chave */}
      {lesson.key_points.length > 0 && (
        <section className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">
            Pontos-chave
          </h2>
          <ul className="space-y-2">
            {lesson.key_points.map((kp, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                <span className="text-[var(--accent)] mt-0.5" aria-hidden>
                  ◆
                </span>
                <span>{kp}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* exercício */}
      {lesson.exercise && (
        <section className="mt-5 rounded-xl border border-[var(--accent)]/50 bg-[var(--accent)]/10 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)] mb-2">
            Exercício
          </h2>
          <p className="text-sm leading-relaxed">{lesson.exercise}</p>
        </section>
      )}

      {/* ferramentas */}
      {lesson.app_links.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">
            Ferramentas
          </h2>
          <div className="flex flex-wrap gap-2">
            {lesson.app_links.map((link, i) =>
              isInternal(link.href) ? (
                <Link
                  key={i}
                  href={link.href}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm hover:bg-[var(--surface-2)] hover:border-[var(--accent)] transition-colors"
                >
                  {link.label} →
                </Link>
              ) : (
                <a
                  key={i}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm hover:bg-[var(--surface-2)] hover:border-[var(--accent)] transition-colors"
                >
                  {link.label} ↗
                </a>
              ),
            )}
          </div>
        </section>
      )}

      {/* referências */}
      {lesson.references.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">
            Referências
          </h2>
          <ul className="space-y-1.5">
            {lesson.references.map((ref, i) => (
              <li key={i} className="text-sm">
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--accent)] hover:underline underline-offset-2"
                >
                  {ref.title} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* concluir */}
      <div className="mt-8 flex justify-center">
        <DoneToggle lessonId={lesson.id} />
      </div>

      {/* quiz do módulo — ao final da última aula */}
      {isLastOfModule && hasQuiz && (
        <section className="mt-8 rounded-xl border border-[var(--accent)]/50 bg-[var(--accent)]/10 p-5 text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)] mb-1">
            Fim do módulo
          </h2>
          <p className="text-sm text-[var(--muted)] mb-3">
            Você chegou ao fim de {module.title}. Que tal testar o que aprendeu?
          </p>
          <Link
            href={`/curso/quiz/${encodeURIComponent(module.id)}`}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
          >
            <span aria-hidden>❓</span> Testar conhecimento
          </Link>
        </section>
      )}

      {/* navegação anterior / próxima */}
      <nav className="mt-8 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-6">
        {prev ? (
          <Link
            href={`/curso/${encodeURIComponent(prev.id)}`}
            className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 hover:bg-[var(--surface-2)] transition-colors"
          >
            <div className="text-xs text-[var(--muted)]">← Anterior</div>
            <div className="text-sm mt-1 group-hover:text-[var(--accent)]">{prev.title}</div>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/curso/${encodeURIComponent(next.id)}`}
            className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-right hover:bg-[var(--surface-2)] transition-colors"
          >
            <div className="text-xs text-[var(--muted)]">Próxima →</div>
            <div className="text-sm mt-1 group-hover:text-[var(--accent)]">{next.title}</div>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
