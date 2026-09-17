import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getModule, levelStyle, modules } from "@/lib/course";
import QuizRunner from "./quiz-runner";

type Params = { moduleId: string };

export function generateStaticParams(): Params[] {
  return modules.filter((m) => (m.quiz?.length ?? 0) > 0).map((m) => ({ moduleId: m.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { moduleId } = await params;
  const module = getModule(moduleId);
  if (!module) return { title: "Quiz não encontrado — Perfumista" };
  return { title: `Quiz: ${module.title} — Curso Perfumista` };
}

export default async function QuizPage({ params }: { params: Promise<Params> }) {
  const { moduleId } = await params;
  const module = getModule(moduleId);
  if (!module || !module.quiz || module.quiz.length === 0) notFound();

  const badge = levelStyle(module.level);

  return (
    <article className="max-w-3xl mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-2">
          <Link href="/curso" className="hover:text-[var(--foreground)]">
            Curso
          </Link>
          <span aria-hidden>/</span>
          <span>{module.title}</span>
          <span aria-hidden>/</span>
          <span>Quiz</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-light tracking-tight leading-tight">
          Testar conhecimento
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">{module.title}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
            {badge.label}
          </span>
          <span>·</span>
          <span>{module.quiz.length} perguntas</span>
        </div>
      </header>

      <QuizRunner moduleId={module.id} questions={module.quiz} />
    </article>
  );
}
