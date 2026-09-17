import type { Metadata } from "next";
import { modules, totalLessons } from "@/lib/course";
import ProgressBar from "./progress-bar";
import ModuleList from "./module-list";

export const metadata: Metadata = {
  title: "Curso — Perfumista",
  description: "Curso de perfumaria em 12 módulos, do básico ao avançado.",
};

export default function CursoPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Curso de Perfumaria</h1>
        <p className="text-[var(--muted)] text-sm mt-1">
          {modules.length} módulos e {totalLessons} aulas, do primeiro cheiro à composição avançada.
          Cada aula traz teoria, pontos-chave, exercícios e atalhos para as ferramentas do app.
        </p>
      </div>

      <div className="mb-6">
        <ProgressBar total={totalLessons} />
      </div>

      <ModuleList modules={modules} />
    </div>
  );
}
