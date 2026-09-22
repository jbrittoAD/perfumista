# Perfumista — ESTADO / HANDOFF (para retomar em nova sessão)

App **de estudo e catalogação de matérias-primas de perfumaria** do João (uso pessoal).
Desde 17/09/2026 o app é um **deck de swipe** (estilo Tinder): o usuário passa por 590
químicos aromáticos, marca o que quer na paleta, e simula acordes com o que marcou.

> O app **anterior** (catálogo + curso + motor direto/reverso + compras) está preservado:
> tag git `v1-classico` e cópia em `_backup/web-classico-2026-09-17/`. Ver "Voltar atrás".

## 🌐 No ar (produção)
- **Com o app de swipe (17/09/2026):** https://jbrittoad.github.io/perfumista/
  (GitHub Pages, branch `gh-pages`, conta `jbrittoAD` do `gh`).
- **Ainda com o app clássico:** https://perfumista-app.vercel.app — o CLI da Vercel
  neste Mac está logado na conta do TRABALHO (Kyte), não na `jbrittoad` dona do
  projeto, então o deploy falha com "Could not retrieve Project Settings".
  Para atualizar: `vercel logout && vercel login` (conta pessoal) e então o fluxo
  de redeploy abaixo.
- **Instalar:** Android Chrome → ⋮ → "Instalar app". iOS Safari → Compartilhar → Adicionar à
  Tela de Início. NÃO usar o navegador in-app do WhatsApp/IG.

## 🏗️ Arquitetura
- **PWA 100% estática** — Next.js 16 App Router, `output: 'export'`. Tudo client-side, dados
  em JSON embutido. Service worker (`web/public/sw.js`) = offline. Sem servidor em runtime.
- **5 abas** (bottom tab bar) — a quinta, Livros, entrou em 22/09/2026:
  - `/` **Descobrir** — o deck. Arrasta → direita = quero / esquerda = descarto; toque = ficha.
  - `/lab` **Meu Laboratório** — os favoritos, com busca, filtro por família, ordenação e
    "copiar lista" (texto pro WhatsApp do fornecedor).
  - `/formulas` **Fórmulas** — monta acorde em PARTES com materiais da paleta e simula.
  - `/livros` **Livros** — o ebook *Do químico aromático ao produto* (16 livros, 34 mil palavras,
    15 figuras P&B). Progresso de leitura em `localStorage['perfumista:livros']` — chave SEPARADA do
    deck, de propósito: um nunca derruba o outro. O leitor restaura a rolagem exata ao reabrir.
    As 16 rotas entram no precache do service worker → **funciona offline** (o caso de uso é avião).

## 📚 O ebook (fonte única, três saídas)
- **Fonte:** `knowledge/ebook/*.md` + `knowledge/ebook/figuras/*.svg` (15 diagramas em P&B).
- **App:** `python3 web/scripts/build_books.py` → `web/lib/data/books.json` (pandoc converte md→html,
  INLINA os SVG). Rodar sempre que editar um .md.
- **PDF:** `bash web/scripts/build_pdf.sh` → `knowledge/ebook/Do-quimico-aromatico-ao-produto.pdf`
  (110 páginas A4, capa e sumário; pandoc + Chrome headless + `pdf.css`).
- ⚠️ **Armadilha:** `<` cru dentro de `<text>` num SVG quebra a figura **só no PDF** (o `<img>` lê como
  XML estrito; o navegador perdoa). Escapar como `&lt;`.
- **Ordem do baralho (o ponto central):** as cartas vêm agrupadas por família olfativa e,
  dentro da família, encadeadas por proximidade de cheiro — todos os limões, depois as
  bergamotas, depois as laranjas. Isso é calculado no build, não em runtime.
- **A carta é a ficha inteira**, não uma prévia: família, faixa na pirâmide, tipo do
  material, cheiro, facetas, aplicação, dose, percepção por concentração, aviso de IFRA e
  preço aparecem sem nenhum toque. A folha de detalhe existe só para consulta (ofertas por
  fornecedor, CAS, massa molar, crédito da foto).
- **Faixa na pirâmide** (`notes`, em `build_deck.py:derive_notes`): o banco traz um rótulo
  único e só para 371 dos 593, então a faixa é derivada cruzando o `note_type` da fonte, a
  física (ponto de ebulição; cortes tirados da mediana real do banco — topo 155 °C, coração
  227 °C, base 283 °C) e o típico da família. Fonte e física discordando entram as duas —
  é o material que fica entre degraus. A faixa é sempre contígua; mistura (óleo essencial,
  base) abre pelo menos dois degraus; solvente não tem nota. O campo `notesOrigin` registra
  de onde veio, e a ficha mostra isso.
- **Motor** (`web/lib/engine.ts` + `accords.ts`, herdados do app antigo): pirâmide, famílias
  dominantes, projeção, duração e avisos de IFRA. Heurístico — é estimativa, não medição.

