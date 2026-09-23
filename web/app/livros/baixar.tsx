/**
 * baixar.tsx — "guardar tudo no aparelho".
 *
 * O texto dos livros já vive no bundle e é pré-cacheado pelo service worker:
 * abrir o app uma vez com rede basta. O PDF é grande (4,7 MB) e ficaria pesado
 * no precache de instalação, então ele entra sob demanda — este botão busca e
 * guarda no Cache Storage, e o estado fica no localStorage para a tela lembrar.
 *
 * Por que Cache Storage e não só o download do navegador: no iPad, arquivo
 * baixado vai para o app Arquivos e sai do app; guardando no cache, o PDF abre
 * de dentro da PWA mesmo em modo avião.
 */

"use client";

import { useEffect, useState } from "react";
import TAM from "@/lib/data/tamanhos.json";
import { LIVROS } from "@/lib/livros";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const PDF = `${BASE}/Do-quimico-aromatico-ao-produto.pdf`;
const CACHE = "perfumista-downloads";
const LS = "perfumista:pdf-guardado";

type Estado = "checando" | "ausente" | "baixando" | "guardado" | "erro";

export default function Baixar() {
  const [estado, setEstado] = useState<Estado>("checando");

  useEffect(() => {
    (async () => {
      try {
        const c = await caches.open(CACHE);
        setEstado((await c.match(PDF)) ? "guardado" : "ausente");
      } catch {
        // sem Cache Storage (aba privada, navegador antigo): o download simples ainda funciona
        setEstado(localStorage.getItem(LS) ? "guardado" : "ausente");
      }
    })();
  }, []);

  async function guardar() {
    setEstado("baixando");
    try {
      const c = await caches.open(CACHE);
      await c.add(PDF);
      localStorage.setItem(LS, "1");
      setEstado("guardado");
    } catch {
      setEstado("erro");
    }
  }

  return (
    <div className="mb-5 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-sm font-semibold">Levar para o modo avião</p>

      <ul className="mt-3 space-y-2 text-sm">
        <li className="flex items-start gap-2">
          <Check ok />
          <span className="text-[var(--fg-dim)]">
            <strong className="text-[var(--fg)]">Os {LIVROS.length} livros em texto</strong> — já ficam no aparelho
            assim que você abre o app com internet. Nada a fazer.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <Check ok={estado === "guardado"} />
          <span className="text-[var(--fg-dim)]">
            <strong className="text-[var(--fg)]">O PDF, {TAM.pdfPaginas} páginas</strong> — {TAM.pdfMB} MB, com as figuras.
            {estado === "guardado" && " Guardado."}
          </span>
        </li>
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        {estado !== "guardado" && (
          <button
            onClick={guardar}
            disabled={estado === "baixando"}
            className="rounded-[var(--r-sm)] px-3 py-2 text-xs font-bold disabled:opacity-60"
            style={{ background: "var(--fam)", color: "#000" }}
          >
            {estado === "baixando" ? "Guardando…" : "Guardar o PDF no aparelho"}
          </button>
        )}
        <a
          href={PDF}
          download
          className="rounded-[var(--r-sm)] border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--fg-dim)]"
        >
          Baixar o arquivo
        </a>
      </div>

      {estado === "erro" && (
        <p className="mt-2 text-xs" style={{ color: "var(--pass)" }}>
          Não deu para guardar no app — use “Baixar o arquivo”.
        </p>
      )}
      <p className="mt-2 text-[11px] text-[var(--muted)]">
        O audiolivro tem download próprio, capítulo a capítulo, na tela de ouvir — são {TAM.audioMB} MB
        nos {TAM.capitulos} capítulos.
      </p>
    </div>
  );
}

function Check({ ok }: { ok?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke={ok ? "var(--like)" : "var(--muted)"} strokeWidth="1.8"
        fill={ok ? "var(--like)" : "none"} fillOpacity={ok ? 0.18 : 0} />
      {ok && <path d="M8 12.4l2.6 2.6L16 9.6" stroke="var(--like)" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}
