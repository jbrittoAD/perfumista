# Perfumista

App assistente de perfumaria (uso pessoal). Trabalha com **químicos aromáticos, óleos essenciais e solventes**, com preços de fornecedores brasileiros e dados técnicos, em dois modos:

- **Modo Direto** — monto uma fórmula (material + gramas + diluição) → prevê pirâmide (topo/coração/base), acordes, projeção, longevidade, timeline, avisos e **custo do lote**.
- **Modo Reverso** — escolho notas/famílias + intensidade → sugere ingredientes (com preço) para chegar lá.

> ⚠️ O motor de previsão é **heurístico e explicável** (não é lab): baseado em volatilidade, força odorífera e lei de Stevens (intensidade compressiva). É um **auxílio/estimativa**, não medição.

## Estrutura

```
materials/   # Node/TS — scraping + base SQLite + enriquecimento + consolidação
  src/                       data/materials.db
  scrape-flavorist.ts        (Flavorist — Nuvemshop)
  scrape-perfumoteca.ts      (Perfumoteca — Loja Integrada)
  scrape-perfumistico.ts     (Perfumístico — WooCommerce; HTTP+UA de navegador, paralelo)
  crawl-tgsc.ts / enrich-tgsc.ts   (odor/família/força via The Good Scents)
  enrich-pubchem.ts          (MW, ponto de ebulição, logP via PubChem)
  build-materials.ts         (consolida ofertas → materiais canônicos por CAS/nome)
  compute-price-per-g.ts     (preço por grama de material puro, normaliza diluição)
  classify-materials.ts      (aroma_chemical | essential_oil | solvent | base_essencia)
  derive-notes.ts            (topo/coração/base por fornecedor→ebulição→MW→família)
web/         # Next.js 16 + React 19 — catálogo + Modo Direto + Modo Reverso
knowledge/   # base de conhecimento de perfumaria (alimenta a heurística)
scraper/     # (pausado) projeto antigo de scraping do Fragrantica
```

## Como rodar

**Webapp — agora é uma PWA 100% ESTÁTICA (instalável, offline).**
```bash
cd web && npm install
npm run build          # gera a pasta out/ (site estático, ~679 páginas)
npx serve out -l tcp://0.0.0.0:3000   # serve na rede local
```
Tudo roda no navegador a partir de JSON embutido (catálogo, curso, quizzes, flashcards, Modo Direto/Reverso, revisão espaçada). Não precisa mais de servidor Node no ar.

### 📱 Instalar no celular / tablet
1. **Local (mesma rede Wi-Fi):** sirva `out/` (comando acima) e abra **http://Joaos-MacBook-Air.local:3000** no Safari (iPhone/iPad) ou Chrome (Android). Toque em **Compartilhar → Adicionar à Tela de Início** (iOS) ou **Instalar app** (Android). Vira um app com ícone, em tela cheia.
2. **OFFLINE de verdade + usar em qualquer lugar (sem o Mac):** o service worker (offline) e o cache exigem **HTTPS**. Publique a pasta `out/` num host estático grátis (Vercel / Netlify / Cloudflare Pages / GitHub Pages) → você ganha uma URL `https://` fixa, instala uma vez e usa **offline em qualquer lugar**. Ex.: `cd web && npx vercel deploy --prod out` (após `npx vercel login`).
   - As fórmulas salvas ficam no aparelho (localStorage); use **Exportar/Importar JSON** no Modo Direto pra levar de um pro outro.

**Base de dados (scraping + processamento):**
```bash
cd materials && npm install
npm run refresh      # re-raspa os 3 fornecedores e reprocessa tudo (leva alguns minutos)
# ou passos avulsos:
npm run pipeline     # só reprocessa (build → preço/g → classify → pubchem → tgsc → notas)
npm run stats        # estatísticas da base
```

> **Atualizar preços periodicamente:** rode `npm run refresh` (ex.: via `cron`/launchd, 1x por semana).
> O scraping é **resumível** (fila com status) e guarda o HTML bruto — nada se perde.

## Dados (estado atual)
- 3 fornecedores: Flavorist, Perfumístico, Perfumoteca (~600 produtos, ~1400 ofertas).
- ~398 materiais no app (químicos aromáticos + óleos essenciais + solventes).
- Cobertura: ~75% com nota (topo/coração/base), ~68% com família, ~36% com força de odor.

## Pendências conhecidas (melhorias futuras)
- **Calibrar o motor** contra fórmulas reais conhecidas (constantes hoje são estimativas plausíveis).
- Decompor **óleos essenciais** por composição real (hoje via descrição).
- **Limites IFRA por material** nos avisos (hoje avisos genéricos).
- Subir cobertura de força/família dos ~100 materiais sem dado (Perfumoteca sem CAS).
