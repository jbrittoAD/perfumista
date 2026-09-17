"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearSync,
  enableSync,
  getLastSync,
  getSyncCode,
  normalizeCode,
  sync,
} from "@/lib/sync";

type Status = "idle" | "working" | "ok" | "error";

function formatTime(ts: number | null): string {
  if (!ts) return "ainda não sincronizado";
  try {
    return new Date(ts).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/**
 * Seção "Sincronizar entre aparelhos".
 * OFFLINE-FIRST: a sincronização é opcional. Este componente só espelha o estado
 * local para a nuvem e vice-versa; nunca bloqueia o resto do app.
 */
export default function SyncPanel() {
  const [mounted, setMounted] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");
  const [showEnter, setShowEnter] = useState(false);
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(() => {
    setCode(getSyncCode());
    setLastSync(getLastSync());
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh();
  }, [refresh]);

  const online = () => typeof navigator === "undefined" || navigator.onLine;

  const handleActivate = useCallback(async () => {
    setStatus("working");
    setMessage("Ativando…");
    const c = await enableSync();
    refresh();
    if (!online()) {
      setStatus("error");
      setMessage("Ativado offline — vai sincronizar quando houver internet.");
    } else {
      setStatus("ok");
      setMessage("Sincronização ativada.");
    }
    setCode(c);
  }, [refresh]);

  const handleJoin = useCallback(async () => {
    const normalized = normalizeCode(input);
    if (normalized.replace(/-/g, "").length < 8) {
      setStatus("error");
      setMessage("Código muito curto. Confira e tente de novo.");
      return;
    }
    setStatus("working");
    setMessage("Buscando seus dados…");
    if (!online()) {
      setStatus("error");
      setMessage("Sem internet — conecte-se para entrar com um código.");
      return;
    }
    await enableSync(normalized);
    refresh();
    setShowEnter(false);
    setInput("");
    setStatus("ok");
    setMessage("Conectado! Seus dados foram mesclados.");
  }, [input, refresh]);

  const handleSyncNow = useCallback(async () => {
    setStatus("working");
    setMessage("Sincronizando…");
    if (!online()) {
      setStatus("error");
      setMessage("Você está offline. Suas mudanças ficam salvas neste aparelho.");
      return;
    }
    const ok = await sync();
    refresh();
    if (ok) {
      setStatus("ok");
      setMessage("Tudo sincronizado.");
    } else {
      setStatus("error");
      setMessage("Não deu para sincronizar agora. Vai tentar de novo depois.");
    }
  }, [refresh]);

  const handleDisable = useCallback(() => {
    clearSync();
    refresh();
    setStatus("idle");
    setMessage("Sincronização desativada neste aparelho. Seus dados locais continuam aqui.");
  }, [refresh]);

  const handleCopy = useCallback(async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard indisponível: ignora, o código está visível */
    }
  }, [code]);

  // Placeholder estável para o pré-render / antes de montar (evita hydration mismatch).
  if (!mounted) {
    return (
      <section className="ui-card p-5">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-lg">
            🔗
          </span>
          <h2 className="ui-section-title">Sincronizar entre aparelhos</h2>
        </div>
        <div className="mt-4 h-10 animate-pulse rounded-xl bg-[var(--surface-2)]/40" />
      </section>
    );
  }

  const statusColor =
    status === "ok"
      ? "text-emerald-300"
      : status === "error"
        ? "text-amber-300"
        : "text-[var(--muted)]";

  return (
    <section className="ui-card p-5">
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-lg">
          🔗
        </span>
        <h2 className="ui-section-title">Sincronizar entre aparelhos</h2>
      </div>

      {!code ? (
        /* ---------- NÃO ATIVADO ---------- */
        <div className="mt-3 space-y-4">
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            Seu progresso (aulas, quizzes, revisões e fórmulas) fica salvo neste aparelho.
            Ative a sincronização para acessá-lo em outro celular ou computador.
          </p>

          <button type="button" onClick={handleActivate} className="ui-btn ui-btn-primary w-full sm:w-auto">
            Ativar sincronização
          </button>

          <div className="border-t border-[var(--border)] pt-4">
            {!showEnter ? (
              <button
                type="button"
                onClick={() => setShowEnter(true)}
                className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
              >
                Já tenho um código de outro aparelho →
              </button>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm text-[var(--muted)]">
                  Cole o código do outro aparelho
                </label>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="ABCD-EFGH-JKLM-NPQR"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  className="ui-input font-mono tracking-widest"
                />
                <div className="flex flex-wrap gap-2.5">
                  <button type="button" onClick={handleJoin} className="ui-btn ui-btn-primary">
                    Conectar e puxar dados
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEnter(false);
                      setInput("");
                    }}
                    className="ui-btn ui-btn-secondary"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {message && <p className={`text-sm ${statusColor}`}>{message}</p>}
        </div>
      ) : (
        /* ---------- ATIVADO ---------- */
        <div className="mt-3 space-y-4">
          <div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/[0.06] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Seu código</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <span className="select-all font-mono text-xl font-semibold tracking-widest text-[var(--accent)] sm:text-2xl">
                {code}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="ui-chip ui-chip-off"
                aria-label="Copiar código"
              >
                {copied ? "Copiado ✓" : "Copiar"}
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
              Digite este código no outro aparelho (em “Já tenho um código”) para juntar o
              progresso dos dois.
            </p>
          </div>

          <p className="text-sm text-[var(--muted)]">
            Última sincronização:{" "}
            <span className="text-[var(--foreground)]">{formatTime(lastSync)}</span>
          </p>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={status === "working"}
              className="ui-btn ui-btn-primary disabled:opacity-60"
            >
              {status === "working" ? "Sincronizando…" : "Sincronizar agora"}
            </button>
            <button type="button" onClick={handleDisable} className="ui-btn ui-btn-secondary">
              Desativar
            </button>
          </div>

          {message && <p className={`text-sm ${statusColor}`}>{message}</p>}
        </div>
      )}
    </section>
  );
}
