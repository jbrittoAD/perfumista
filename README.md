# Perfumista

App pessoal de perfumaria e cosmética caseira. **PWA estática, instalável, funciona offline** —
o caso de uso é abrir no tablet dentro de um avião.

**No ar:** https://jbrittoad.github.io/perfumista/
(Android Chrome → ⋮ → "Instalar app" · iOS Safari → Compartilhar → Adicionar à Tela de Início)

## O que ele faz

Cinco abas:

| Aba | O que é |
|---|---|
| **Descobrir** | deck de swipe com **587 matérias-primas** — direita = quero, esquerda = descarto. As cartas vêm agrupadas por família olfativa e, dentro da família, encadeadas por proximidade de cheiro |
| **Meu Laboratório** | os favoritos, com busca, filtro e "copiar lista" pro WhatsApp do fornecedor |
| **Paleta** | o que você tem em casa |
| **Fórmulas** | monta acorde em partes com os materiais da paleta e simula |
| **Livros** | o ebook *Do químico aromático ao produto* — **18 livros, 39 mil palavras, 15 figuras**, mais o **audiolivro de 2,6 h** |

Tudo fica no aparelho: progresso de leitura, posição do audiolivro e o que você curtiu no deck moram
em chaves separadas do `localStorage`, de propósito — uma nunca derruba a outra.

## Os livros

Fonte única em `knowledge/ebook/*.md`, três saídas:

- **no app** (`build_books.py` → JSON, com os SVG embutidos para funcionar offline);
- **PDF** de 126 páginas A4 (`build_pdf.sh`);
- **audiolivro** em 16 capítulos (`build_audio.py`, Edge TTS, voz `pt-BR-FranciscaNeural` a 96 kbps).

Tabela não se narra: cada uma virou uma fala escrita à mão em `knowledge/ebook/audio/narracoes.md`.

## Rodar

```bash
cd web && npm install
NEXT_PUBLIC_BASE_PATH=/perfumista npm run build    # gera web/out/
```

## Publicar

```bash
./web/scripts/publicar.sh "mensagem"    # build + precache + push na gh-pages
```

## Conferir antes de publicar

```bash
node web/scripts/e2e_app.mjs                                   # 13 provas num Chrome de verdade
.venv-audio/bin/python3 web/scripts/checar_idioma.py --todos   # idioma e fidelidade do áudio
```

O teste do app simula um deploy no meio da sessão e confere que o audiolivro baixado **sobrevive** —
foi assim que apareceu um bug em que atualizar o app apagava tudo que a pessoa tinha baixado.
O do áudio transcreve com Whisper e compara com o roteiro, porque ninguém vai ouvir 2,6 h para
checar se a voz escorregou para o espanhol.

## Estrutura

```
web/            Next.js 16 + React 19, output: 'export' — o app
  scripts/      build do deck, dos livros, do PDF, do áudio, publicação e testes
knowledge/
  ebook/        os 18 livros, as figuras e as narrações do audiolivro
  cosmetica/    a pesquisa que virou os livros de cosmética
  perfumologos/ a base do canal PerfumoLogos
  data/         os dados que alimentam o deck
  base_conhecimento_perfumaria.md · aroma-chemicals-notas.md · combinations.md
materials/      scraping dos fornecedores → SQLite → deck.json
.claude/skills/ skills de bancada (formular, diluir, sabonete, vender…)
```

**Detalhes de arquitetura, decisões e armadilhas: [ESTADO.md](ESTADO.md).**

## Avisos

- O motor de previsão (projeção, longevidade, pirâmide) é **heurístico e explicável**, não medição de
  laboratório. A tela diz isso onde o dado é estimado.
- **Não raspar o The Good Scents Company** — o robots.txt deles bloqueia ClaudeBot e anthropic-ai no
  site inteiro. Dado perceptual entra por curadoria; dado físico vem da API do PubChem.
- `materials/` ainda tem o pipeline antigo de scraping dos fornecedores; o app clássico
  (Modo Direto/Reverso) foi substituído pelo deck e está guardado na tag `v1-classico`.
