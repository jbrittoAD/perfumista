import { ALVOS, resolverAlvo } from "../lib/alvos";
import { perGram } from "../lib/deck";
for (const a of ALVOS) {
  console.log(`=== ${a.nome} — ${a.nota} ===`);
  const r = resolverAlvo(a);
  let custo = 0;
  for (const { papel, card } of r) {
    if (card) custo += (card.price.perG ?? 0) * 10;
    console.log(`  ${String(papel.pct).padStart(3)}%  ${papel.papel.padEnd(22)} ${card ? card.name.slice(0, 34).padEnd(34) : "— NÃO TEM —".padEnd(34)} ${card ? perGram(card.price.perG) : ""}`);
  }
  const falta = r.filter((x) => !x.card).length;
  console.log(`\n  ${r.length - falta}/${r.length} papéis cobertos · ${custo.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} com 10g de cada`);
}