## 📦 Dados
- **`web/lib/data/deck.json`** (1 MB, 590 cartas) — a única fonte que o app lê. Gerado por
  `python3 web/scripts/build_deck.py` a partir de `materials.json`. O build faz:
  limpeza de texto (CSS/HTML/copy de e-commerce que vêm dos 4 fornecedores raspados),
  facetas em PT via léxico curado, "para que serve", dose, percepção por concentração,
  escolha da foto e a ordem do baralho.
- **`web/lib/data/materials.json`** (593 itens) — entrada do build, não é lido pelo app.
- **`web/public/photos/*.webp`** — a foto do "objeto do mundo real" que cada cheiro evoca.
  95 chaves base + **variantes** (`<chave>-2.webp`, `-3.webp`, `-4.webp`) para as 25 chaves
  compartilhadas por muitas cartas — sem elas o usuário via a mesma pedra de âmbar 35 vezes
  seguidas. A carta escolhe a variante por `seq % n` (posição no baralho): como o baralho
  agrupa por chave de foto, cartas do mesmo balde têm seq consecutivo e a imagem alterna
  0,1,2,0,1,2, nunca repetindo em sequência.
  - `python3 web/scripts/fetch_photos.py` baixa as chaves base (busca no Commons).
  - `python3 web/scripts/fetch_photos.py --variants all --per 3` baixa as variantes, usando
    **listagem por categoria** (`VARIANT_CATS` em `deck_lexicon.py`) em vez de busca: uma
    chamada devolve dezenas de fotos do objeto certo, enquanto a busca traz resultado
    tangencial e toma 429 do Commons.
  - Crédito e licença de CADA arquivo (inclusive variantes) em `public/photos/credits.json`,
    exibidos na ficha. A ficha resolve o crédito pela variante em uso, não pela chave base —
    atribuir a foto errada violaria a CC-BY.
- Scripts do deck, em `web/scripts/`:
  - `build_deck.py` — o gerador.
  - `deck_lexicon.py` — 95 chaves de foto (+ categorias de variante), ~420 descritores e
    as 16 famílias.
  - `deck_families.py` — de faceta para família (voto de reclassificação).
  - `deck_uses_pt.py` — os 157 `key_uses` do banco traduzidos à mão.
  - **`deck_notes_pt.py`** — ~270 notas escritas à mão dizendo **o que distingue cada
    material do vizinho mais parecido** (por que Javanol e não Sandalore). Cobre ~55% do
    baralho, concentrada nos grupos que mais confundem: sândalos, almíscares, âmbares,
    muguets, iononas, aldeídos graxos, álcoois de rosa, ésteres frutados, verdes e mentas.
  - **`enrich_pubchem.py`** — completa massa molar, ponto de ebulição, logP e pressão de
    vapor pela API pública do PubChem (NCBI), com cache em `materials/data/pubchem.json`.
    Metade do catálogo veio dos fornecedores sem física nenhuma, e é a física que decide a
    posição na pirâmide.
  - `fetch_photos.py` — fotos e variantes do Wikimedia Commons.

### Fornecedores mapeados (e os que ficaram de fora)
| Loja | Status | Por quê |
|---|---|---|
| Eu Perfumista | ✅ raspada | químicos + óleos essenciais |
| Flavorist | ✅ raspada | químicos consagrados |
| Perfumístico | ✅ raspada | químicos + bases |
| Perfumoteca | ✅ raspada | moléculas isoladas |
| **Neuroaroma** | ✅ **só a seção de químicos** | 72 das 127 URLs são contratipo; o scraper descarta fragrância por regex de nome |
| **Big Essências** | ❌ **não raspada** | loja de artesanato/saboaria: ~1050 das 2060 URLs são essência pronta, e em "matéria-prima" só 6 de 78 itens são químico de perfumaria |
| Symrise (e as outras casas) | ❌ não aplicável | fabricante B2B: pedido em quilos, exige CNPJ, sem preço público. As moléculas delas chegam pelas lojas acima (879 ofertas Givaudan, 84 IFF, 60 Firmenich, 29 Symrise) |

### Sobre fontes externas (decisão registrada)
O **The Good Scents Company** seria a melhor fonte para descrição perceptual, força do odor
e substantividade — mas o `robots.txt` deles bloqueia agentes de IA explicitamente
(`ClaudeBot`, `Claude-Web`, `anthropic-ai`: `Disallow: /`). **Não raspar.** O que ele daria
de perceptual entra por curadoria em `deck_notes_pt.py`; o que é físico vem do PubChem, que
é API pública feita para acesso programático.

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
- **Redeploy GitHub Pages** (é o que está no ar em https://jbrittoad.github.io/perfumista/):
  ```bash
  cd web && NEXT_PUBLIC_BASE_PATH=/perfumista npm run build   # subpath é obrigatório
  TMP=$(mktemp -d) && git clone --branch gh-pages --single-branch \
    https://github.com/jbrittoAD/perfumista.git "$TMP/site"
  find "$TMP/site" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
  cp -R out/. "$TMP/site"/ && touch "$TMP/site/.nojekyll"   # sem .nojekyll o Pages ignora _next/
  cd "$TMP/site" && git add -A && git commit -m "..." && git push origin gh-pages
  ```
  O Pages leva ~2 min para propagar. Sem force-push: o clone já traz o histórico.
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
