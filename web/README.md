# Perfumista — deck de matérias-primas

PWA de estudo de perfumaria no formato **swipe**: 590 químicos aromáticos, óleos
essenciais e bases do mercado brasileiro, um por carta, agrupados por família olfativa.

| Aba | O que faz |
| --- | --- |
| **Descobrir** (`/`) | O deck. Direita = quero na paleta · esquerda = descarto · toque = ficha completa. |
| **Meu Laboratório** (`/lab`) | Os favoritos, com busca, filtro por família, ordenação por preço e exportação da lista de compras. |
| **Fórmulas** (`/formulas`) | Monta um acorde em partes com os materiais da paleta e simula pirâmide, famílias, projeção, duração e limites de IFRA. |

## Como rodar

```bash
export PATH="/opt/homebrew/bin:$PATH"
npm install
npm run dev            # http://localhost:3000
npm run build          # gera out/ (export estático)
npx serve out -l 4123  # serve o build
```

## Como os dados são feitos

O app lê **um arquivo só**: `lib/data/deck.json`. Ele é gerado, não editado à mão.

```bash
python3 scripts/build_deck.py     # materials.json  →  deck.json
python3 scripts/fetch_photos.py   # baixa as 95 fotos para public/photos/
```

`build_deck.py` resolve o que o dado cru não resolve: limpa CSS e copy de e-commerce que
vêm dos fornecedores raspados, extrai facetas em português, traduz a aplicação técnica,
estima a percepção por faixa de concentração, escolhe a foto do objeto que o cheiro evoca
e — o mais importante para a mecânica — calcula **a ordem do baralho**, encadeando cada
família por proximidade de cheiro (todos os limões, depois as bergamotas, depois as
laranjas). Detalhe de cada etapa no cabeçalho do script.

Os vocabulários curados ficam em `scripts/deck_lexicon.py` (fotos, descritores, famílias),
`scripts/deck_families.py` (reclassificação por voto de faceta) e `scripts/deck_uses_pt.py`
(os 157 textos técnicos traduzidos do banco).

## Persistência

`lib/deck-store.ts` grava em **IndexedDB** e espelha em **localStorage** a cada mudança —
o progresso sobrevive a offline, a recarregar e a fechar o app. `lib/deck-sync.ts` espelha
opcionalmente no Supabase para sincronizar entre aparelhos, com merge por união.

## Limites honestos

- A **percepção por concentração** é estimativa (força × dose típica × família), não medição.
- A **simulação de acorde** é heurística estrutural, calibrada contra acordes de referência.
- Os **preços** são o que foi raspado dos fornecedores; confira antes de comprar.
- As **fotos ilustram o cheiro**, não são o material.

Contexto completo do projeto e histórico: `../ESTADO.md`.
