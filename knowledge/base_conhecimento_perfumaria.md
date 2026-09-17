# Base de Conhecimento de Perfumaria — Motor Heurístico Olfativo

> Documento técnico para alimentar um motor de previsão olfativa: `(ingredientes + quantidades) → notas percebidas + evolução topo/coração/base` e o inverso `notas desejadas → ingredientes sugeridos`.
>
> Prioriza NÚMEROS, PROPORÇÕES e TABELAS. Prosa mínima. Todas as afirmações trazem fonte.
>
> **Data de compilação:** 2026-07-01. **Aviso de calibração:** valores de IFRA, thresholds e faixas de uso variam entre fontes e emendas; ver seção 8 (Caveats) antes de tratar qualquer número como canônico.

---

## Índice

1. Famílias olfativas (Michael Edwards + clássicas SFP)
2. Classificação por volatilidade (topo/coração/base)
3. Força odorífera e efeito da diluição (modelo quantidade→intensidade)
4. Montagem de acordes (receitas com proporções)
5. Projeção/sillage vs tenacidade/fixação
6. Dosagem/diluição prática + IFRA
7. Tabela dos materiais mais usados em DIY (~50 materiais)
8. Caveats e conflitos de fonte (para calibração do motor)

---

## 1. FAMÍLIAS OLFATIVAS

### 1.1 Fragrance Wheel de Michael Edwards (1992; revisão 2021 "Oriental → Amber")

4 famílias principais, 14 sub-famílias. "Gourmand" e "musky" NÃO são famílias na roda — são sub-notas/acentos que atravessam várias famílias.

| Família principal | Sub-família | Descritores | Notas típicas | Equivalente clássico |
|---|---|---|---|---|
| **Floral** | Floral | flores recém-cortadas | rosa, jasmim, lírio | Floral |
| **Floral** | Soft Floral | macio, empoado, aldeídico | aldeídos, violeta, íris, sabão | Floral Aldeídico |
| **Floral** | Floral Amber (transicional) | quente, doce | flor de laranjeira, especiarias doces, baunilha | Floriental |
| **Amber** | Soft Amber | suave, luminoso | incenso, âmbar, especiarias delicadas | — |
| **Amber** | Amber | rico, sensual, exótico | resinas, baunilha, canela, cravo | Oriental |
| **Amber** | Woody Amber (transicional) | seco, potente | patchouli, sândalo, âmbar | Woody Oriental |
| **Woody** | Woods | limpo, refinado, transparente | cedro, vetiver, madeiras aromáticas | Woody |
| **Woody** | Mossy Woods | suave, doce, terroso, "chão de floresta" | oakmoss, acorde de âmbar, terra úmida | **Chypre** |
| **Woody** | Dry Woods | afiado, seco, esfumaçado | madeiras secas, couro, tabaco | Leather/Dry Woods |
| **Fresh** | Aromatic | limpo, herbáceo | lavanda, alecrim, manjericão, sálvia | **Fougère** |
| **Fresh** | Citrus | cítrico, ácido, revigorante | bergamota, limão, tangerina, grapefruit | Citrus/Hespéride |
| **Fresh** | Water (Aquatic) | frio, marinho, ozônico | mar, chuva, acordes marinhos | (moderno) |
| **Fresh** | Green | agudo, revigorante | galbanum, folhas amassadas, grama, chá verde | Green |
| **Fresh** | Fruity (transicional) | doce, suculento, comestível (não-cítrico) | frutas vermelhas, pêssego, maçã | Fruity |

Fontes: https://en.wikipedia.org/wiki/Fragrance_wheel ; https://www.islandercravings.com/michael-edwards-fragrance-wheel-guide/

### 1.2 Classificação clássica SFP (Société Française des Parfumeurs, 1984) — 7 famílias, 47 sub-famílias

Fonte primária autoritativa: https://www.sfp-parfumeurs.com/en/article/olfactive-families-introductions-62

**A — CITRUS / HESPÉRIDE (7 sub-famílias)**

| Cód | Sub-família | Notas |
|---|---|---|
| A1 | Citrus | bergamota, limão, laranja, tangerina, flor de laranjeira (extração da casca) |
| A2 | Citrus Especiado | + cravo, pimenta, noz-moscada, canela |
| A3 | Citrus Aromático | + tomilho, manjerona, alecrim, hortelã |
| A4 | Citrus Floral Chipre | + jasmim, notas amadeiradas e musgosas |
| A5 | Citrus Amadeirado | base amadeirada/empoada, citrus fraco |
| A6 | Citrus Floral Amadeirado | floral leve + amadeirado + citrus |
| A7 | Citrus Almiscarado | almíscares sintéticos + floral/amadeirado + citrus |

**B — FLORAL (9 sub-famílias)**

| Cód | Sub-família | Notas |
|---|---|---|
| B1 | Soliflore | flor única — jasmim, rosa, violeta, lilás, lírio-do-vale |
| B2 | Floral Almiscarado | almíscar, frutado, amadeirado, aldeídico + floral |
| B3 | Buquê Floral | múltiplas flores combinadas |
| B4 | Floral Aldeídico | aldeídos, animálico, empoado, amadeirado + floral |
| B5 | Floral Verde | galbanum, verde fresco + floral |
| B6 | Floral Frutado Amadeirado | pêssego, maçã, ameixa, damasco + floral/amadeirado |
| B7 | Floral Amadeirado | violeta, jasmim, rosa, amadeirado, empoado, baunilha |
| B8 | Floral Marinho | notas marinhas + buquê floral |
| B9 | Floral Frutado | damasco, framboesa, melão, lichia, pêra, maçã + floral (dominante desde 1995) |

**C — FOUGÈRE (6 sub-famílias)** — nome vem de "Fougère Royale" (Houbigant, 1882)

