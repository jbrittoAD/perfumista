import { buildPalette, gramasParaLote } from "/Users/joaocarlosbrittofilho/Documents/Pessoais/Perfumista/web/lib/palette.ts";
import { ALVOS, resolverAlvo, dosesDosAlvos } from "/Users/joaocarlosbrittofilho/Documents/Pessoais/Perfumista/web/lib/alvos.ts";
import { GOSTOS_JOAO, PEDIDOS_JOAO } from "/Users/joaocarlosbrittofilho/Documents/Pessoais/Perfumista/web/lib/gostos.ts";
import { CARDS, compraPara, familyMeta, type Ingredient } from "/Users/joaocarlosbrittofilho/Documents/Pessoais/Perfumista/web/lib/deck.ts";
import { writeFileSync } from "node:fs";
const nm=(s:string)=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const brl=(v:number)=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

const DELE = ["bergamota","hedione","linalol","ambroxan","ambrox","calone","galaxolide",
  "tonalide","vanilina","iso e super","vertofix","javanol","veramoss","ambrettolide",
  "acetato de linalila","dihidromircenol","cedramber","exaltolide","habanolide",
  "salicilato de benzila","hexil cinamico","alcool feniletilico","etileno brassilato",
  "patchone","cumarina","orivone","orris","isoraldeina","n metil ionona","dihidro beta ionona"];
const Q = { aldehydic:15, woody:20, musk:14, citrus:14, amber:10, herbal:9, leather:5, floral:8, green:5, balsamic:4, aquatic:4, spicy:3, gourmand:2, fruity:2 } as any;
const alvos = new Set(ALVOS.flatMap(a => resolverAlvo(a,10).filter(r=>r.card).map(r=>r.card!.id)));
const ped = PEDIDOS_JOAO.map(p => CARDS.filter(c=>!c.banned&&(p.exato?nm(c.name)===p.termo:nm(c.name).includes(p.termo))).sort((a,b)=>(compraPara(a,5)?.price??9e9)-(compraPara(b,5)?.price??9e9))[0]).filter(Boolean);
const doses = dosesDosAlvos();
const p = buildPalette({ quotas: Q, maxBottles: 115, mustInclude: [...new Set([...alvos,...ped.map(c=>c.id)])],
  lote:{ml:500,pct:20}, dosesAlvo: doses, gostos: GOSTOS_JOAO, includeWorkhorses: true, includeSolvents: true, maxPerBottle: 60 }, 10);

const SOL_30 = 24, SOL_100 = 80, RESERVA = 500;
const tier = (c: Ingredient) => { const d = Math.max(c.dose.mid ?? 2, doses.get(c.id) ?? 0); return d >= 0.5 ? 10 : d >= 0.05 ? 1 : 0.1; };
const pesado = (c: Ingredient) => DELE.some(k => nm(c.name).includes(k));
const porMl = new Map<number, number>();
for (const a of ALVOS) { const rs = resolverAlvo(a,10).filter(r=>r.card);
  const soma = rs.reduce((s,r)=>s+r.papel.pct,0);
  for (const r of rs) { const g = 0.20*0.95 * (r.papel.pct/soma);
    porMl.set(r.card!.id, Math.max(porMl.get(r.card!.id) ?? 0, g)); } }

type Item = { c: Ingredient; A: boolean; t: number; dil: number; precisa: number; o: any };
const itens: Item[] = [];
for (const c of p.picks.filter(x=>x.kind!=="solvent")) {
  const A = pesado(c), sol = A ? SOL_100 : SOL_30, t = tier(c);
  const dil = sol*t/100, precisa = dil + (A ? (porMl.get(c.id) ?? 0)*RESERVA : 0);
  const o = compraPara(c, precisa);
  if (o) itens.push({ c, A, t, dil, precisa, o });
}
const total = itens.reduce((s,i)=>s+i.o.price,0);
const alc = itens.reduce((s,i)=>s+(i.A?SOL_100:SOL_30)-i.dil,0);
const litros = alc/1000/0.79;
const LOJA: Record<string,string> = { flavorist:"Flavorist", perfumistico:"Perfumístico",
  euperfumista:"Eu Perfumista", perfumoteca:"Perfumoteca", neuroaroma:"Neuroaroma" };

