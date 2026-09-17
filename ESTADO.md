# Perfumista — ESTADO / HANDOFF (para retomar em nova sessão)

App **de estudo e catalogação de matérias-primas de perfumaria** do João (uso pessoal).
Desde 17/09/2026 o app é um **deck de swipe** (estilo Tinder): o usuário passa por 590
químicos aromáticos, marca o que quer na paleta, e simula acordes com o que marcou.

> O app **anterior** (catálogo + curso + motor direto/reverso + compras) está preservado:
> tag git `v1-classico` e cópia em `_backup/web-classico-2026-09-17/`. Ver "Voltar atrás".

## 🌐 No ar (produção)
- **Principal:** https://perfumista-app.vercel.app (Vercel, conta `jbrittoad`, projeto `perfumista`;
  aliases: perfumista-app / perfumaria-app / perfumista-diy)
- **Backup:** https://jbrittoad.github.io/perfumista/ (GitHub Pages, branch `gh-pages`)
- **Instalar:** Android Chrome → ⋮ → "Instalar app". iOS Safari → Compartilhar → Adicionar à
  Tela de Início. NÃO usar o navegador in-app do WhatsApp/IG.

## 🏗️ Arquitetura
- **PWA 100% estática** — Next.js 16 App Router, `output: 'export'`. Tudo client-side, dados
  em JSON embutido. Service worker (`web/public/sw.js`) = offline. Sem servidor em runtime.
- **3 telas, 3 abas** (bottom tab bar):
  - `/` **Descobrir** — o deck. Arrasta → direita = quero / esquerda = descarto; toque = ficha.
  - `/lab` **Meu Laboratório** — os favoritos, com busca, filtro por família, ordenação e
    "copiar lista" (texto pro WhatsApp do fornecedor).
  - `/formulas` **Fórmulas** — monta acorde em PARTES com materiais da paleta e simula.
- **Ordem do baralho (o ponto central):** as cartas vêm agrupadas por família olfativa e,
  dentro da família, encadeadas por proximidade de cheiro — todos os limões, depois as
  bergamotas, depois as laranjas. Isso é calculado no build, não em runtime.
- **Motor** (`web/lib/engine.ts` + `accords.ts`, herdados do app antigo): pirâmide, famílias
  dominantes, projeção, duração e avisos de IFRA. Heurístico — é estimativa, não medição.

## 📦 Dados
- **`web/lib/data/deck.json`** (1 MB, 590 cartas) — a única fonte que o app lê. Gerado por
  `python3 web/scripts/build_deck.py` a partir de `materials.json`. O build faz:
  limpeza de texto (CSS/HTML/copy de e-commerce que vêm dos 4 fornecedores raspados),
  facetas em PT via léxico curado, "para que serve", dose, percepção por concentração,
  escolha da foto e a ordem do baralho.
- **`web/lib/data/materials.json`** (593 itens) — entrada do build, não é lido pelo app.
- **`web/public/photos/*.webp`** (95 chaves, ~12 MB) — a foto do "objeto do mundo real" que
  cada cheiro evoca. Baixadas do Wikimedia Commons por `python3 web/scripts/fetch_photos.py`;
  crédito/licença em `public/photos/credits.json` e exibidos na ficha.
- Scripts do deck: `web/scripts/` — `build_deck.py`, `deck_lexicon.py` (95 fotos + 334
  descritores + 15 famílias), `deck_families.py` (voto de reclassificação), `deck_uses_pt.py`
  (157 textos técnicos traduzidos à mão), `fetch_photos.py`.

## 🧠 Persistência
- **IndexedDB** `perfumista-deck` (primária) + **localStorage** `perfumista:deck-state`
  (espelho/fallback). Guarda: swipe de cada carta, cursor por família, id da última carta
  vista e as fórmulas salvas. Ver `web/lib/deck-store.ts`.
- **Sync opcional** entre aparelhos (`web/lib/deck-sync.ts`): mesmas RPC Supabase
  (`perfumista_get`/`perfumista_set`, projeto `tgbnxnftahjrphxpazvz`) e mesmo código fixo do
  app antigo. Merge é sempre união / "melhor de cada", nunca sobrescrita. Preserva os campos
  do app antigo na mesma linha. Se a tabela não existir, o app funciona igual (offline-first).

## 🚀 Rodar / publicar
- Local: `cd web && npm install && npm run dev` (node em `/opt/homebrew/bin` →
  `export PATH="/opt/homebrew/bin:$PATH"`).
- Build estático: `cd web && npm run build` → `out/`. Servir: `npx serve out -l 4123`.
- **Redeploy Vercel:** `cd web && vercel build --prod && vercel deploy --prebuilt --prod --yes --archive=tgz`.
  ⚠️ `--archive=tgz` é ESSENCIAL (senão "Upload aborted"). Depois **re-apontar os aliases**
  (ficam presos no deploy antigo): `vercel alias set <deploy>.vercel.app perfumista-app.vercel.app`
  (idem perfumaria-app, perfumista-diy).
- Ao publicar mudança, **bumpar `CACHE_VERSION` em `web/public/sw.js`** — senão o celular
  continua servindo a versão antiga do cache.

## ↩️ Voltar atrás (restaurar o app clássico)
```bash
cd ~/Documents/Pessoais/Perfumista
rm -rf web && cp -R _backup/web-classico-2026-09-17 web   # ou: git checkout v1-classico -- web
cd web && npm install && npm run build
```

## ⚠️ Armadilhas do ambiente
- **node/npx/gh somem do PATH** → sempre `export PATH="/opt/homebrew/bin:$PATH"`.
- Tailwind v4: `@apply` **não** compõe classes de componente (`.btn-ghost { @apply btn }`
  quebra o build). Repetir a base em cada variante.
- Wikimedia Commons responde **429** se o lote for rápido: `fetch_photos.py` já espera 3s
  entre imagens e tem backoff, mas um lote grande leva minutos.
- `grep` do shell às vezes falha com `unknown option '-G'` — usar `rg` ou Python.

## ⏭️ Próximos passos
1. **Revisar as fotos que ainda não representam bem o cheiro** — `fetch_photos.py --force
   --only <chave>` depois de ajustar a consulta em `deck_lexicon.py`.
2. **Facetas vazias:** 43 cartas sem nenhum descritor (a fonte não trouxe). Vale caçar
   descrição melhor ou escrever à mão.
3. **Calibrar a percepção por concentração** com o que o nariz confirmar na bancada —
   hoje é template por família + força.
4. Login real (Google/Apple) no lugar do código fixo de sync, se um dia virar multiusuário.
