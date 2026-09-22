# Bloco E — Perfumar o que eu faço

Itens 21 a 25 de [EXPLORAR.md](../../EXPLORAR.md). Pesquisado em 21/09/2026.

## 21 — Químico puro × essência pronta

| | Essência pronta de loja | Químicos puros (o que você já tem) |
|---|---|---|
| O que é | mistura já pronta, **diluída em solvente/álcool** para render | molécula 100% concentrada |
| Efeito na barra | o solvente amolece e faz "suar"; parte evapora no derretimento | nenhum solvente entra na fórmula |
| Controle | você não sabe o que tem dentro nem em que proporção | você decide molécula por molécula |
| Custo | R$ 29,57 por 10 ml (Palácio) ≈ **R$ 3,00/g** | Galaxolide R$ 0,12/g · Hedione R$ 0,17/g |
| IFRA | depende do certificado do fornecedor | você calcula pelo material |

**Veredicto: para você, químico puro, sem discussão.** Você já tem o banco de 590 materiais com preço por
grama e a bancada de pesagem. Essência pronta só faz sentido pra quem não tem isso.

## 22 — O que sobrevive ao enxágue

O sabonete fica **segundos** na pele e é diluído em muita água. Sobra só o que tem **substantividade**:
afinidade pela queratina e baixa volatilidade.

| Fica na pele | Vai pro ralo |
|---|---|
| **Almíscares** (Galaxolide, Habanolide, Exaltolide, etileno brassilato, Ambrettolide) | cítricos (limoneno, terpenos de laranja) |
| **Âmbar** (Ambroxan, Ambrox DL) | aldeídos leves |
| **Amadeirados** (Iso E Super, Cashmeran, Javanol) | notas verdes e aquáticas leves |
| Cumarina, vanilina, ionona | florais frágeis |

O topo **não é desperdício**: ele é o que você sente ao abrir a embalagem e no primeiro instante da espuma.
Só não gaste material caro nele.

## 23 — IFRA por tipo de produto

| Produto | Categoria IFRA | Dose prática |
|---|---|---|
| Sabonete em barra, shampoo | 9 (rinse-off) | 3% |
| Loção corporal | 5A | 0,5–1% (indústria fica em 1–2% no teto) |
| Creme facial | 5B | 0,1–0,3% |

O banco do app (`materials.json`, campo `ifra_limit_pct`) já carrega o limite por material. Dos que uso
nos acordes abaixo, **só o Galaxolide tem limite (1,5%)** — e a 3% de perfume ele fica em ~1% da barra.
Iso E Super, Ambroxan, Habanolide, Hedione, etileno brassilato e Exaltolide: sem restrição no banco.

## 24 — Imagination (tipo) adaptado para sabonete

A sua fórmula `imagination-tipo-modo-direto.json` é feita **para álcool**. Em sabonete, o topo
(acetato de linalila, bergamota, terpenos de laranja, linalol, citral, gengibre) evapora.
**Adaptação: topo × 0,5 e os almíscares/âmbar × 1,8**, renormalizado.

| Material | Original | **Versão sabonete** | Para 1 kg de syndet (30 g) | Para 200 g glicerinada (6 g) |
|---|---|---|---|---|
| Ambroxan | 21,68% | **33,92%** | 10,175 g | 2,035 g |
| Hedione | 23,88% | 20,75% | 6,226 g | 1,245 g |
| Ambrettolide | 7,59% | **11,88%** | 3,564 g | 0,713 g |
| Dihidro beta ionona | 9,79% | 8,51% | 2,553 g | 0,511 g |
| Velvione | 3,50% | **5,47%** | 1,641 g | 0,328 g |
| Acetato de linalila | 10,29% | 4,47% | 1,342 g | 0,268 g |
| Exaltolide Total | 2,70% | **4,22%** | 1,266 g | 0,253 g |
| OE Bergamota | 7,59% | 3,30% | 0,990 g | 0,198 g |
| Linalol | 4,10% | 1,78% | 0,534 g | 0,107 g |
| Terpenos de laranja | 3,30% | 1,43% | 0,430 g | 0,086 g |
| OE Guaiacwood | 1,10% | 0,96% | 0,287 g | 0,057 g |
| Citronelol | 1,10% | 0,96% | 0,287 g | 0,057 g |
| Cumarina | 0,80% | 0,69% | 0,208 g | 0,042 g |
| OE Gengibre | 1,00% | 0,43% | 0,130 g | 0,026 g |
| Geraniol · acetato de geranila · citral · neroli · ionona beta · metil ionona · cinamaldeído · indol · nerol | traços | ~1,2% somados | 0,36 g | 0,07 g |

**Custo: R$ 42,70 por kg de sabonete** (R$ 8,54 na barra glicerinada de 200 g). Caro porque Ambrettolide
(R$ 5,46/g) e Velvione (R$ 7,36/g) puxam sozinhos 60% da conta.

### Versão econômica (mesmo caráter, 1/2 do preço)

Troque **Velvione (5,47%) inteiro** e **metade do Ambrettolide** por **Galaxolide 8% + etileno brassilato
4,4%** — os dois entregam o mesmo "musk limpo de sabonete" a R$ 0,12–0,17/g.
**Custo cai de R$ 42,70 para ≈ R$ 19,90 por kg** (R$ 1,99 por barra de 100 g).
Perde um pouco da elegância do almíscar macrocíclico; num produto que é enxaguado, ninguém percebe.

**Teste que vale fazer:** duas barras glicerinadas de 200 g, uma com cada versão, cheiradas lado a lado
**uma semana depois**. É o único jeito honesto de saber se o Ambrettolide vale 2× o preço na sua barra.

## 25 — Lojas de contratipo: vale?

Só faz sentido se você quiser um cheiro que não consegue montar. Do que apurei:

| Loja | Ponto forte | Ponto fraco |
|---|---|---|
| [Palácio das Essências](https://www.palaciodasessencias.com.br/) | catálogo grande de contratipos, inclusive Imagination (R$ 29,57/10 ml) | há reclamação registrada no Reclame Aqui de essência com **cheiro diferente do anunciado** — a empresa responde e resolve |
| [Big Essências](https://www.bigessencias.com.br/) | produtos com avaliação alta (27 avaliações, 5★ em alguns itens), preço a partir de R$ 24,90 | avaliação é da própria loja, não é fonte independente |
| [Aroma de Amora](https://www.lojaaromadeamora.com.br/) | 20 anos de casa, catálogo masculino amplo (R$ 65,90/50 ml) | idem |
| [Império das Essências](https://www.imperiodasessencias.com.br/) | tem micas e insumo junto, resolve o pedido inteiro | — |

**A ressalva que vale mais que a tabela:** relato de cheiro em loja de essência é **autodeclarado**.
Não existe fonte independente comparando contratipo com o original. Compre 10 ml antes de comprar 100 ml,
e **para cosmético peça sempre a versão lipossolúvel** e o **certificado IFRA** da essência — sem ele você
não sabe a que porcentagem pode usar.