const L: string[] = [];
L.push("# Compra da paleta — 110 frascos", "");
L.push(`_Gerado em ${new Date().toISOString().slice(0,10)}. Preços da última raspagem dos 5 fornecedores._`, "");
L.push("## O que é isto", "");
L.push("Paleta de **110 matérias-primas** para (a) cheirar e aprender e (b) fazer amostras");
L.push("de 5 a 10 ml. Cobre por inteiro as três fórmulas-alvo: **tipo Creed Himalaya**,");
L.push("**DNA Lattafa Khalid sem defumado** e **tipo LV Imagination**.", "");
L.push("| | |", "|---|---|");
L.push(`| matéria-prima | **${brl(total)}** |`);
L.push(`| álcool de cereais | ${Math.ceil(litros/5)*5} L — ${brl(Math.ceil(litros/5)*85.99)} |`);
L.push(`| **TOTAL** | **${brl(total + Math.ceil(litros/5)*85.99)}** |`);
L.push(`| frascos | ${itens.filter(i=>i.A).length} de 100 ml + ${itens.filter(i=>!i.A).length} de 30 ml |`, "");
L.push("Inclui **reserva para 500 ml de perfume** dos materiais de uso pesado — custa só");
L.push("R$ 138 a mais que comprar o mínimo, e evita recomprar a cada ensaio.", "");
L.push("---", "", "## Por fornecedor", "");
L.push("São **5 pedidos, 5 fretes**. Perfumoteca e Neuroaroma somam pouco — se o frete não");
L.push("compensar, vale checar se a Flavorist ou o Perfumístico têm o mesmo item.", "");
const porLoja = new Map<string, Item[]>();
for (const i of itens) { const k = i.o.s ?? "?"; porLoja.set(k, [...(porLoja.get(k) ?? []), i]); }
for (const [loja, is] of [...porLoja].sort((a,b)=>b[1].reduce((s,i)=>s+i.o.price,0)-a[1].reduce((s,i)=>s+i.o.price,0))) {
  const sub = is.reduce((s,i)=>s+i.o.price,0);
  L.push(`### ${LOJA[loja] ?? loja} — ${is.length} itens, ${brl(sub)}`, "");
  L.push("| ✓ | material | embalagem | preço | dil. | link |", "|---|---|---|---|---|---|");
  for (const i of is.sort((a,b)=>a.c.name.localeCompare(b.c.name)))
    L.push(`| ☐ | ${i.A?"**":""}${i.c.name}${i.A?"**":""} | ${i.o.size}${i.o.unit} | ${brl(i.o.price)} | ${i.t}% | ${i.o.url ? `[abrir](${i.o.url})` : "—"} |`);
  L.push("");
}
L.push("Em **negrito** os 100 ml (uso pesado, com reserva). O resto vai em 30 ml.", "");
L.push("", "---", "", "## Como diluir", "");
L.push("Método do PerfumoLogos (https://youtu.be/_tAuhLKIltE). **Diluir em ÁLCOOL,");
L.push("não em DPG** — o solvente que vem junto vira o álcool do perfume depois.", "");
L.push("| frasco | solução que cabe | a 10% | a 1% | a 0,1% | BHT |");
L.push("|---|---|---|---|---|---|");
L.push("| 30 ml | 24 g | 2,4 g | 240 mg | 24 mg | 24 mg |");
L.push("| 100 ml | 80 g | 8,0 g | 800 mg | 80 mg | 80 mg |", "");
L.push("1. **Rotular antes** — nome e porcentagem.");
L.push("2. Tarar o frasco, com anteparo contra vento.");
L.push("3. **BHT primeiro** (1 mg por grama de solução = 0,1%). Vai em TODA diluição.");
L.push("4. A matéria-prima.");
L.push("5. Álcool até 24 g (ou 80 g).", "");
L.push("Desvio de até 10% não estraga nada — compense no álcool. E **uma pipeta por");
L.push("material**: a que tocou indol contamina o próximo frasco para sempre.", "");
L.push("BHT total necessário: **" + (itens.reduce((s,i)=>s+(i.A?SOL_100:SOL_30),0)/1000).toFixed(1) + " g**. Sai do menor pote (500 g).", "");
L.push("", "---", "", "## As três fórmulas, para amostra de 10 ml", "");
L.push("10 ml a 20% = **1,9 g de concentrado**. Material que ficar abaixo de 0,05 g se");
L.push("pesa da solução (peso ÷ diluição); acima disso, puro.", "");
for (const a of ALVOS) {
  const rs = resolverAlvo(a,10).filter(r=>r.card);
  const soma = rs.reduce((s,r)=>s+r.papel.pct,0);
  L.push(`### ${a.nome}`, "", `_${a.nota}_`, "");
  L.push("| material | % | pesar | como |", "|---|---|---|---|");
  for (const r of rs.sort((x,y)=>y.papel.pct-x.papel.pct)) {
    const g = 1.9 * (r.papel.pct/soma);
    const it = itens.find(i=>i.c.id===r.card!.id);
    const t = it?.t ?? 10;
    const como = g >= 0.05 ? "puro" : `sol. ${t}% → ${(g*100/t).toFixed(2)} g`;
    L.push(`| ${r.card!.name} | ${(r.papel.pct/soma*100).toFixed(2)}% | ${g.toFixed(3)} g | ${como} |`);
  }
  L.push("", `Completar com álcool até 10 ml. Fonte: ${a.fonte.slice(0,180)}...`, "");
}
L.push("---", "", "## Lembretes", "");
L.push("- **Maceração**: seis semanas no armário fechado. Não avalie antes. Geladeira não faz efeito.");
L.push("- **DPG não fixa** — ele testou, deu \"virtualmente a mesma fixação\". Serve de diluente.");
L.push("- **Guardar tudo fechado**, de preferência em caixa de isopor: a diluição evapora álcool,");
L.push("  contamina o ambiente e fadiga o nariz. Nariz fadigado formula errado.");
L.push("- Base completa do canal em `knowledge/perfumologos/`, skills em `.claude/skills/`.", "");
writeFileSync("/Users/joaocarlosbrittofilho/Documents/Pessoais/Perfumista/COMPRA-110.md", L.join("\n"));
console.log(`${itens.length} itens · ${brl(total)} · ${porLoja.size} fornecedores`);
for (const [k,v] of porLoja) console.log(`   ${(LOJA[k]??k).padEnd(14)} ${String(v.length).padStart(3)} itens  ${brl(v.reduce((s,i)=>s+i.o.price,0))}`);
