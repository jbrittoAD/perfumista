"use client";

import { useEffect, useState } from "react";
import { countDone } from "@/lib/course-progress";

export default function ProgressBar({ total }: { total: number }) {
  const [done, setDone] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => setDone(countDone());
    sync();
    // reflete mudanças feitas em outra aba / na página de aula
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const count = done ?? 0;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-[var(--muted)]">
          <span className="text-[var(--foreground)] font-medium">{count}</span> de {total} aulas
          concluídas
        </span>
        <span className="text-sm text-[var(--accent)] font-medium">{pct}%</span>
      </div>
      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
