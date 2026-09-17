"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAllMaterials, type MaterialCard } from "@/lib/catalog";
import { capMeta, type CapMeta } from "@/lib/cap-colors";
import * as buylist from "@/lib/buylist";
import * as compareset from "@/lib/compareset";
import { DESCRIPTOR_TAGS, materialHasAnyTag } from "@/lib/descriptor-tags";

/**
 * /explorar — hub por FAMÍLIA (family_canon, mais preciso que a cor de tampa)
 * cruzado com SITE/FORNECEDOR, com os "quase-duplicados" (mesma família + nota)
 * agrupados lado a lado pra facilitar "por que X e não Y". Traz uma faixa fixa
 * com o perfil aldeídico/sabonete no topo, e um filtro "Quero" (inclui, OR)
 * /"Não quero" (exclui) por descritor de cheiro (doce, medicinal, cremoso…)
 * pra facilitar a lista de compras. Some no catálogo já existente (`/`), que é
 * só uma lista com filtros soltos — aqui a família é o eixo principal de
 * navegação.
 *
 * 100% client-side (mesmo catálogo estático de `/fragrancias` e `/`).
 */

const NOTE_LABEL: Record<string, string> = { topo: "Topo", coracao: "Coração", base: "Base" };
const SOURCE_LABEL: Record<string, string> = {
  flavorist: "Flavorist",
  perfumistico: "Perfumístico",
  perfumoteca: "Perfumoteca",
  euperfumista: "Eu Perfumista",
};
const SOURCES = ["flavorist", "perfumistico", "perfumoteca", "euperfumista"] as const;

// family_canon -> { rótulo PT-BR, slug de cor de tampa } — mesma tabela de
// FAM2COLOR usada em materials/scripts/build-web-data.py pra gerar cap_color,
// então a bolinha bate com a cor física do frasco.
const FAMILY_META: Record<string, { label: string; cap: string }> = {
  aldehydic: { label: "Aldeídica", cap: "verde-agua" },
  musk: { label: "Almiscarada", cap: "branco" },
  citrus: { label: "Cítrica", cap: "amarelo" },
  floral: { label: "Floral", cap: "pink" },
  green: { label: "Verde/Herbácea", cap: "verde-folha" },
  herbal: { label: "Aromática", cap: "azul" },
  spicy: { label: "Especiada", cap: "azul" },
  woody: { label: "Amadeirada", cap: "verde-escuro" },
  aquatic: { label: "Aquática", cap: "verde-agua" },
  gourmand: { label: "Gourmand", cap: "laranja" },
  fruity: { label: "Frutada", cap: "laranja" },
  amber: { label: "Âmbar/Oriental", cap: "preto" },
  balsamic: { label: "Balsâmica", cap: "preto" },
  leather: { label: "Couro", cap: "preto" },
  animalic: { label: "Animálica", cap: "preto" },
};

/** Palavras-chave do perfil "aldeídico/sabonete" (ESTADO.md — domínio conhecido). */
const PROFILE_KEYWORDS = [
  "aldeíd",
  "aldeid",
  "aldehyd",
  "sabonete",
  "sabão",
  "sabao",
  "galaxolide",
  "habanolide",
  "hidroxicitronelol",
  "florhydral",
  "musk",
  "almíscar",
  "almiscar",
];

function money(v: number | null) {
  return v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function matchesProfile(m: MaterialCard): boolean {
  if (m.family_canon === "aldehydic" || m.family_canon === "musk") return true;
  const hay = `${m.name_canonical} ${m.name_pt ?? ""} ${m.odor_description ?? ""} ${m.odor_family ?? ""}`.toLowerCase();
  return PROFILE_KEYWORDS.some((kw) => hay.includes(kw));
}

// Carregado uma vez (módulo puro), igual /fragrancias.
const ALL = getAllMaterials();
const PROFILE_PICKS = ALL.filter(matchesProfile);

const BY_FAMILY: Record<string, MaterialCard[]> = {};
for (const m of ALL) {
  const fam = m.family_canon ?? "outros";
  (BY_FAMILY[fam] ??= []).push(m);
}
// Famílias por contagem desc, mas com "aldehydic" sempre primeiro (o gosto do João).
const FAMILY_ORDER = Object.keys(BY_FAMILY).sort((a, b) => {
  if (a === "aldehydic") return -1;
  if (b === "aldehydic") return 1;
  return (BY_FAMILY[b]?.length ?? 0) - (BY_FAMILY[a]?.length ?? 0);
});

function CapDot({ meta, size = 10 }: { meta: CapMeta | null; size?: number }) {
  if (!meta) return null;
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full ring-1 ring-black/30"
      style={{ width: size, height: size, backgroundColor: meta.hex }}
    />
  );
}

