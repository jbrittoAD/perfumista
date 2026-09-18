<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:perfumista-app -->
# Perfumista — regras deste app

Este app é um **deck de swipe** de matérias-primas de perfumaria (3 abas: Descobrir /
Meu Laboratório / Fórmulas). Antes de mexer, leia `README.md` e `../ESTADO.md`.

- **Nunca edite `lib/data/deck.json` à mão.** Ele é gerado por `python3 scripts/build_deck.py`.
  Mudança de conteúdo de carta é mudança nos scripts + rebuild.
- **A ordem do baralho é parte do produto**, não detalhe: famílias inteiras em sequência,
  vizinhança olfativa dentro da família. Não introduza aleatoriedade.
- **A foto da carta é o objeto do mundo real que o cheiro evoca** — nunca estrutura molecular.
  Chave muito compartilhada precisa de VARIANTE (`fetch_photos.py --variants`): repetir a
  mesma imagem em cartas seguidas mata o deck. Crédito sempre pela variante em uso.
- **A carta mostra tudo que decide compra sem exigir toque.** Se precisar de um dado novo
  para decidir, ele vai na carta; a folha de detalhe é só para consulta.
- **NÃO raspar o The Good Scents Company.** O robots.txt deles bloqueia ClaudeBot e
  anthropic-ai no site inteiro. Dado perceptual entra por curadoria (`deck_notes_pt.py`);
  dado físico vem do PubChem (`enrich_pubchem.py`), que é API pública.
- **Texto de carta tem que variar por MATERIAL, não por família.** Já aconteceu de 67
  cartas cítricas dividirem um único texto de percepção — é o pior defeito possível num
  app cuja função é comparar materiais parecidos.
- **Posição na pirâmide é FAIXA (`notes`), não rótulo único.** Use `notesLabel`/`notesShort`;
  o campo `note` da fonte existe só por compatibilidade e está vazio em 222 materiais.
- **Tailwind v4:** `@apply` não compõe classes de componente. Repita a base em cada variante.
- **Toda gravação de progresso passa por `lib/deck-store.ts`** (IndexedDB + espelho no
  localStorage). Não escreva direto no localStorage em componente.
- **Ao publicar, bumpe `CACHE_VERSION` em `public/sw.js`**, senão o celular serve o cache velho.
- Dado estimado (percepção por concentração, simulação de acorde, preço raspado) tem que
  aparecer na tela como estimado. Não venda heurística como medição.
<!-- END:perfumista-app -->
