import courseData from "@/lib/data/course.json";

export type AppLink = { label: string; href: string };
export type Reference = { title: string; url: string };

export type Lesson = {
  id: string;
  title: string;
  duration_min: number;
  body_md: string;
  key_points: string[];
  exercise: string | null;
  app_links: AppLink[];
  references: Reference[];
};

export type QuizQuestion = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

export type CourseModule = {
  id: string;
  title: string;
  level: string;
  summary: string;
  lessons: Lesson[];
  quiz?: QuizQuestion[];
};

export const modules: CourseModule[] = courseData as CourseModule[];

/** Todas as aulas, na ordem do curso (m1l1 → … → m12lN). */
export const allLessons: { lesson: Lesson; module: CourseModule; index: number }[] = modules
  .flatMap((module) => module.lessons.map((lesson) => ({ lesson, module })))
  .map((entry, index) => ({ ...entry, index }));

export const totalLessons = allLessons.length;

export function getModule(id: string): CourseModule | null {
  return modules.find((m) => m.id === id) ?? null;
}

export function findLesson(lessonId: string) {
  const idx = allLessons.findIndex((e) => e.lesson.id === lessonId);
  if (idx === -1) return null;
  const current = allLessons[idx];
  return {
    lesson: current.lesson,
    module: current.module,
    prev: idx > 0 ? allLessons[idx - 1].lesson : null,
    next: idx < allLessons.length - 1 ? allLessons[idx + 1].lesson : null,
    position: idx + 1,
  };
}

/** Cor do badge de nível, tolerante a variações de rótulo nos dados. */
export function levelStyle(level: string): { label: string; className: string } {
  const l = level.toLowerCase();
  if (l.startsWith("inicia") && !l.includes("inter")) {
    return { label: level, className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
  }
  if (l.includes("avan")) {
    return { label: level, className: "bg-rose-500/15 text-rose-300 border-rose-500/30" };
  }
  if (l.includes("inter")) {
    return { label: level, className: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
  }
  // "todos" e quaisquer outros
  return { label: level, className: "bg-sky-500/15 text-sky-300 border-sky-500/30" };
}