| Cód | Sub-família | Notas |
|---|---|---|
| C1 | Fougère | lavanda, amadeirado, oakmoss, cumarina, bergamota |
| C2 | Fougère Floral Amber | âmbar-labdanum, floral + fougère |
| C3 | Fougère Soft Amber | baunilha, âmbar + fougère |
| C4 | Fougère Especiado | cravo, pimenta + fougère |
| C5 | Fougère Aromático | tomilho, absinto, coentro, alecrim + fougère |
| C6 | Fougère Frutado | tons frutados + fougère |

**D — CHYPRÉ (7 sub-famílias)** — criada por François Coty em 1917

| Cód | Sub-família | Notas |
|---|---|---|
| D1 | Chypré | oakmoss, cisto/labdanum, patchouli, bergamota |
| D2 | Chypré Frutado | pêssego, ameixa, frutas exóticas + chypré |
| D3 | Chypré Floral Aldeídico | aldeídos, floral + chypré |
| D4 | Chypré Couro | couro, esfumaçado, madeira queimada, animálico, citrus + chypré |
| D5 | Chypré Aromático | lavanda, tomilho, absinto, zimbro, coentro + chypré |
| D6 | Chypré Verde | grama cortada, folhas amassadas + base quente |
| D7 | Chypré Floral | lírio-do-vale, rosa, jasmim + chypré |

**E — WOODY / AMADEIRADO (9 sub-famílias)**

| Cód | Sub-família | Notas |
|---|---|---|
| E1 | Woody | sândalo, patchouli, cedro, vetiver, lavanda, citrus |
| E2 | Woody Citrus Conífero | essências de pinho + topo cítrico |
| E3 | Woody Especiado | pimenta, noz-moscada, cravo, canela + amadeirado |
| E4 | Woody Amber | baunilha, feno, cumarina, cisto, labdanum, patchouli, sândalo |
| E5 | Woody Aromático | lavanda, verde, tomilho, absinto, mirto, alecrim, sálvia + amadeirado |
| E6 | Woody Especiado Couro | alcatrão de bétula, castóreo + woody-especiado |
| E7 | Woody Marinho | marinho, tomilho, artemísia + woody-aromático |
| E8 | Woody Frutado | notas frutadas modernas + amadeirado |
| E9 | Woody Almiscarado | almíscar, especiado, frutado, aromático, ambarado + amadeirado |

**F — AMBER / ORIENTAL (6 sub-famílias)**

| Cód | Sub-família | Notas |
|---|---|---|
| F1 | Soft Amber | baunilha, cisto, labdanum, notas animálicas, empoado |
| F2 | Amber Floral Especiado | cravina, especiado + âmbar |
| F3 | Amber Citrus | topo cítrico, às vezes floral + âmbar |
| F4 | Amber Floral Amadeirado | floral + amadeirado + âmbar |
| F5 | Floriental | fresco, especiado, floral + âmbar sutil |
| F6 | Amber Floral Frutado | maçã, pêra, damasco, framboesa, morango, ameixa, floral + âmbar |

**G — LEATHER / COURO (3 sub-famílias)** — popularizada por "Cuir de Russie"

| Cód | Sub-família | Notas |
|---|---|---|
| G1 | Leather | fumaça, madeira queimada, bétula prateada, tabaco + topo floral |
| G2 | Leather Floral | violeta, íris + couro |
| G3 | Leather Tabaco | mel, feno, tabaco Virgínia + couro/madeira |

Fontes: https://www.sfp-parfumeurs.com/en/article/olfactive-families-introductions-62 ; https://carrementbelle.com/blog/en/2020/09/16/the-7-olfactory-families/

### 1.3 Mapeamento Edwards ↔ Clássico (para o motor traduzir entre sistemas)

| Edwards | Clássico SFP |
|---|---|
| Amber | Oriental |
| Soft Floral | Floral Aldeídico |
| Mossy Woods | Chypre |
| Aromatic (Fresh) | Fougère |
| Dry Woods | Leather / parte de Woody |

O sistema SFP separa Fougère, Chypré e Leather como famílias de topo; a roda de Edwards as absorve como sub-famílias/sub-notas.

---

## 2. CLASSIFICAÇÃO POR VOLATILIDADE (TOPO / CORAÇÃO / BASE)

### 2.1 Critérios quantitativos (múltiplos sistemas — usar em conjunto)

| Critério | Topo | Coração | Base | Fonte |
|---|---|---|---|---|
| **Coeficiente de substantividade Poucher (CS, 1–100)** | CS < 15 | 15 ≤ CS ≤ 60 | CS > 60 | PMC3574685 |
| **Substantividade TGSC (SGS, em horas)** | baixa | intermediária | alta (até ≥400 h ≈ ≥16,7 dias) | PMC3574685 |
| **Índice de substantividade (SI, 0–100)** | SI≈0 | SI≈50 | SI≈100 | PMC3574685 |
| **Pressão de vapor a 25 °C (Torr)** | > 0,1 | 0,001–0,1 | < 0,001 | blogs técnicos (ver caveat) |
| **Peso molecular (regra prática)** | MW < 160 | MW 160–220 | MW > 220 | blog técnico (ver caveat) |
| **Ponto de ebulição** | baixo | médio | alto (evaporação lenta) | correlaciona com MW |

- **CS 15/60 e SGS-em-horas** são o sistema com respaldo **peer-reviewed** (Poucher). Fonte primária: https://pmc.ncbi.nlm.nih.gov/articles/PMC3574685/
- Cortes de MW (160/220) e limiares de Torr são racionalizações de blogs técnicos, autoconsistentes mas **não** de fonte primária única. Ver caveat 8.
- Método CS: quantidade fixa em fita de teste; cronometra-se por quanto tempo a fita retém o odor típico. Cobre ~330 materiais.
- Correlações reportadas: SI×CS r=0,88; SI×SGS r=0,83; "frescor"×SI r=−0,85 (fresco = baixa substantividade = perfil de topo).