export default function ExplorarPage() {
  const [family, setFamily] = useState<string>(FAMILY_ORDER[0] ?? "aldehydic");
  const [source, setSource] = useState<string>("");
  const [q, setQ] = useState("");
  const [marked, setMarked] = useState<number[]>([]);
  const [compared, setCompared] = useState<number[]>([]);
  const [wanted, setWanted] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);

  // "Quero" e "Não quero" são mutuamente exclusivos por tag — marcar numa
  // remove da outra.
  const toggleWanted = useCallback((id: string) => {
    setWanted((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setExcluded((prev) => prev.filter((x) => x !== id));
  }, []);
  const toggleExcluded = useCallback((id: string) => {
    setExcluded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setWanted((prev) => prev.filter((x) => x !== id));
  }, []);

  useEffect(() => {
    setMarked(buylist.list());
    setCompared(compareset.list());
  }, []);

  const markedSet = useMemo(() => new Set(marked), [marked]);
  const comparedSet = useMemo(() => new Set(compared), [compared]);

  const toggleBuy = useCallback((id: number) => {
    buylist.toggle(id);
    setMarked(buylist.list());
  }, []);

  const toggleCompare = useCallback((id: number) => {
    compareset.toggle(id);
    setCompared(compareset.list());
  }, []);

  // Materiais da família, filtrados por site + busca — ANTES do filtro de
  // descritor (serve pra calcular quantos bateriam com cada tag "quero").
  const preTag = useMemo(() => {
    let items = BY_FAMILY[family] ?? [];
    if (source) {
      items = items.filter((m) => (m.sources ?? "").split(",").map((s) => s.trim()).includes(source));
    }
    const needle = q.trim().toLowerCase();
    if (needle) {
      items = items.filter(
        (m) =>
          m.name_canonical.toLowerCase().includes(needle) ||
          (m.name_pt?.toLowerCase().includes(needle) ?? false) ||
          (m.odor_description?.toLowerCase().includes(needle) ?? false),
      );
    }
    return items;
  }, [family, source, q]);

  // Por fim, aplica "quero" (precisa bater com pelo menos uma tag marcada,
  // se houver alguma) e "não quero" (descarta quem bater com qualquer excluída).
  const visible = useMemo(() => {
    let items = preTag;
    if (wanted.length > 0) items = items.filter((m) => materialHasAnyTag(m, wanted));
    if (excluded.length > 0) items = items.filter((m) => !materialHasAnyTag(m, excluded));
    return items;
  }, [preTag, wanted, excluded]);

  // Contagem por tag dentro do que já passou por família+site+busca (antes do
  // próprio filtro de tag) — mostra quantos materiais cada tag agregaria/retiraria.
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tag of DESCRIPTOR_TAGS) {
      counts.set(tag.id, preTag.filter((m) => materialHasAnyTag(m, [tag.id])).length);
    }
    return counts;
  }, [preTag]);

  // Agrupado por nota (topo/coração/base/sem nota) — os "quase-duplicados" do
  // findSimilar (mesma família + mesma nota) caem juntos, lado a lado.
  const byNote = useMemo(() => {
    const groups: Record<string, MaterialCard[]> = {};
    for (const m of visible) (groups[m.note_type ?? "sem_nota"] ??= []).push(m);
    const order = ["topo", "coracao", "base", "sem_nota"];
    return order.filter((k) => groups[k]?.length).map((k) => ({ key: k, items: groups[k] }));
  }, [visible]);

  // Contagem por fornecedor dentro da família selecionada (pra ver o cruzamento família×site).
  const sourceCounts = useMemo(() => {
    const items = BY_FAMILY[family] ?? [];
    return SOURCES.map((s) => ({
      slug: s,
      n: items.filter((m) => (m.sources ?? "").split(",").map((x) => x.trim()).includes(s)).length,
    })).filter((s) => s.n > 0);
  }, [family]);

  return (
    <div>
      <div className="mb-5">
        <p className="ui-eyebrow">Explorar</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Por família e por fornecedor
        </h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          Navegue pelas famílias olfativas (mais precisas que a cor de tampa) e veja quem vende cada
          uma. Materiais da mesma família e nota ficam agrupados — bom pra comparar "os dois de
          limão". Use "Quero"/"Não quero" abaixo pra filtrar por descritor (doce, medicinal,
          cremoso…) e facilitar sua lista de compras. Quer ver o diff completo?{" "}
          <Link href="/comparar" className="text-[var(--accent)] underline">
            Abrir Comparar
          </Link>
          {compared.length > 0 && ` (${compared.length} selecionado${compared.length === 1 ? "" : "s"})`}.
        </p>
      </div>

      {/* Faixa fixa: perfil aldeídico/sabonete */}
      {PROFILE_PICKS.length > 0 && (
        <div className="ui-card mb-5 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              🧼 Seu perfil: Aldeídico &amp; Sabonete
            </h2>
            <span className="text-xs text-[var(--muted)]">{PROFILE_PICKS.length} materiais</span>
          </div>
          <div className="-mx-4 overflow-x-auto px-4">
            <div className="flex gap-3">
              {PROFILE_PICKS.slice(0, 20).map((m) => (
                <Link
                  key={m.id}
                  href={`/material/${m.id}`}
                  className="ui-card-link w-48 shrink-0 p-3"
                >
                  <div className="flex items-center gap-1.5">
                    <CapDot meta={capMeta(m.cap_color)} />
                    <span className="truncate text-xs font-semibold">{m.name_canonical}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-[var(--muted)]">
                    {m.odor_description ?? m.key_uses ?? "—"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--accent)]">{money(m.min_price)}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs de família */}
      <div className="mb-3 -mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          {FAMILY_ORDER.map((fam) => {
            const meta = FAMILY_META[fam];
            const active = fam === family;
            const total = BY_FAMILY[fam]?.length ?? 0;
            return (
              <button
                key={fam}
                type="button"
                onClick={() => setFamily(fam)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--foreground)]"
                    : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)]"
                }`}
                aria-pressed={active}
              >
                <CapDot meta={meta ? capMeta(meta.cap) : null} />
                <span>{meta?.label ?? fam}</span>
                <span className="text-[11px] text-[var(--muted)]">{total}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cruzamento por fornecedor, dentro da família selecionada */}
      <div className="ui-chip-row mb-3">
        <button
          type="button"
          onClick={() => setSource("")}
          className={`ui-chip ${!source ? "ui-chip-on" : "ui-chip-off"}`}
        >
          Todos os fornecedores
        </button>
        {sourceCounts.map((s) => (
          <button
            key={s.slug}
            type="button"
            onClick={() => setSource((prev) => (prev === s.slug ? "" : s.slug))}
            className={`ui-chip ${source === s.slug ? "ui-chip-on" : "ui-chip-off"}`}
          >
            {SOURCE_LABEL[s.slug]} ({s.n})
          </button>
        ))}
      </div>

      {/* Busca dentro da família */}
      <div className="mb-5">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar nesta família (nome, odor)…"
          className="ui-input"
        />
      </div>

      {/* Filtro por descritor: "quero" inclui (OR), "não quero" exclui */}
      <div className="mb-5 space-y-2.5">
        <div>
          <p className="mb-1.5 text-[11px] uppercase tracking-wide text-[var(--muted)]">
            Quero (mostra só quem tiver pelo menos uma destas)
          </p>
          <div className="ui-chip-row">
            {DESCRIPTOR_TAGS.filter((t) => (tagCounts.get(t.id) ?? 0) > 0 || wanted.includes(t.id)).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleWanted(t.id)}
                className={`ui-chip ${
                  wanted.includes(t.id)
                    ? "border-emerald-400 bg-emerald-400/15 text-emerald-300"
                    : "ui-chip-off"
                }`}
              >
                {t.label} ({tagCounts.get(t.id) ?? 0})
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] uppercase tracking-wide text-[var(--muted)]">
            Não quero (esconde quem tiver qualquer uma destas)
          </p>
          <div className="ui-chip-row">
            {DESCRIPTOR_TAGS.filter((t) => (tagCounts.get(t.id) ?? 0) > 0 || excluded.includes(t.id)).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleExcluded(t.id)}
                className={`ui-chip ${
                  excluded.includes(t.id) ? "border-red-400 bg-red-400/15 text-red-300" : "ui-chip-off"
                }`}
              >
                {t.label} ({tagCounts.get(t.id) ?? 0})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Materiais agrupados por nota (aproxima os "quase-duplicados") */}
      {byNote.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Nenhum material nesta combinação de filtros.</p>
      ) : (
        byNote.map(({ key, items }) => (
          <div key={key} className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {NOTE_LABEL[key] ?? "Sem nota definida"} · {items.length}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((m) => {
                const cap = capMeta(m.cap_color);
                const marked = markedSet.has(m.id);
                const isCompared = comparedSet.has(m.id);
                return (
                  <div key={m.id} className="ui-card flex flex-col p-4">
                    <Link href={`/material/${m.id}`} className="block">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="flex items-center gap-1.5 truncate text-sm font-semibold">
                            <CapDot meta={cap} />
                            {m.name_canonical}
                          </h3>
                          {m.name_pt && m.name_pt !== m.name_canonical && (
                            <p className="truncate text-xs text-[var(--muted)]">{m.name_pt}</p>
                          )}
                        </div>
                        {m.odor_strength && (
                          <span className="ui-badge shrink-0 border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
                            {m.odor_strength}
                          </span>
                        )}
                      </div>
                      {m.odor_description && (
                        <p className="mt-2 line-clamp-2 text-xs text-[var(--foreground)]">
                          {m.odor_description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-2 text-[11px] text-[var(--muted)]">
                        <span className="font-semibold text-[var(--accent)]">{money(m.min_price)}</span>
                        <span className="truncate">{m.sources ?? "—"}</span>
                      </div>
                    </Link>
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                      <button
                        type="button"
                        onClick={() => toggleBuy(m.id)}
                        aria-pressed={marked}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          marked
                            ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]"
                            : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/50 hover:text-[var(--foreground)]"
                        }`}
                      >
                        {marked ? "✓ na lista" : "➕ comprar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCompare(m.id)}
                        aria-pressed={isCompared}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          isCompared
                            ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]"
                            : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/50 hover:text-[var(--foreground)]"
                        }`}
                      >
                        {isCompared ? "✓ comparando" : "⚖️ comparar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
