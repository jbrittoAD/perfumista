# Perfumista — ESTADO / HANDOFF (para retomar em nova sessão)

App **de estudo e catalogação de matérias-primas de perfumaria** do João (uso pessoal).
Desde 17/09/2026 o app é um **deck de swipe** (estilo Tinder): o usuário passa por 587
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
  - `/livros` **Livros** — o ebook *Do químico aromático ao produto* (17 livros, 34.572 palavras,
    15 figuras P&B) e o audiolivro de 2,6 h em 16 capítulos. Progresso de leitura em
    `localStorage['perfumista:livros']` e posição de escuta em `['perfumista:audio']` — chaves
    SEPARADAS do deck, de propósito: uma nunca derruba a outra. O leitor restaura a rolagem exata.
    As 17 rotas de livro entram no precache do service worker → **funciona offline** (o caso de uso
    é avião). Os mp3 ficam FORA do precache e entram sob demanda.

## 🎧 O audiolivro
- **Voz:** `pt-BR-FranciscaNeural`, `--rate=-12% --pitch=-8Hz`, via Edge TTS. Mono, **96 kbps**.
- **96 kbps é o teto do endpoint**, não 48 como estava escrito antes aqui. Pedir 128/160/192 não dá
  erro: devolve arquivo ilegível. O patch está em `tts_pt.py` (`usar_formato`). Detalhes no AUDIOLIVRO.md.
- **A briga do idioma, na ordem em que aconteceu.** O `edge-tts` fixa `xml:lang='en-US'` no SSML;
  `web/scripts/tts_pt.py` reescreve o `mkssml` para declarar `pt-BR`. O `<lang xml:lang>` que o doc do
  Azure manda usar **é rejeitado** neste endpoint — testado. E mesmo com o `pt-BR` correto no `<speak>`,
  a voz **multilíngue** ainda escorregava para espanhol em frase ambígua ("cerca de 400 tipos" é
  espanhol válido). **A solução é a voz ser monolíngue:** a Francisca não tem outro idioma pra onde ir.
  Termo estrangeiro que sobrava (fougère, chypre, sillage) virou pronúncia em português no glossário
  `FRANCES` do `build_audio.py`.
- **Tabela não se narra:** cada uma virou uma fala escrita à mão em `knowledge/ebook/audio/narracoes.md`
  (113 narrações). Sem narração, a tabela é **pulada em silêncio** — foi assim que os dois livros de
  comparação (`01c` e `03b`) quase foram ao ar sem o conteúdo que os justifica.
- **Gerar:** `python3 web/scripts/build_audio.py --todos` (~25 min) e depois `build_books.py`, que copia
  os mp3 para `web/public/audio/`.
- **Conferir sem escutar (obrigatório antes de publicar):**
  `.venv-audio/bin/python3 web/scripts/checar_idioma.py --todos`. Ele transcreve com Whisper e checa
  duas coisas: **idioma de cada trecho** (acusa deriva pra espanhol/francês) e **fidelidade ao roteiro**
  (compara a transcrição com o `<slug>.txt` — pega tabela vazando, bloco faltando, palavra comida).
  Sai com código 1 se algum capítulo reprovar. Roda a ~2× o tempo real (2,6 h de áudio ≈ 1 h20).
  Número por extenso no roteiro e dígito na transcrição são unificados antes de comparar — sem isso
  ele acusava buraco em "nove por um, oito por dois" e o aviso viraria ruído.
- **No app:** `/livros/audio` — player com capítulos, velocidade, posição salva e download sob demanda.
  Os mp3 ficam **fora do precache** (~50 MB).

## 💾 Onde o áudio e o PDF ficam guardados

Os `.mp3` e o `.pdf` **não** entram na branch `main`, e isso é de propósito: são 113 MB de áudio mais
5 MB de PDF que o build regera a partir de `knowledge/ebook/*.md` e `audio/narracoes.md`.

**Mas eles estão no git**, na branch `gh-pages` — que é o que o `publicar.sh` empurra para o GitHub.
Ou seja: existe backup versionado no GitHub *e* download offline pelo app, sem inchar o histórico da
branch de trabalho com binário que muda inteiro a cada regeração.

O que é fonte de verdade e precisa estar na `main`: os `.md` dos livros, o `narracoes.md` (87+26
narrações escritas à mão — isso **não** se regera sozinho) e os scripts.

## 🧪 Conferir antes de publicar (dois comandos)

```bash
.venv-audio/bin/python3 web/scripts/checar_idioma.py --todos   # o áudio: idioma e fidelidade
node web/scripts/e2e_app.mjs                                   # o app: num Chrome de verdade
```

O `e2e_app.mjs` sobe um servidor que imita o Pages (inclusive **Range**, sem o qual o `<audio>` não
busca posição), abre o Chrome por CDP e prova 13 coisas. As que pegam bug de verdade:

- guardar capítulo → cortar a rede → **tocar assim mesmo** (o caso de uso do avião);
- ler o livro com a rede cortada;
- **simular um deploy** (serve um `sw.js` com versão nova, força o update, espera o `activate`) e
  conferir que o áudio e o PDF baixados **sobrevivem**. Esta pegou um bug real: o `activate` apagava
  todo cache que não fosse o da versão nova, inclusive os do usuário.

⚠️ A primeira versão dessa prova passava **com o bug presente**, porque esperava o cache novo
*aparecer* — e ele nasce no `install`, antes do `activate` destrutivo. Prova de service worker tem
que esperar o sinal do `activate` (o cache da versão antiga sumir), não o do install. Teste de
regressão só vale depois de você ver ele reprovar com o código velho.

`--ar` roda contra o site publicado. Armadilha do export do Next: existe `livros.html` **e** uma pasta
`livros/` sem índice; servidor que procura a pasta primeiro dá 404 onde o Pages funciona.

## 📚 O ebook (fonte única, três saídas)
- **Fonte:** `knowledge/ebook/*.md` + `knowledge/ebook/figuras/*.svg` (15 diagramas em P&B).
- **App:** `python3 web/scripts/build_books.py` → `web/lib/data/books.json` (pandoc converte md→html,
  INLINA os SVG). Rodar sempre que editar um .md.
- **PDF:** `bash web/scripts/build_pdf.sh` → `knowledge/ebook/Do-quimico-aromatico-ao-produto.pdf`
  (112 páginas A4, capa e sumário; pandoc + Chrome headless + `pdf.css`).
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
- **`web/lib/data/deck.json`** (1,2 MB, 587 cartas) — a única fonte que o app lê. Gerado por
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
- **Publicar tudo de uma vez:** `./web/scripts/publicar.sh "mensagem"` — ele bumpa o CACHE_VERSION,
  roda `build_books.py`, builda com o basePath certo, injeta o precache e empurra na `gh-pages`.
  O passo a passo manual, para quando algo der errado no meio:
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
- **`precache_assets.py` precisa do MESMO `NEXT_PUBLIC_BASE_PATH` do build.** Ele acha os assets pelo
  caminho que o HTML referencia; sem a variável, encontra zero e o app vai ao ar **sem precache** —
  offline quebrado justamente na primeira abertura. Antes ele reportava "0 assets" como sucesso; hoje
  sai com código 1. O `publicar.sh` exporta a variável para os dois passos.
- **Cache do usuário não é cache do app.** O `activate` do service worker só pode apagar o shell
  versionado. `perfumista-audio` e `perfumista-downloads` são o que a pessoa baixou de propósito —
  apagá-los num deploy deixa o avião sem audiolivro. Estão em `CACHES_DO_USUARIO` no `sw.js`.
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