Outras métricas úteis:
- **Índice de Evaporação (EI)** = mg evaporados por hora a partir de 1 g de óleo.
- **Temperatura**: cada +10 °C ~dobra a taxa de evaporação; diferencial de +15–20 °C → ~2,5–3× mais rápido. (https://houseofsultan.in/blog/molecular-weight-perfume-longevity)

### 2.2 Tempos aproximados de evaporação por categoria (ordem de grandeza — fontes divergem)

| Categoria | Duração na pele | Observação |
|---|---|---|
| Topo | ~5–20 min (algumas fontes até 2 h; "15–30 min" no paper de engenharia) | impacto inicial |
| Coração | ~2–5 h (paper: "3–4 h") | corpo/tema |
| Base | ~4 h a 12+ h na pele; em fita SGS até vários dias (≥16,7 dias) | fixação/rastro |

Fontes: https://pmc.ncbi.nlm.nih.gov/articles/PMC8196857/ ; https://houseofsultan.in/blog/molecular-weight-perfume-longevity ; https://us.clivechristian.com/blogs/perfume-facts/what-are-the-top-heart-and-base-notes-in-a-perfume

### 2.3 Exemplos de materiais com MW e longevidade (25 °C, na pele)

Fonte da tabela: https://houseofsultan.in/blog/molecular-weight-perfume-longevity

| Material | MW (g/mol) | Nota | Longevidade @25 °C |
|---|---|---|---|
| Limoneno (citrus) | 136,23 | Topo | 30–60 min |
| Mirceno | ~136 | Topo | 30–60 min |
| Etil butirato | (PE 121 °C) | Topo | vaporização mais rápida |
| Linalol | 154,25 | Topo/Coração | 2–4 h |
| Geraniol | 154,25 | Coração | 3–5 h |
| Eugenol | 164,20 | Coração | 4–6 h |
| Linalil acetato | 196,29 | Coração | 4–6 h |
| α-Santalol (sândalo) | 220,35 | Base | 12–24 h |
| Cedrol (cedro) | 222,37 | Base | 12–24 h |
| Patchoulol | 222,37 | Base | 24+ h |
| Hexil cinamaldeído | (PE 308 °C) | Base | vaporização mais lenta |

**Fixadores/âncoras sintéticos:** Iso E Super MW 234 (~15+ h); Ambroxan MW 236 (~20+ h); Galaxolide MW 258 (~24+ h).

**Escada de ponto de ebulição (sobe com MW, evaporação desacelera):** etil butirato 121 °C → mirceno 167 °C → limoneno 176 °C → etil heptanoato 188 °C → etil octanoato 208 °C → etil decanoato 245 °C → hexil cinamaldeído 308 °C.

**Regra por famílias:** Topo = citrus, aldeídos, ervas leves/hortelã. Coração = florais, especiarias (geraniol, eugenol, linalil acetato). Base = madeiras (santalol, cedrol), resinas/âmbar (ambroxan), almíscares (galaxolide), oud, baunilha.

---

## 3. FORÇA ODORÍFERA E EFEITO DA DILUIÇÃO

### 3.1 Threshold de detecção (ODT) — quanto menor, mais forte

- Regra: material de "alto impacto" se ODT < 1 ppm; "muito forte" se < 10 ppb. Métrica padrão: **OAV (Odor Activity Value) = concentração / ODT**; só contribui ao cheiro quando OAV ≥ 1. Fonte: https://www.sciencedirect.com/topics/medicine-and-dentistry/odor-detection-threshold

| Material | ODT (aprox.) | Perfil | Fonte |
|---|---|---|---|
| Tióis (classe) | 0,5–1 ng/L (sub-ppb) | os mais potentes | 10.3390/molecules24132472 |
| β-Damascenona | ~0,002 ppb em água | rosa/frutado — dos mais potentes | grokipedia/damascenone |
| Indol | ~5,02 ng/L = 1,05 ppbV | animálico/floral | S030147971630295X |
| Decanal (aldeído C-10) | ~0,1–2 ppb (varia até 20×) | casca de laranja cerosa | diverdi.colostate.edu |
| γ-Nonalactona | ~30 ppb em água | coco/cremoso | PMC6255368 |
| β-Ionona, Vanilina | baixo (potentes) | violeta / baunilha | ResearchGate |

### 3.2 Materiais que MUDAM de caráter / só ficam bons diluídos

| Material | Concentrado | Diluído | Uso prático |
|---|---|---|---|
| **Indol** | pútrido/fecal/naftalina | floral (jasmim, flor de laranjeira) | manusear a 10% em DEP; <0,1% no final. Jasmim absoluto natural ~2,5% indol |
| **Civetone / civet** | animálico intenso, fecal | <0,01% → almíscar limpo, meloso, quase floral | ≤10% em solução |
| **Aldeídos alifáticos C8–C12** | afiado/gorduroso/"gritante" | 1–10% revela faceta sabão-cítrico-floral | diluir 1% ou 10% |

Fontes: https://www.scentspiracy.com/fragrance-ingredients/p/indol ; https://www.scentspiracy.com/fragrance-ingredients/p/civetone ; https://cafleurebon.com/indole-in-perfumery-fecal-florals/

### 3.3 Relação NÃO-LINEAR quantidade → intensidade percebida

**Lei de potência de Stevens:** `ψ = k · I^a` — ψ = intensidade percebida, I = concentração, a = expoente. Para olfato **a < 1 (compressivo)**: dobrar a concentração produz MENOS que o dobro de intensidade.

| Odorante | Expoente a | Fonte |
|---|---|---|
| Heptano (valor canônico do olfato) | 0,6 | Wikipedia Stevens' power law |
| Acetato de amila | 0,39–0,57 | Engen 1963 |
| Faixa geral olfato | ~0,2–0,7 | Springer BF03212789 |

- **Interpretação:** 10× na concentração → só ~10^0,6 ≈ 4× na intensidade (heptano); com a≈0,5, 10× → ~3×.
- **Aldeídos (expoente depende do tamanho da cadeia):** `PLE = 0,36 + 0,33·exp(−0,3n)` (n = nº de átomos pesados) → curtos ≈0,69, longos ≈0,36. Threshold: `pOL = 8,5·[1 − exp(−0,39·n^1,4)]` (R²=0,90). Fonte: https://pmc.ncbi.nlm.nih.gov/articles/PMC3355402/
- **Weber-Fechner (logarítmica):** JND é fração constante do estímulo → passos perceptivos iguais = passos multiplicativos iguais de concentração. Consequência: em baixa concentração pequenas mudanças de dose mexem muito na intensidade; em alta concentração é preciso aumento multiplicativo grande para ser notado.

### 3.4 Modelo prático quantidade→intensidade (para o motor)

```
1. OAV_i          = fração_peso_i / ODT_i          (contribui se OAV ≥ 1)
2. loudness_i     ≈ k · (fração_peso_i / ODT_i)^a  (a ≈ 0,5 default olfato)
3. Em mistura: intensidade é SUB-ADITIVA — a soma das loudness individuais
   SUPERESTIMA a mistura (mistura é mais "quieta" que a soma).
```

- Por isso materiais-traço potentes (indol, damascenona, aldeídos) dominam a fórmula muito além de sua fração em peso.
- Fontes: https://en.wikipedia.org/wiki/Stevens's_power_law ; https://link.springer.com/article/10.3758/BF03212789 ; mistura sub-aditiva: https://www.researchgate.net/publication/229884045

---

## 4. MONTAGEM DE ACORDES (RECEITAS COM PROPORÇÕES)

### 4.1 Princípios de blending

- **Estrutura clássica de composição:** Base ~55% + Modificadores/Coração ~20% + Topo ~25%. Base = dominante (materiais de baixa volatilidade que definem o caráter, ex. oakmoss); Modificadores = coração (suavizam a base, dão nuance floral/animálica); Topo = blenders (voláteis, impacto fresco). Fonte: https://olfactiveaesthetics.com/fragrance-building-principles-method-of-perfume-creation/
- **Método Jean Carles:** testar dois materiais em razões incrementais (9:1, 8:2, 7:3, 6:4, 5:5), escolher a melhor, repetir com um terceiro; unir dois acordes com "modificadores" que fazem a ponte. Carles criava bases pré-montadas ("coeurs") como blocos de construção. PDF completo: http://quintescential.ca/wp-content/uploads/2014/04/Jean-Carles-Complete.pdf

### 4.2 Receitas de acordes clássicos (partes ou %)

> Confiabilidade: Perfumer's Apprentice (PA) e The Good Scents Company = mais autoritativas (profissionais, publicadas). Basenotes/Reddit = hobbyistas, tratar como ponto de partida.

**FOUGÈRE**

| Receita | Componentes (partes) | Fonte |
|---|---|---|
| Básico | Lavanda 14, Cumarina 12, Vetiver 10, Bergamota 8, Oakmoss abs 6, Rosa 5, Jasmim 4, Isoamil salicilato 3, Patchouli 2, Gerânio 2 | basenotes 403994 |
| Iniciante | Bergamota 45, Lavanda 25, Cumarina 9, Gerânio 7, Patchouli 4, Tonalide 4, Amil salicilato 3, Oakmoss 3 | basenotes 284136 |
| Comercial (Firmenich-style) | Lavanda 115, Bergamota FCF 105, Cumarina 105, Linalil acetato 70, Metil ionona 42, Vetiver 40, Anisil acetato 35, Isobutil salicilato 35, Oakmoss abs 35 | basenotes 533685 |

**ÂMBAR / ORIENTAL**

| Receita | Componentes | Fonte |
|---|---|---|
| Aftel (clássico) | Benzoin abs **20** : Labdanum abs **5** : Baunilha abs **1** (20:5:1) | idreamofperfume 2015 |
| Sintético-apoiado | 20:5:1 (benzoin:labdanum:baunilha) + ambrettolide, cetalox, ambrox DL 1–2% cada + mirra/olíbano CO2 + patchouli ~5% | basenotes 441919 |

**CHYPRE**

| Receita | Componentes | Fonte |
|---|---|---|
| Jean Carles (55/20/25) | Base 55% (Oakmoss abs 6, Cumarina 4, Musk cetona 1) + Modif 20% (Jasmim abs 3, Civet sol.10% 1) + Topo 25% (Laranja doce 4, Bergamota 1) | olfactiveaesthetics |
| Básico (por 100) | Oakmoss 10, Bergamota 10, Patchouli 5, Tangerina 5, Lima 3, Fir Balsam abs 2 | basenotes 295647 |
| Floral iniciante | Bergamota 15, Sândalo 8, Vetiver 6, Base de rosa 6, Oakmoss 5, Base de jasmim 5, Patchouli 5, γ-metil ionona 3, Musk cetona 3, Sálvia sclareia 2 | basenotes 444621 |

**MARINHO / AQUÁTICO**

| Receita | Componentes | Fonte |
|---|---|---|
| PA marine (~100–114 g) | Hedione 58, Galaxolide 50% 28, Iso E Super 8, Habanolide 6, Etil linalol 6, Helional 4, Ambroxan 2, Calone 2 | PA marine_accord |

Nota: Calone + Helional dão profundidade verde-ozônica; dihidromirceno l dá lift cítrico-fresco; acorde marinho ~25–30% do total.

**GOURMAND**

| Receita | Componentes | Fonte |
|---|---|---|
| Marshmallow | Etil vanilina : Etil maltol entre 10:1 e 10:2 | basenotes 570125 |
| Algodão-doce | Etil maltol 5 : Etil vanilina 25 : Heliotropina 1 | basenotes 570125 |
| Doce (dose final) | Etil maltol 3,61% + Vanilina 3,61% + Etil vanilina 1,44% | basenotes 481953 |

Nota: etil maltol é 4–6× mais forte que maltol; diluir a 5–10% antes de usar; final típico 0,1–2%.

**FRUTADO (lactonas)**

- γ-undecalactona (pêssego): 0,05–0,5% no concentrado; acima de 0,2% fica oleoso/pesado.
- γ-dodecalactona: pêssego/damasco/tropical 0,05–0,5%; florais cremosos 0,01–0,2%; gourmand/lácteo 0,1–1%.
- Fontes: scentspiracy undecalactone-gamma ; scentspiracy gamma-dodecalactone

**FLORAL BRANCO — JASMIM**

| Receita | Componentes (%) | Fonte |
|---|---|---|
| Acorde profissional | Benzil acetato 28, Hedione 18, Linalol 12, Hedione HC 6, PEA 5, Benzil álcool 4 (+ indol traço) | olfactiveaesthetics jasmine |
| Faixas prática | benzil acetato 25–35, hedione 15–20, linalol 8–20, indol 0,1–0,3 | idem |
| Alvo natural (jasmim sambac abs) | benzil acetato 64,02, linalol 17,40, metil antranilato 3,37, indol 1,64, hedione 0,98 | idem |

**FLORAL BRANCO — TUBEROSA**

| Receita | Componentes (%) | Fonte |
|---|---|---|
| Wells & Billot (1981) | Benzil acetato 24,5, Benzil álcool 22,5, Metil antranilato 22,2, Metil salicilato 8,0, γ-nonalactona 8,0, γ-undecalactona 8,0, óleo wintergreen 4,0, Jasmim abs 1,6, Tuberosa abs 1,2 | olfactiveaesthetics tuberose |
| David Ruskin | Hidroxicitronelal 30, Metil antranilato 20, Benzil acetato 10, Benzil salicilato 10, Linalol 7, γ-nonalactona 5, Ylang 4, Metil benzoato 4, Metil salicilato 4, Tolu 2, Aurantiol 1, Metil heptina carbonato 1, óleo semente aipo 0,9, γ-octalactona 0,5, Metil tuberato 0,5, Vanilina 0,1 | idem |

**FLORAL BRANCO — GARDÊNIA**

| Receita | Componentes | Fonte |
|---|---|---|
| Poucher | Base tuberosa 40, Base flor laranjeira 20, Base jasmim 20, Ylang 5, Bergamota 4, Base cravina 3, Nerol 3, Linalol 2, Estiralil acetato 2, Aldeído C12 MNA 1 | basenotes 370608 |
| Ellena (minimalista) | Aldeído C-18 + estiralil acetato (Gardenol) + metil antranilato (3 materiais) | idem |

**ROSA**

| Receita | Componentes | Fonte |
|---|---|---|
| PA rose | Peonile 40, Dimetil benzil carbinil acetato 30, Geranil acetato 25, Fenil etil fenil acetato 20, Citronelol 20, Undecavertol 6, Fenil etil acetato 5, Rose oxide 3, Damascone delta 2 | TGSC dm1109511 / basenotes 537044 |
| Alvo natural | Citronelol 30–40%, Geraniol ~20%, PEA ~1–3% (mais em absolutos), rose oxide traço | premierepeau geraniol |

**ALMÍSCAR (MUSK)**

| Receita | Componentes | Fonte |
|---|---|---|
| Macrocíclico | Exaltolide 60, Etileno brassilato 20, Ambrettolide 15, Habanolide 6 | basenotes 538309 |
| Ravageur-style | Galaxolide 144, Tonalide 48, Exaltolide 39, Etileno brassilato 9 (~24% do total) | basenotes 538309 p2 |
| Apoio aquático | Galaxolide 50% DPG 56, Etileno brassilato 50, Habanolide 22, Cashmeran 7 | idem |

**AMADEIRADO / SÂNDALO**

| Receita | Componentes | Fonte |
|---|---|---|
| PA sandalwood (por 1000) | Javanol 320, Metil cedril cetona 240, Ebanol 240, Dihidro ionona beta 140, óleo guaiacwood 35, Metil laitone 10% 9, óleo patchouli 8, Álcool de folha 10% 8 | PA sandalwood |
| Faixas gerais | Polysantol 10–35%, Ebanol 10–35%, Sandela <30%, Mysore Acetate <20%, Javanol <20%, Firsantol <20%, Metil laitone <2% | basenotes 471444 |

---

## 5. PROJEÇÃO/SILLAGE vs TENACIDADE/FIXAÇÃO

### 5.1 O que dirige cada propriedade

| Propriedade | Drivers | Fonte |
|---|---|---|
| **Projeção/Sillage** | alta volatilidade + baixo threshold odorífero ("quanto menor o threshold e maior a volatilidade, maior o sillage"); moléculas leves evaporam rápido e viajam longe | benscents diffusion ; smytten |
| **Longevidade/Fixação** | baixa volatilidade + alto peso molecular; ligações reversíveis (bases de Schiff, ligações-H); alta substantividade | olfactiveaesthetics fixatives |

Substantividade mensurável (TGSC, 10% em DPG): Ambroxan >400 h; Vanilina ~400 h; Cumarina ~364 h; Cashmeran ~48 h.

### 5.2 Fixadores — definição e tipos

Fixador = retarda a evaporação das moléculas voláteis, estende longevidade e estabiliza a composição.

| Tipo | Exemplos | Perfil / uso |
|---|---|---|
| Resinas/bálsamos | benzoin, labdanum, bálsamo do Peru | benzoin >24 h; labdanum 0,1–1% |
| Almíscares | Galaxolide (policíclico), Habanolide/Globalide, Muscone (macrocíclicos) | base, fixação |
| Animálicos | civet, castóreo | traço |
| Amplificadores âmbar/woody sintéticos | Iso E Super, Ambroxan | fazem ponte topo↔base |

### 5.3 Materiais "radiantes" de alta difusão + longevidade em dias

| Material | Difusão/Longevidade | Fonte |
|---|---|---|
| Ambroxan | 8–12 h na pele, forte difusão, nota + fixador (ponte topo–base); IFRA sem restrição (51ª) | aromatick ; TGSC rw1016071 |
| Iso E Super | "halo/glow" âmbar-amadeirado, dá corpo e difusão aveludada; base, força média | olfactorian iso-e-super |
| Sandalore | "poderoso, difusivo e extremamente tenaz", ~3 semanas em fita | PA sandalore |
| Cashmeran | ~48 h de substantividade | scentspiracy cashmeran |

---

## 6. DOSAGEM / DILUIÇÃO PRÁTICA + IFRA

### 6.1 Escada de diluição padrão DIY

- Diluir a **10%**, depois 10% disso = **1%** → estoques de trabalho a 100 / 10 / 1%. Fonte: basenotes 468173
- **Por que diluir:** materiais muito fortes (aldeídos, indol) não podem ser dosados neat com precisão; diluição revela o caráter real na fita e facilita manuseio.
- **Materiais que exigem diluição pesada:** aldeídos (avaliar a 1%); indol (solução 1%, uso final 0,1–0,5%); casos extremos como geosmina a 0,001%.
- **TGSC "avaliar a 1% ou menos"** (= muito fortes): Ambroxan, indol, rose oxide, α/β-damascone.
- **Estrutura de concentrado:** notas de base ~15–30% do blend.

### 6.2 Limites IFRA — Categoria 4 (fine fragrance / perfume, 51ª Emenda)

> "Restrição" = % máx do componente no PRODUTO ACABADO, contando o componente venha ele adicionado puro ou dentro de um óleo essencial. Alguns têm "especificação" (valor de peróxido) em vez de teto de %.

| Material | Limite Cat 4 | Notas | Fonte |
|---|---|---|---|
| Oakmoss / tree moss | **0,10%** | cumulativo; atranol & cloroatranol cada <100 ppm | perfumersworld oakmoss PDF |
| Isoeugenol | **0,11%** | | scentspiracy IFRA |
| Cinamaldeído (cinnamal) | **0,25%** (conflito: 0,05%) | verificar norma atual | scentspiracy |
| Citral | **0,60%** | | TGSC rw1003432 |
| Cumarina | **1,50%** (pode ter caído p/ ~1,0% na 51ª) | | TGSC rw1003832 |
| Hidroxicitronelal | **2,10%** | | scentspiracy IFRA |
| Eugenol | **2,50%** | | TGSC rw1004991 |
| Geraniol | **4,70%** | | perfumersworld geraniol PDF |
| Citronelol | **12%** | | TGSC rw1007032 |
| Rose ketones (α/β-damascone + damascenona, orçamento compartilhado) | **0,043%** | | TGSC rw1006041 |
| Iso E Super | ~**20%** | restrito | olfactorian |
| Metil ionona (mix isômeros) | **30%** | | IFRA STD 063 |
| Cashmeran | **3,8%** | | scentspiracy |
| Galaxolide | **1,5%** leave-on | | scentspiracy |
| Bergamota (expressa) | **0,40%** | fototóxico (bergapteno); FCF/livre de bergapteno ~sem restrição | TGSC es1039621 |
| Limão (prensado a frio) | ~**2,0%** leave-on | | caperfume lemon |

**PROIBIDOS (banidos EU/IFRA):**
- **Lilial** (butylphenyl methylpropional, CAS 80-54-6) — banido em cosméticos EU desde 01/03/2022 (tox. reprodutiva).
- **HICC / Lyral** (CAS 31906-04-4) — Anexo II proibido (EU 2021/1902), sensibilizante.
- (Tabelas antigas com 0,20%/1,40% para estes estão DESATUALIZADAS.)

**Só especificação (sem teto de %):** Linalol e Limoneno — regidos por limite de valor de peróxido, não por concentração.

---

## 7. TABELA DE MATERIAIS MAIS USADOS EM DIY (~50)

> Colunas: descritor | família | nota | força | uso típico % (concentrado) | IFRA Cat 4.
> "Força" e "nota" de Scentspiracy/Fraterworks são editoriais; o proxy mais objetivo de força é o TGSC "avaliar a X%".

### Citrus / topos frescos

| Material | Descritor | Família | Nota | Força | Uso % | IFRA C4 |
|---|---|---|---|---|---|---|
| Bergamota | cítrico-floral, suave | Citrus | Topo | Média | até ~30% | 0,40% (expressa) |
| Limão | zesty afiado limpo | Citrus | Topo | Alta | 1–3% (5–10% colônia) | ~2,0% |
| Laranja doce | brilhante doce | Citrus | Topo | Baixa-média | 1–5% (até 30% em acordes) | óleo livre |
| Dihidromirceno l | lima fresca, colônia limpa, potente | Citrus | Topo/coração | Alta | até 75% (méd ~2,8%) | nenhum |
| Limoneno | casca de laranja | Citrus | Topo | Média | 0,3–5,7% (máx 20%) | spec (peróxido) |
| Citral | limão afiado | Citrus | Topo | Alta | limitado por IFRA | 0,60% |

### Aromáticos / herbais

| Material | Descritor | Família | Nota | Força | Uso % | IFRA C4 |
|---|---|---|---|---|---|---|
| Lavanda | floral-herbal amadeirado | Aromático/fougère | Topo | Média | componente-mor de fougère | óleo livre (spec linalol) |
| Linalol | floral-amadeirado cítrico | Floral | Coração (lift topo) | Média | ~2,8% méd | spec peróxido |
| Linalil acetato | verde doce bergamota-lavanda | Floral-citrus | Topo-coração | Média | 0,5–10% (máx 15%) | nenhum |

### Rosa / coração floral

| Material | Descritor | Família | Nota | Força | Uso % | IFRA C4 |
|---|---|---|---|---|---|---|
| Gerânio | rosado verde mentolado | Floral/rosado | Coração | Média | — | via citronelol/geraniol |
| Geraniol | rosa doce ceroso | Floral/rosado | Coração | Média | — | 4,70% |
| Citronelol | botão de rosa ceroso | Floral/rosado | Coração | Média | 0,05–3% | 12% |
| PEA (feniletil álcool) | água de rosas, mel | Rosado/floral | Coração | Baixa-média | 5–20%+ | nenhum |
| Rose oxide | rosado verde metálico | Floral-verde | Topo | **Muito alta** | ~0,1% ou menos (teto 2%) | nenhum |
| α-damascone | rosa maçã frutado | Frutado-floral rosa | Coração | **Muito alta** | ~0,1–0,5% | 0,043% (rose ketone) |
| β-damascone | frutado berry ameixa rosa | Frutado-floral rosa | Coração | **Muito alta** | ~0,2% | 0,043% (rose ketone) |
| α-ionona | violeta íris amadeirada | Floral (violeta) | Coração | Média | até 15% | nenhum |
| β-ionona | violeta amadeirada berry | Floral (violeta) | Coração | Média | até 15% | nenhum |
| Metil ionona | violeta-íris empoada | Floral/íris | Ponte base | Média | méd build ~8% | 30% |

### Jasmim / floral branco

| Material | Descritor | Família | Nota | Força | Uso % | IFRA C4 |
|---|---|---|---|---|---|---|
| Hedione (metil dihidrojasmonato) | jasmim radiante transparente | Floral | Coração | Baixa-média | 2–15% (até 35%+); efeito fixador | nenhum |
| Benzil acetato | doce frutado jasmim | Floral-frutado | Topo-coração | Média | traço–5% (teto 30%) | nenhum |
| Jasmim absoluto | rico ceroso chá animálico | Floral branco | Coração | Alta | 0,5–5% | 0,60% |
| Indol | animálico fecal / floral em traço | Animálico | Base | Alta | 0,01–0,5% (como sol.1%) | nenhum |

### Aquáticos / verdes sintéticos

| Material | Descritor | Família | Nota | Força | Uso % | IFRA C4 |
|---|---|---|---|---|---|---|
| Calone 1951 | ozônio marinho melancia | Marinho-aquático | Topo-coração | Alta | até 0,5% | nenhum |
| Helional | aquático-verde melão ciclâmen | Floral-aquático | Coração | Média | 0,1–1% | conflito 2,6% vs 5,30% |

### Amadeirados / âmbar bases

| Material | Descritor | Família | Nota | Força | Uso % | IFRA C4 |
|---|---|---|---|---|---|---|
| Iso E Super | âmbar-amadeirado cedro, radiante | Woody-amber | Base | Média | 5–25% (até 90%) | ~20% |
| Patchouli | amadeirado terroso balsâmico | Woody | Base | Média-alta | até 10% | nenhum |
| Vetiver | terroso amadeirado esfumaçado | Woody/terroso | Base | Muito tenaz | vários % | nenhum |
| Cedro (Virgínia) | seco amadeirado balsâmico | Woody | Base | Média | uso fixador | livre (Virgínia) |
| Sândalo (S. album) | cremoso suave amadeirado lactônico | Woody | Base | Média-alta | — | sem restrição |
| Javanol | sândalo/rosa cremoso potente | Woody | Base | **Extrema** | traço–2% (0,02–0,1% booster) | nenhum (51ª) |
| Sandalore | sândalo quente doce | Woody | Base | Alta, tenaz | 0,5–10% | — |
| Cashmeran | almiscarado-woody-especiado aveludado | Woody-musk-amber | Meio-base | Forte | ~2% | 3,8% |
| Ambroxan | ambergris seco doce | Amber-woody | Base | Muito alta | 0,1–1% (até 10% "ambrox bombs") | sem restrição |
| Labdanum/cisto | balsâmico âmbar couro | Amber/oriental | Base | Muito forte | 0,1–3% | limitado por alérgenos |
| Benzoin (Siam) | doce vanílico balsâmico | Balsâmico/amber | Base (>24 h) | Persistente | 1–5% | limitado por alérgenos |
| Oakmoss absoluto | musgoso terroso chão-de-floresta | Chypre/mossy | Base | Alta | limitado IFRA | 0,10% |

### Almíscares

| Material | Descritor | Família | Nota | Força | Uso % | IFRA C4 |
|---|---|---|---|---|---|---|
| Galaxolide | doce limpo woody musk-lavanderia | Musk | Base | Média-forte | até ~10% | 1,5% leave-on |
| Habanolide/Globalide | musk metálico limpo "linho passado" | Musk macrocíclico | Base | Alta (thresh ~0,04 µg/L) | 0,5–5% (ótimo 1–3%) | ~sem restrição |
| Muscone | musk animálico empoado doce, tenacidade excepcional | Musk macrocíclico | Base | Alta | 0,4–2% | — |

### Gourmand / doces

| Material | Descritor | Família | Nota | Força | Uso % | IFRA C4 |
|---|---|---|---|---|---|---|
| Vanilina | baunilha doce cremosa | Baunilha/gourmand | Base (~400 h) | Alta | até ~8% | sem restrição |
| Etil vanilina | baunilha caramelo intensa (3–4× vanilina) | Baunilha/gourmand | Base | Alta | até 8% | sem restrição |
| Etil maltol | algodão-doce caramelo | Gourmand | Ponte | Alta (4–6× maltol) | 0,05–0,3% (teto 4%) | nenhum |
| Cumarina | feno/tonka doce | Cumarínico/fougère | Base (~364 h) | Média | 1–3% | 1,50% |
| Tonka absoluto | cumarínico quente noz tabaco | Tonka/amber | Base | Alta | 0,5–2% | via cumarina |

### Especiarias

| Material | Descritor | Família | Nota | Força | Uso % | IFRA C4 |
|---|---|---|---|---|---|---|
| Eugenol | cravo especiado fenólico | Especiado/fenólico | Coração-base | Média-forte | — | 2,5% |
| Cinamaldeído | canela balsâmica | Especiado/oriental | Coração-base | Muito alta | 0,1–2% | 0,25% (conflito 0,05%) |

### Aldeídos graxos (todos IFRA-limitados ~1–2% concentrado)

| Material | Descritor | Família | Nota | Força | Uso % | IFRA C4 |
|---|---|---|---|---|---|---|
| C-10 (decanal) | casca de laranja ceroso cítrico | Aldeídico | Coração | Alta | sub-1% diluído | máx 1,0% concentr. |
| C-11 undecilênico | ceroso rosa cítrico sabão | Aldeídico | Topo-coração | Alta | — | 1,0% |
| C-12 láurico (dodecanal) | sabão ceroso floral-limpo | Aldeídico | Coração-base | Alta | — | 2,0% |
| C-12 MNA (2-metilundecanal) | fresco âmbar musgoso metálico | Aldeídico | Topo | Alta | — | 2,0% |

Fontes desta seção: páginas por material em thegoodscentscompany.com/data/, shop.perfumersapprentice.com, scentspiracy.com, olfactorian.com, fraterworks.com, caperfume.com (URLs específicas em cada linha das notas de pesquisa).

---

## 8. CAVEATS E CONFLITOS DE FONTE (para calibração do motor)

1. **Cortes de MW (160/220) e limiares de pressão de vapor (Torr)** são racionalizações de blogs técnicos, autoconsistentes mas SEM fonte primária única. A âncora peer-reviewed é o sistema **CS 15/60 + SGS-em-horas** de Poucher (PMC3574685). Trate MW/Torr como heurística secundária.
2. **Tempos de evaporação divergem muito** entre fontes (topo "5–20 min" vs "15 min–2 h"). Use como ordem de grandeza, não valor preciso. Fronteiras topo/coração/base são propositalmente difusas (ex.: linalol é topo OU coração conforme a fonte).
3. **ODT varia até ~20×** entre laboratórios/meios (ar vs água) e não são intercambiáveis. Ex.: decanal 0,1 vs 2 ppb no mesmo lab.
4. **Mistura é sub-aditiva:** o modelo de Stevens de molécula única SUPERESTIMA a intensidade em blends. Aplique fator de desconto para misturas.
5. **IFRA precisa de verificação contra os PDFs oficiais da 51ª Emenda.** Vários números vieram de reafirmações das Emendas 49–50 ou de snippets:
   - Cumarina 1,50% (pode ter caído p/ ~1,0%);
   - Cinamaldeído 0,25% vs 0,05% (conflito);
   - Helional 2,6% (Olfactorian) vs 5,30% (TGSC).
6. **HICC/Lyral e Lilial estão PROIBIDOS** — tabelas antigas com 0,20%/1,40% estão desatualizadas.
7. **Galaxolide "até 20%+" NÃO se sustenta** — uso típico em fine fragrance ~10%, IFRA Cat 4 leave-on 1,5%.
8. **"Nota" e "força"** de Scentspiracy/Fraterworks são editoriais, não medidas em lab. O proxy mais objetivo de força é o TGSC "avaliar a X% de solução". Os tetos "até X% do concentrado" (TGSC/PA) são máximas do Code of Practice IFRA, geralmente mais amplas que os limites estritos de sensibilizantes da Cat 4.
9. **Receitas Basenotes/Reddit são de hobbyistas** — proporções variam; use como ponto de partida. Referências "clássicas" mais citadas: âmbar 20:5:1 (Aftel), chypre 55/20/25 (Jean Carles), acordes PA (marine/sandalwood/rose).

---

## FONTES PRINCIPAIS

**Sistemas/classificação:** en.wikipedia.org/wiki/Fragrance_wheel ; sfp-parfumeurs.com ; carrementbelle.com ; islandercravings.com
**Volatilidade/substantividade:** PMC3574685 (Poucher CS/SI/SGS — primária) ; PMC8196857 (engenharia) ; houseofsultan.in
**Threshold/psicofísica:** sciencedirect ODT ; PMC3355402 (equações de aldeídos) ; en.wikipedia.org/wiki/Stevens's_power_law ; link.springer.com/BF03212789 ; scentspiracy.com (indol, civet)
**Acordes:** olfactiveaesthetics.com ; shop.perfumersapprentice.com/formulas ; thegoodscentscompany.com/demos ; basenotes.com (threads) ; quintescential.ca (Jean Carles PDF)
**Sillage/fixação/dosagem/materiais:** thegoodscentscompany.com/data ; scentspiracy.com ; olfactorian.com ; benscents.com ; ifrafragrance.org (STDs) ; perfumersworld.com (IFRA PDFs)
**Livros de referência citados:** Poucher's *Perfumes, Cosmetics and Soaps*; Calkin & Jellinek *Perfumery: Practice and Principles*; Sell *Scent and Chemistry*.
