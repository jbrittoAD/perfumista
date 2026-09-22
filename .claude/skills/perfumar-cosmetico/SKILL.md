---
name: perfumar-cosmetico
description: Perfumar sabonete, shampoo, creme ou loção com químicos aromáticos puros — dose por tipo de produto, o que sobrevive ao enxágue, limites IFRA por categoria e como adaptar uma fórmula de perfume alcoólico para cosmético. Use quando o usuário for pôr cheiro em um produto que ele fez, perguntar quanto de perfume cabe, ou por que o cheiro sumiu no banho.
---

# Perfumar cosmético

Detalhe e o acorde Imagination adaptado em `knowledge/cosmetica/PERFUMAR-COSMETICOS.md`.

## Dose por produto

| Produto | Categoria IFRA | Dose prática | Quando entra |
|---|---|---|---|
| Sabonete em barra, shampoo | 9 (rinse-off) | **3%** | abaixo de 60 °C, por último |
| Loção corporal | 5A | 0,5–1% | fase fria, < 45 °C |
| Creme facial | 5B | **0,1–0,3%** | fase fria, < 45 °C |

Em 50 g de creme a 0,2%, o perfume inteiro são 0,1 g — trabalhe com balança de 0,001 g ou com solução a 10%.

## O que sobrevive ao enxágue

| Fica | Vai pro ralo |
|---|---|
| almíscares (Galaxolide, Habanolide, Exaltolide, etileno brassilato, Ambrettolide) | cítricos e terpenos |
| âmbar (Ambroxan) | aldeídos leves |
| amadeirados (Iso E Super, Cashmeran) | florais frágeis |
| cumarina, vanilina, ionona | notas verdes/aquáticas |

O topo não é desperdício — é o que se sente ao abrir a embalagem. Só não gaste material caro nele.

## Adaptar uma fórmula de perfume para sabonete

Regra que funcionou com o Imagination (tipo): **topo × 0,5, almíscar e âmbar × 1,8**, renormalizar para 100%.
Depois compare duas barras lado a lado **uma semana depois** — é o único teste honesto de fixação.

## Regras de ouro

- **Químico puro, não essência pronta.** Essência vem diluída em solvente/álcool: amolece a barra, faz
  "suar" e você não controla o que entra. Custo: essência ≈ R$ 3,00/g contra Galaxolide a R$ 0,12/g.
- **Em cold process, o álcali come o topo** e vanilina escurece a barra. Em syndet (pH 5) e em melt & pour
  o perfume sofre muito menos.
- **IFRA**: o campo `ifra_limit_pct` de `web/lib/data/materials.json` já traz o limite por material.
  Dos usados nos acordes, só o **Galaxolide** tem limite (1,5%). Leave-on é sempre mais apertado que rinse-off.
- **No rosto, nada de cítrico expresso** (bergamota, limão, laranja amarga): fototóxicos.
