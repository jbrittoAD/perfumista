"use client";

import { useEffect, useState } from "react";
import { isDone, toggle } from "@/lib/course-progress";

export default function DoneToggle({ lessonId }: { lessonId: string }) {
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDone(isDone(lessonId));
    setReady(true);
  }, [lessonId]);

  const onClick = () => {
    setDone(toggle(lessonId));
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={done}
      className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
        done
          ? "border-[var(--accent)] bg-[var(--accent)] text-black hover:opacity-90"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-2)]"
      }`}
      style={{ visibility: ready ? "visible" : "hidden" }}
    >
      <span aria-hidden>{done ? "✓" : "○"}</span>
      {done ? "Aula concluída" : "Marcar como concluída"}
    </button>
  );
}
