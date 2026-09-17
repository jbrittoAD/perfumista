# -*- coding: utf-8 -*-
"""
deck_uses_pt.py — Tradução PT-BR curada dos `key_uses` do banco.

O campo `key_uses` do materials.db tem o melhor conteúdo técnico que existe no
projeto (aplicação prática + número de IFRA), mas está todo em inglês. Como o
app é em português e esse texto vira o bloco "Para que serve" da carta, as 157
strings distintas foram traduzidas à mão — não por máquina — preservando os
percentuais de IFRA exatamente como estavam.

Chave = a string em inglês, exata, como vem do banco. Material sem entrada aqui
cai no texto gerado por template (ver build_deck.py:derive_uses).
"""

USES_PT = {
"'Aldehyde C-14' is actually a peach lactone; creamy peach (Mitsouko). Not IFRA-restricted.":
    "Apesar do nome, não é aldeído: é uma lactona de pêssego, cremosa e aveludada (a assinatura de Mitsouko). Sem restrição IFRA.",
"'Aldehyde C-16' is a glycidate ester = strawberry note. Fruity accords. Verify IFRA.":
    "Também não é aldeído — é um éster glicidato com cheiro de morango. Base de acordes frutados. Confira a IFRA.",
"3-4x stronger, more caramellic than vanillin. Gourmand/vanilla bases. Not IFRA-restricted.":
    "3 a 4× mais forte e mais caramelada que a vanilina. Bases gourmand e de baunilha. Sem restrição IFRA.",
"Abstract velvety musk-woody-spicy; 'cashmere' base warmth. IFRA Restriction historically (~3-4% Cat 4) — verify current.":
    "Almiscarado-amadeirado-especiado aveludado e abstrato: o calor 'cashmere' da base. Historicamente com restrição IFRA (~3–4% Cat 4) — confira a vigente.",
"Almond-vanilla-cherry powder; heliotrope and gourmand accords. Not IFRA-restricted (verify).":
    "Pó de amêndoa, baunilha e cereja. Acordes de heliotrópio e gourmand. Sem restrição IFRA (confirme).",
"Anise/licorice; aromatic and gourmand-spice accords. IFRA Restriction — verify Cat 4.":
    "Anis e alcaçuz. Acordes aromáticos e de especiaria gourmand. Tem restrição IFRA — confira a Cat 4.",
"Anisic-green herbal top; aromatic masculines. Specification on methyl chavicol/methyl eugenol content.":
    "Topo herbal anisado e verde. Masculinos aromáticos. Tem especificação IFRA para o teor de metil chavicol / metil eugenol.",
"Aromatic ambery-herbal; masculine and fougère hearts (source of sclareol->Ambrox). Not IFRA-restricted.":
    "Aromático herbal-ambarado. Coração de masculinos e fougères (é daqui que sai o esclareol que vira Ambrox). Sem restrição IFRA.",
"Aromatic herbal top; fougère and aromatic accords. Not IFRA-restricted.":
    "Topo herbal aromático. Acordes fougère e aromáticos. Sem restrição IFRA.",
"Backbone of colognes, fougères, chypres. IFRA Restriction (phototoxic furocoumarins); Cat 4 ~0.4% for expressed oil unless bergapten-reduced (FCF) which is exempt.":
    "A espinha das colônias, fougères e chipres. Restrição IFRA por fototoxicidade (furocumarinas): ~0,4% Cat 4 para o óleo prensado — a versão sem bergapteno (FCF) é isenta.",
"Backbone of rose accords; huge dosages tolerated. Fresh watery-rose. Not IFRA-restricted.":
    "A espinha dos acordes de rosa: rosa fresca e aquosa que aceita dose altíssima sem cansar. Sem restrição IFRA.",
"Banana/pear-drop; fruity top accents. Not IFRA-restricted.":
    "Banana e bala de pêra. Acentos frutados no topo. Sem restrição IFRA.",
"Bergamot/lavender heart; classic fougère and cologne accords. Not IFRA-restricted (converts to linalool).":
    "Coração de bergamota e lavanda. Acordes clássicos de fougère e colônia. Sem restrição IFRA (se converte em linalol).",
"Biotech clean-patchouli/woody base (Firmenich). CAS is a proprietary composition — left null (not a single-molecule CAS).":
    "Base biotecnológica de patchouli limpo e amadeirado (Firmenich). É composição proprietária, por isso não tem CAS de molécula única.",
"Bitter-almond/cherry; gourmand and heliotrope accords. IFRA Restriction (specification) — verify Cat 4.":
    "Amêndoa amarga e cereja. Acordes gourmand e heliotrópio. Tem restrição/especificação IFRA — confira a Cat 4.",
"Caramel-strawberry; gourmand and fruity accords. Very potent. Not IFRA-restricted (verify).":
    "Caramelo com morango. Acordes gourmand e frutados. Potentíssimo — dose em traço. Sem restrição IFRA (confirme).",
"Carnation/clove floral-spice. Strong sensitizer: IFRA 51 Restriction ~0.008% Cat 4 (very low).":
    "Cravina e cravo: floral especiado. Sensibilizante forte — restrição IFRA 51 de ~0,008% Cat 4, ou seja, praticamente traço.",
"Cheap jasmine/floral volume; white-floral bouquets. IFRA Restriction (allergen) — verify Cat 4.":
    "Volume barato de jasmim e floral; buquês de flores brancas. Restrição IFRA por alergênico — confira a Cat 4.",
"Cheap jasmine/white-floral volume; ylang, gardenia accords. Not IFRA-restricted.":
    "Volume barato de jasmim e flores brancas. Acordes de ylang e gardênia. Sem restrição IFRA.",
"Cheapest widely used macrocyclic musk; soft warm musk volume. Not IFRA-restricted.":
    "O almíscar macrocíclico mais barato em uso corrente. Volume almiscarado macio e quente. Sem restrição IFRA.",
"Chypre cornerstone (with bergamot/labdanum). IFRA Restriction + Specification (atranol/chloroatranol <100 ppm); Cat 4 ~0.1% (verify exact 51st).":
    "Pedra angular do chipre, junto com bergamota e labdano. Restrição + especificação IFRA (atranol/cloroatranol < 100 ppm); ~0,1% Cat 4 — confira a 51ª emenda.",
"Cineole medicinal freshness; fresh/functional accents. Not IFRA-restricted.":
    "Frescor medicinal de cineol. Acentos frescos e de linha funcional. Sem restrição IFRA.",
"Cinnamic-leathery balsam; leather and amber accords. IFRA Restriction (crude styrax) — verify.":
    "Bálsamo cinâmico acouroado. Acordes de couro e âmbar. Restrição IFRA para o estoraque bruto — confirme.",
"Cinnamon heart; oriental/gourmand spice. IFRA Restriction; Cat 4 0.25% (older sources cite 0.05% for some categories — 0.25% is the fine-fragrance figure).":
    "Coração de canela: especiaria oriental e gourmand. Restrição IFRA de 0,25% Cat 4 (fontes antigas citam 0,05% para outras categorias; 0,25% é o número de perfumaria fina).",
"Citrus-peel aldehydic sparkle; used in dilution. Not IFRA-restricted (verify).":
    "Faísca aldeídica de casca de cítrico. Usar sempre diluído. Sem restrição IFRA (confirme).",
"Classic lily-of-the-valley (muguet); Lyral replacement contexts. IFRA Restriction; Cat 4 ~1.0% (verify exact against 51st).":
    "O muguet clássico (lírio-do-vale), usado onde antes entrava o Lyral. Restrição IFRA de ~1,0% Cat 4 — confira na 51ª emenda.",
"Classic nitromusk (vintage character). IFRA Restriction; Cat 4 ~1.4% (verify current; many houses avoid nitromusks).":
    "Nitroalmíscar clássico, de caráter vintage. Restrição IFRA de ~1,4% Cat 4 — confira a atual; muitas casas evitam nitroalmíscares por completo.",
"Classic warm nitro-free macrocyclic musk; skin-warmth. Not IFRA-restricted.":
    "Almíscar macrocíclico clássico, quente e sem nitro. Dá calor de pele. Sem restrição IFRA.",
"Cleaner, less-earthy vetiver; refined vetiver bases. IFRA status: verify.":
    "Vetiver mais limpo e menos terroso. Bases de vetiver refinado. Status IFRA: confirme.",
"Clove/carnation spice; oriental warmth. IFRA 51 Restriction ~0.178% Cat 4 (allergen). Supplier certs may vary.":
    "Especiaria de cravo e cravina; calor oriental. Restrição IFRA 51 de ~0,178% Cat 4 (alergênico). O certificado do fornecedor pode variar.",
"Coconut/creamy lactone; tropical and gourmand accords. Not IFRA-restricted.":
    "Lactona cremosa de coco. Acordes tropicais e gourmand. Sem restrição IFRA.",
"Cooling camphor lift; fougère/aromatic and medicinal accents. Not IFRA-restricted (usage low).":
    "Lift canforado e gelado. Acentos fougère, aromáticos e medicinais. Sem restrição IFRA (mas o uso já é baixo).",
"Cooling mint top; fresh/aromatic accents. Not IFRA-restricted.":
    "Topo de menta gelada. Acentos frescos e aromáticos. Sem restrição IFRA.",
"Cooling mint; fresh accents and physical cooling effect. Not IFRA-restricted (usage low).":
    "Menta gelada: além do cheiro, dá sensação física de frio na pele. Sem restrição IFRA (uso já é baixo).",
"Cotton-candy sweetness (La Vie Est Belle/Angel style). Very potent, low dose. Not IFRA-restricted.":
    "Doçura de algodão doce — o efeito La Vie Est Belle / Angel. Muito potente, dose baixíssima. Sem restrição IFRA.",
"Creamy coumarinic-hay; tonka and gourmand bases. IFRA Restriction likely — verify.":
    "Feno cumarínico cremoso. Bases de tonka e gourmand. Provável restrição IFRA — confirme.",
"Creamy peach-apricot lactone; fruity florals. Not IFRA-restricted.":
    "Lactona cremosa de pêssego e damasco. Florais frutados. Sem restrição IFRA.",
"Creamy rosy sandalwood (IFF); sandal accords. Verify IFRA.":
    "Sândalo cremoso com faceta rosada (IFF). Acordes de sândalo. Confira a IFRA.",
"Dry ambergris/amber; ubiquitous base and diffusion driver (Sauvage-style 'ambrox bombs'). Not IFRA-restricted.":
    "Âmbar cinza seco. Base onipresente e motor de projeção — é o que faz as 'bombas de ambrox' tipo Sauvage. Sem restrição IFRA.",
"Dry bitter leather (Bandit, Cuir de Russie). Very potent. IFRA Restriction likely — verify.":
    "Couro seco e amargo (Bandit, Cuir de Russie). Muito potente. Provável restrição IFRA — confirme.",
"Dry pencil-shaving cedar; cheap woody base/fixative. Virginia type generally not restricted.":
    "Cedro seco de apontador de lápis. Base amadeirada e fixador baratos. O tipo Virgínia em geral não tem restrição.",
"Dry peppery lift; masculine and spicy accords. Not IFRA-restricted.":
    "Lift apimentado e seco. Acordes masculinos e especiados. Sem restrição IFRA.",
"Dry woody-violet; more diffusive/woody than alpha. Not individually IFRA-restricted.":
    "Violeta amadeirada e seca — mais projetante e mais madeira que a alfa. Sem restrição IFRA individual.",
"Earthy woody base; chypre and oriental cornerstone. Not IFRA-restricted.":
    "Base amadeirada terrosa: pedra angular de chipres e orientais. Sem restrição IFRA.",
"Extremely dry woody-amber; modern dry-wood/oud accords. IFRA status: verify (CAS may map to Timberol specifically).":
    "Âmbar amadeirado extremamente seco. Acordes modernos de madeira seca e oud. Status IFRA: confirme (o CAS pode se referir especificamente ao Timberol).",
"Extremely powerful creamy-rosy sandalwood; tiny doses. Not IFRA-restricted (added recent amendments).":
    "Sândalo cremoso e rosado de potência extrema — doses minúsculas. Sem restrição IFRA (entrou em emendas recentes).",
"Extremely powerful fruity-rose; damask rose key impact compound. IFRA Restriction (rose ketones combined) ~0.043% Cat 4.":
    "Rosa frutada de potência extrema: é a molécula de impacto da rosa damascena. Restrição IFRA (cetonas de rosa somadas) de ~0,043% Cat 4.",
"Fig-leaf/tomato-leaf green; modern green accords. Verify IFRA.":
    "Verde de folha de figueira e ramo de tomate. Acordes verdes modernos. Confira a IFRA.",
"Firmenich powerful sandalwood; sandal accords. IFRA status: verify.":
    "Sândalo potente da Firmenich. Acordes de sândalo. Status IFRA: confirme.",
"Firmenich racemic ambrox-type; same amber role as Ambroxan. Not IFRA-restricted. (CAS 3738-00-9 = racemic form; note ambiguity vs 6790-58-5).":
    "Ambrox racêmico da Firmenich: mesmo papel ambarado do Ambroxan. Sem restrição IFRA. (CAS 3738-00-9 é a forma racêmica; há ambiguidade com o 6790-58-5.)",
"Fougère cornerstone; aromatic top-heart. Restricted indirectly via linalool/linalyl acetate specs.":
    "Pedra angular do fougère: topo-coração aromático. Restrito de forma indireta, pelas especificações de linalol e acetato de linalila.",
"Fresh cineole; aromatic-fresh and functional. Not IFRA-restricted.":
    "Cineol fresco. Linha aromático-fresca e funcional. Sem restrição IFRA.",
"Fresh green-melon muguet; modern florals and functional. IFRA Restriction; verify Cat 4 %.":
    "Muguet fresco com verde e melão. Florais modernos e linha funcional. Tem restrição IFRA — confira o % Cat 4.",
"Fresh metallic-ambery aldehyde (No.5 signature). Verify IFRA.":
    "Aldeído fresco, metálico e ambarado — a assinatura do Nº 5. Confira a IFRA.",
"Fresh muguet/linden-blossom; modern floral accords (Firmenich). Not IFRA-restricted (verify).":
    "Muguet fresco com flor de tília. Acordes florais modernos (Firmenich). Sem restrição IFRA (confirme).",
"Fresh woody-fruity; florals and functional. Not IFRA-restricted (verify).":
    "Amadeirado frutado fresco. Florais e linha funcional. Sem restrição IFRA (confirme).",
"Fresh zingy ginger; modern masculines. Not IFRA-restricted (phototox specification for some fractions).":
    "Gengibre fresco e mordente. Masculinos modernos. Sem restrição IFRA (algumas frações têm especificação de fototoxicidade).",
"Fresh-air ozonic; marine/clean accords. IFRA status: verify.":
    "Ozônico de ar livre. Acordes marinhos e limpos. Status IFRA: confirme.",
"Fresh-cut grass/leaf; green top-notes and fruity-green accords. Very potent, low dose. Not IFRA-restricted.":
    "Grama recém-cortada e folha partida. Notas de topo verdes e acordes verde-frutados. Muito potente, dose baixa. Sem restrição IFRA.",
"Fresh-spicy cineole top; modern masculines and gourmand-spice. Not IFRA-restricted.":
    "Topo fresco-especiado de cineol. Masculinos modernos e especiaria gourmand. Sem restrição IFRA.",
"Fresher/greener rose alcohol vs geraniol; neroli and rose accords. Not individually IFRA-capped (isomer of geraniol).":
    "Álcool de rosa mais fresco e verde que o geraniol. Acordes de neroli e rosa. Sem teto IFRA individual (é isômero do geraniol).",
"Fruity-floral macrocyclic musk of ambrette seed. Not IFRA-restricted.":
    "Almíscar macrocíclico frutado-floral, da semente de ambrette. Sem restrição IFRA.",
"Fruity-green leaf; softer than the alcohol. Green accords. Not IFRA-restricted.":
    "Folha verde frutada, mais suave que o álcool correspondente. Acordes verdes. Sem restrição IFRA.",
"Fruity-pear clean musk (Firmenich alicyclic). Not IFRA-restricted (verify).":
    "Almíscar limpo com pêra frutada (alicíclico da Firmenich). Sem restrição IFRA (confirme).",
"Fruity-rose diffusion; part of 'rose ketones' group. IFRA Restriction (rose ketones combined) ~0.043% Cat 4.":
    "Projeção de rosa frutada. Faz parte do grupo das cetonas de rosa. Restrição IFRA (somadas) de ~0,043% Cat 4.",
"Gin/pine freshness; aromatic and fresh accords. Specification (peroxides).":
    "Frescor de gim e pinho. Acordes aromáticos e frescos. Tem especificação IFRA de peróxidos.",
"Givaudan sandalwood note, drier than Sandalore. IFRA status: verify.":
    "Nota de sândalo da Givaudan, mais seca que o Sandalore. Status IFRA: confirme.",
"Grape/orange-blossom; neroli and fruity accords. Not IFRA-restricted.":
    "Uva com flor de laranjeira. Acordes de neroli e frutados. Sem restrição IFRA.",
"Green foliage aldehyde; muguet-green and leafy accords (IFF). Verify IFRA/CAS.":
    "Aldeído de folhagem verde. Acordes muguet-verde e de folha (IFF). Confira IFRA e CAS.",
"Green-apple fruity; fruity florals. Not IFRA-restricted (verify).":
    "Frutado de maçã verde. Florais frutados. Sem restrição IFRA (confirme).",
"Green-fruity pineapple/galbanum booster; modern florals and fruity accords. IFRA Restriction — verify Cat 4.":
    "Booster verde-frutado de abacaxi e gálbano. Florais modernos e acordes frutados. Tem restrição IFRA — confira a Cat 4.",
"Green-fruity rose; rose ketones group. IFRA Restriction (rose ketones combined) ~0.043% Cat 4.":
    "Rosa verde-frutada. Grupo das cetonas de rosa. Restrição IFRA (somadas) de ~0,043% Cat 4.",
"Green-marine floral aldehyde; aquatic and ozonic accords. IFRA Restriction reported with conflicting values (~2.6% vs 5.3%) — left null pending 51st confirmation.":
    "Aldeído floral verde-marinho. Acordes aquáticos e ozônicos. A restrição IFRA aparece com valores conflitantes (~2,6% vs 5,3%) — ficou em aberto até confirmar na 51ª.",
"Green-melon/cucumber aldehyde; aquatic-fruity accords. Verify IFRA.":
    "Aldeído de melão verde e pepino. Acordes aquático-frutados. Confira a IFRA.",
"Green-muguet-melon aldehyde; green floral and aquatic accords. IFRA Restriction likely — verify.":
    "Aldeído verde de muguet e melão. Acordes florais verdes e aquáticos. Provável restrição IFRA — confirme.",
"Green-woody citrus; colognes and aromatic fougères. Restricted via constituents.":
    "Cítrico verde-amadeirado. Colônias e fougères aromáticos. Restrito pelos constituintes.",
"Hawthorn/mimosa powdery-anisic; floral and gourmand accents. Not IFRA-restricted.":
    "Espinheiro e mimosa, empoado e anisado. Acentos florais e gourmand. Sem restrição IFRA.",
"Hay/tonka; the fougère base signature. IFRA Restriction; Cat 4 1.5% (confirmed 51st Amendment).":
    "Feno e tonka: a assinatura da base fougère. Restrição IFRA de 1,5% Cat 4 (confirmado na 51ª emenda).",
"Hyacinth-honey green floral; hyacinth and narcissus accords. IFRA Restriction ~0.015% Cat 4 (allergen; supplier certs vary).":
    "Floral verde de jacinto com mel. Acordes de jacinto e narciso. Restrição IFRA de ~0,015% Cat 4 (alergênico; o certificado do fornecedor varia).",
"Juicy green-apple; fruity accords. Not IFRA-restricted (verify).":
    "Maçã verde suculenta. Acordes frutados. Sem restrição IFRA (confirme).",
"Lilac/pine-floral; cheap floral and functional volume. Not IFRA-restricted.":
    "Lilás com floral-pinho. Volume floral barato e linha funcional. Sem restrição IFRA.",
"Linalool-rich fresh-herbal; masculine and aromatic hearts. Restricted via linalool spec.":
    "Herbal fresco rico em linalol. Coração de masculinos e aromáticos. Restrito pela especificação do linalol.",
"Long-lasting orange-blossom fixative (Schiff base). Restricted via hydroxycitronellal content — verify.":
    "Fixador de flor de laranjeira de longuíssima duração (base de Schiff). Restrito pelo teor de hidroxicitronelal — confirme.",
"Main odor alcohol of patchouli; cleaner isolate. Not IFRA-restricted.":
    "O principal álcool odorífero do patchouli, isolado e mais limpo que o óleo. Sem restrição IFRA.",
"Marine-green aldehyde; aquatic and green accords (note: shares CAS/identity with Cyclal/Cyclohexal-type — verify).":
    "Aldeído marinho e verde. Acordes aquáticos e verdes (atenção: divide CAS/identidade com o tipo Cyclal/Cyclohexal — confirme).",
"Marine-muguet aldehyde; Lilial alternative. IFRA Restriction likely — verify Cat 4 %.":
    "Aldeído marinho de muguet: alternativa ao Lilial. Provável restrição IFRA — confira o % Cat 4.",
"Narcissus/animalic phenolic; ylang and white-floral naturalness in trace. Verify IFRA.":
    "Fenólico de narciso com toque animálico. Em traço, dá naturalidade a ylang e flores brancas. Confira a IFRA.",
"Natural clove (high eugenol); oriental spice. Restricted via eugenol/isoeugenol content.":
    "Cravo natural, rico em eugenol. Especiaria oriental. Restrito pelo teor de eugenol/isoeugenol.",
"Natural rose-green heart; fougère and masculine hearts. Restricted indirectly via citronellol/geraniol content.":
    "Coração natural de rosa esverdeada. Coração de fougères e masculinos. Restrito indiretamente pelo teor de citronelol/geraniol.",
"Near-odorless solvent/diluent and mild fixative; carries resinoids. IFRA Restriction (low-level allergen); Cat 4 fairly permissive — verify exact %.":
    "Solvente/diluente quase inodoro e fixador leve; serve de veículo para resinoides. Restrição IFRA (alergênico fraco); a Cat 4 é bem permissiva — confira o % exato.",
"Near-odorless solvent/fixative and antioxidant carrier. Not a fragrance per se. Not IFRA-restricted.":
    "Solvente/fixador quase inodoro e veículo antioxidante. Não é matéria-prima de cheiro. Sem restrição IFRA.",
"PROHIBITED (strong sensitizer). Was a major muguet material. Flagged so the engine never recommends it.":
    "PROIBIDO (sensibilizante forte). Já foi um dos grandes muguets do mercado. Fica marcado aqui só para você reconhecer e nunca usar.",
"PROHIBITED. Formerly a muguet/cyclamen workhorse. Banned in EU (CMR reprotoxic) and IFRA-prohibited. Replace with Florhydral/Bourgeonal/Mefranal/Lilybelle. Included as a flag.":
    "PROIBIDO. Foi o burro de carga do muguet/cíclame. Banido na UE (CMR, reprotóxico) e proibido pela IFRA. Troque por Florhydral, Bourgeonal, Mefranal ou Lilybelle. Está aqui só como alerta.",
"Phenolic herbal; aromatic and fougère accents. IFRA Restriction (phenols) — verify.":
    "Herbal fenólico. Acentos aromáticos e fougère. Restrição IFRA por fenóis — confirme.",
"Pine/forest freshness; coniferous and fougère top-notes. Specification (peroxides).":
    "Frescor de pinho e floresta. Notas de topo coníferas e fougère. Tem especificação IFRA de peróxidos.",
"Pine/herbal-bergamot; lavender and pine accords, functional. Not IFRA-restricted (verify).":
    "Pinho com herbal-bergamota. Acordes de lavanda e pinho, e linha funcional. Sem restrição IFRA (confirme).",
"Plummy fruity-rose; rose ketones group. IFRA Restriction (rose ketones combined) ~0.043% Cat 4.":
    "Rosa frutada puxando ameixa. Grupo das cetonas de rosa. Restrição IFRA (somadas) de ~0,043% Cat 4.",
"Powerful dry amber-woody; amber bases. Verify IFRA.":
    "Âmbar amadeirado seco e potente. Bases ambaradas. Confira a IFRA.",
"Powerful lemon note; used in trace with limonene/geraniol as quencher. IFRA Restriction; Cat 4 ~0.6% (sensitizer).":
    "Nota de limão potentíssima; usa-se em traço, com limoneno/geraniol como quencher. Restrição IFRA de ~0,6% Cat 4 (sensibilizante).",
"Powerful modern muguet/green-floral, Lilial/Lyral replacement. Givaudan captive-origin. IFRA status: check current STD.":
    "Muguet moderno potente, floral-verde: o substituto de Lilial e Lyral. Origem cativa da Givaudan. Status IFRA: cheque o padrão vigente.",
"Radiant transparent jasmine; diffusion/lift booster used at very high % (Eau Sauvage, CK One). Not IFRA-restricted.":
    "Jasmim radiante e transparente. Booster de projeção e lift, usado em percentual altíssimo (Eau Sauvage, CK One). Sem restrição IFRA.",
"Resinous incense; incense/amber accords. Specification on peroxides; not simply Cat 4 capped.":
    "Incenso resinoso. Acordes de incenso e âmbar. Tem especificação de peróxidos — não é um teto simples de Cat 4.",
"Rooty smoky woody base; masculine and chypre cornerstone; excellent fixative. Not IFRA-restricted.":
    "Base amadeirada de raiz, com fumaça. Pedra angular de masculinos e chipres, e fixador excelente. Sem restrição IFRA.",
"Rose-bud freshness; rose/geranium/muguet accords. IFRA 51 Restriction ~0.076% Cat 4 (allergen).":
    "Frescor de botão de rosa. Acordes de rosa, gerânio e muguet. Restrição IFRA 51 de ~0,076% Cat 4 (alergênico).",
"Rose/geranium heart; core rose alcohol. IFRA 51 Restriction ~0.056% Cat 4 (established allergen). Supplier certs may state slightly different %.":
    "Coração de rosa e gerânio: o álcool central da rosa. Restrição IFRA 51 de ~0,056% Cat 4 (alergênico consagrado). O certificado do fornecedor pode trazer % um pouco diferente.",
"Rosy-waxy aldehyde; classic aldehydic floral top. Used diluted. Verify IFRA.":
    "Aldeído ceroso e rosado: topo floral aldeídico clássico. Usar diluído. Confira a IFRA.",
"Rougher, woodier ylang relative; cheap floral volume. Restricted via constituents (shares CAS grouping with ylang).":
    "Parente mais rústico e amadeirado do ylang. Volume floral barato. Restrito pelos constituintes (compartilha agrupamento de CAS com o ylang).",
"Saffron-leather (Givaudan); oud/leather accords. IFRA status: verify.":
    "Açafrão com couro (Givaudan). Acordes de oud e couro. Status IFRA: confirme.",
"Saturated C-11; cleaner aldehydic. Verify IFRA.":
    "C-11 saturado: aldeídico mais limpo que o insaturado. Confira a IFRA.",
"Sharp green foliage aldehyde; green accords, tomato-leaf, muguet greenery. IFRA Restriction likely — verify.":
    "Aldeído de folhagem verde, cortante. Acordes verdes, ramo de tomate, o verde do muguet. Provável restrição IFRA — confirme.",
"Sharp green-metallic rose top-sparkle; lychee/rose accords. Extremely potent, dosed in traces. Not IFRA-restricted.":
    "Faísca de topo: rosa verde-metálica, cortante. Acordes de lichia e rosa. Potentíssimo, só em traço. Sem restrição IFRA.",
"Sharper, more camphor lavender; cheaper fougère volume. Restricted indirectly via constituents.":
    "Lavanda mais cortante e canforada. Volume de fougère mais barato. Restrito indiretamente pelos constituintes.",
"Signature 'fresh/aquatic-citrus' of 80s-90s masculines (Cool Water). Huge diffusive lime-cologne character. Not IFRA-restricted.":
    "A assinatura fresco-aquático-cítrica dos masculinos dos anos 80/90 (Cool Water). Caráter de lima e colônia com projeção enorme. Sem restrição IFRA.",
"Smokier, more phenolic moss; chypre/leather. IFRA Restriction + atranol Specification (note: CAS often shared/overlaps with oakmoss listings — verify).":
    "Musgo mais defumado e fenólico. Chipre e couro. Restrição IFRA + especificação de atranol (o CAS costuma se sobrepor ao do musgo de carvalho — confirme).",
"Smoky-tarry leather (Cuir de Russie); campfire accents. IFRA Restriction + Specification (crude prohibited; rectified restricted) — verify.":
    "Couro defumado e alcatroado (Cuir de Russie); acentos de fogueira. Restrição + especificação IFRA: o bruto é proibido, o retificado é restrito — confirme.",
"Smoky-woody oud/leather substitute; oud and woody accords. Verify IFRA.":
    "Substituto amadeirado-defumado de oud e couro. Acordes de oud e amadeirados. Confira a IFRA.",
"Smooth radiant woody-amber; the ubiquitous modern base/volumizer (Molecule 01, Terre d'Hermes). IFRA STD applies to OTNE; historically a high Cat 4 (~20%) — verify current.":
    "Âmbar amadeirado macio e radiante: a base/volumizador onipresente da perfumaria moderna (Molecule 01, Terre d'Hermès). O padrão IFRA se aplica ao OTNE; historicamente Cat 4 alta (~20%) — confira a vigente.",
"Soapy-waxy floral aldehyde. Verify IFRA (~2% historically).":
    "Aldeído floral ensaboado e ceroso. Confira a IFRA (~2% historicamente).",
"Soft dry cedar fixative, smoother than cedar oil. Not IFRA-restricted.":
    "Fixador de cedro seco e macio, mais liso que o óleo de cedro. Sem restrição IFRA.",
"Soft floral, muguet/lime-blossom; floral bouquets and deodorant use. IFRA Restriction (allergen) — verify Cat 4 %.":
    "Floral macio de muguet e flor de tília. Buquês florais e uso em desodorante. Restrição IFRA por alergênico — confira o % Cat 4.",
"Soft floral-balsamic fixative; 'sunscreen'/tanning accord, floral bouquets. IFRA Restriction (Cat 4 % relatively high; verify exact — historically several %).":
    "Fixador floral-balsâmico macio: é o acorde de protetor solar/bronzeador, e dá corpo a buquês florais. Restrição IFRA com Cat 4 relativamente alta (historicamente vários %) — confira o exato.",
"Soft fresh woody-floral; huge in functional and fine fragrance volume. Not IFRA-restricted (verify).":
    "Amadeirado floral fresco e macio. Enorme em volume, tanto na linha funcional quanto na fina. Sem restrição IFRA (confirme).",
"Soft green-floral salicylate; modern floral volume and fixation. IFRA Restriction — verify Cat 4.":
    "Salicilato floral-verde macio. Volume e fixação de florais modernos. Tem restrição IFRA — confira a Cat 4.",
"Soft woody-floral fixative; floral bases and neroli. IFRA Restriction (allergen) — verify Cat 4.":
    "Fixador amadeirado-floral macio. Bases florais e neroli. Restrição IFRA por alergênico — confira a Cat 4.",
"Softer, more floral/muguet linalool variant; less citrusy, more stable. Not IFRA-restricted (verify).":
    "Variante do linalol mais macia e floral (puxando muguet); menos cítrica e mais estável. Sem restrição IFRA (confirme).",
"Solvent/diluent, mild floral-balsamic. IFRA Restriction (labeled allergen); Cat 4 relatively high — verify exact %.":
    "Solvente/diluente com um floral-balsâmico leve. Restrição IFRA (alergênico de rotulagem); Cat 4 relativamente alta — confira o % exato.",
"Sparkling fruity-pink-pepper; ubiquitous modern top. Specification (peroxides) — verify.":
    "Pimenta rosa frutada e efervescente: o topo onipresente da perfumaria moderna. Tem especificação de peróxidos — confirme.",
"Sweet amber-woody fixative; amber accords. Verify IFRA.":
    "Fixador ambarado-amadeirado doce. Acordes de âmbar. Confira a IFRA.",
"Sweet balsamic resin; oriental amber. IFRA Restriction (phototoxic/allergen) — verify.":
    "Resina balsâmica doce. Âmbar oriental. Restrição IFRA (fototóxico/alergênico) — confirme.",
"Sweet balsamic-hyacinth; part of cinnamon/balsam accords. IFRA Restriction (allergen) — verify Cat 4 %.":
    "Balsâmico doce com jacinto. Compõe acordes de canela e bálsamo. Restrição IFRA por alergênico — confira o % Cat 4.",
"Sweet fruity-rose; rose and honey accords. Not IFRA-restricted.":
    "Rosa frutada e doce. Acordes de rosa e mel. Sem restrição IFRA.",
"Symrise macrocyclic musk (Habanolide analog). Not IFRA-restricted (verify).":
    "Almíscar macrocíclico da Symrise (análogo do Habanolide). Sem restrição IFRA (confirme).",
"Synthetic oakmoss facet (atranol-free); the IFRA-safe way to build chypre moss. Not IFRA-restricted.":
    "Faceta sintética de musgo de carvalho, livre de atranol: a forma segura pela IFRA de montar o musgo do chipre. Sem restrição IFRA.",
"Tart citrus top; boosted with nootkatone/thio-grapefruit specialties. Mildly phototoxic (Specification).":
    "Topo cítrico ácido; costuma ser reforçado com nootcatona e especialidades tio-grapefruit. Levemente fototóxico (especificação IFRA).",
"The 'clean laundry' polycyclic musk; volume and fixation. IFRA Restriction (environmental/PBT); Cat 4 leave-on ~1.5%.":
    "O almíscar policíclico do cheiro de 'roupa lavada'. Dá volume e fixação. Restrição IFRA por questão ambiental (PBT); ~1,5% Cat 4 leave-on.",
"The 90s marine/aquatic molecule (L'Eau d'Issey, Escape). Melon-oceanic. Not IFRA-restricted.":
    "A molécula marinha/aquática dos anos 90 (L'Eau d'Issey, Escape). Melão oceânico. Sem restrição IFRA.",
"The heart of 'amber' accords (with vanillin); leathery-balsamic base. Restricted indirectly via allergen constituents.":
    "O coração do acorde de âmbar, junto com a vanilina. Base balsâmica acouroada. Restrito indiretamente pelos constituintes alergênicos.",
"The iso-isomer marketed as Isoraldeine; powdery orris. EU-labeled allergen; IFRA has a Restriction on methyl ionone isomers (exact Cat 4 % not confirmed here).":
    "O iso-isômero vendido como Isoraldeína: íris empoada. Alergênico de rotulagem na UE; a IFRA tem restrição para os isômeros de metil-ionona (o % exato de Cat 4 não está confirmado aqui).",
"The natural rose; rose accords and florals. Restricted via citronellol/geraniol/methyl eugenol content.":
    "A rosa natural. Acordes de rosa e florais em geral. Restrito pelo teor de citronelol, geraniol e metil eugenol.",
"The true orris-butter note; premium violet/iris. Very expensive, dosed low. IFRA status not confirmed.":
    "A nota verdadeira de manteiga de íris: violeta/íris premium. Caríssimo, dose baixa. Status IFRA não confirmado.",
"Toasted-caramel sweetness; softer than ethyl maltol. Not IFRA-restricted.":
    "Doçura de caramelo tostado, mais macia que a do etil maltol. Sem restrição IFRA.",
"Ubiquitous fresh-floral lift; core of lavender/bergamot/coriander accords. IFRA Specification on peroxides rather than a fixed Cat 4 % (autoxidation sensitizer).":
    "O lift fresco-floral onipresente: é o núcleo dos acordes de lavanda, bergamota e coentro. A IFRA impõe especificação de peróxidos em vez de um teto fixo de Cat 4 (sensibiliza por autoxidação).",
"Ultra-potent dry woody-amber booster; small doses give big amber projection. CAS may refer to the crystals/solution — verify.":
    "Booster ambarado-amadeirado seco, ultrapotente: dose pequena já dá projeção ambarada enorme. O CAS pode se referir aos cristais ou à solução — confirme.",
"Vanilla base; gourmand/oriental cornerstone. Not IFRA-restricted (can discolor bases yellow).":
    "A base de baunilha: pedra angular do gourmand e do oriental. Sem restrição IFRA (mas pode amarelar a fórmula).",
"Very common cheap jasmine/floral filler; huge in functional and fine. IFRA Restriction (allergen) — verify Cat 4.":
    "Enchimento floral/jasmim barato e comuníssimo; enorme em volume na linha funcional e na fina. Restrição IFRA por alergênico — confira a Cat 4.",
"Very stable, base/functional-friendly linalool; clean floral in soap and bleach-stable products. Not IFRA-restricted.":
    "Linalol muito estável, feito para bases e linha funcional: floral limpo que aguenta sabão e alvejante. Sem restrição IFRA.",
"Vetiver/woody-amber base extender; cheap woody fixative. IFRA status: generally unrestricted — verify.":
    "Extensor de base vetiver/ambarado-amadeirado; fixador amadeirado barato. Status IFRA: em geral sem restrição — confirme.",
"Violet-leaf/cucumber green; green florals. IFRA Restriction (usually combined with methyl octine carbonate; Cat 4 low ~0.01% area) — verify.":
    "Verde de folha de violeta e pepino. Florais verdes. Restrição IFRA (normalmente somada ao metil octino carbonato; Cat 4 baixa, na faixa de 0,01%) — confirme.",
"Violet/orris heart; softer, more floral than beta. Not individually IFRA-restricted.":
    "Coração de violeta e íris — mais macio e floral que a beta. Sem restrição IFRA individual.",
"Warm balsamic-vanilla; oriental bases. IFRA Restriction (crude balsam restricted; extracts specification) — verify.":
    "Balsâmico quente com baunilha. Bases orientais. Restrição IFRA: o bálsamo bruto é restrito, os extratos têm especificação — confirme.",
"Warm creamy synthetic sandalwood; sandalwood accords. IFRA status: verify (may be restricted).":
    "Sândalo sintético quente e cremoso. Acordes de sândalo. Status IFRA: confirme (pode ser restrito).",
"Warm medicinal-balsamic resin; incense and oriental bases. Not IFRA-restricted (verify).":
    "Resina balsâmica quente com toque medicinal. Bases de incenso e orientais. Sem restrição IFRA (confirme).",
"Waxy orange-peel aldehyde; aldehydic florals (No.5 family). IFRA Restriction ~1.0% concentrate (verify).":
    "Aldeído ceroso de casca de laranja. Florais aldeídicos (a família do Nº 5). Restrição IFRA de ~1,0% no concentrado (confirme).",
"Waxy-rosy 'soap' aldehyde; classic aldehydic accord. Verify IFRA (historically ~limited).":
    "Aldeído ceroso e rosado, de sabonete: o acorde aldeídico clássico. Confira a IFRA (historicamente limitado).",
"White-floral naturalness (jasmine/orange blossom); trace animalic dirtiness. Usually as 1-10% dilution. Not IFRA-restricted.":
    "Dá naturalidade a flores brancas (jasmim, flor de laranjeira) com uma sujeirinha animálica em traço. Use sempre diluído a 1–10%. Sem restrição IFRA.",
"Wintergreen; minty/medicinal accents, root-beer accords. IFRA Restriction — verify Cat 4.":
    "Wintergreen: acentos mentolados/medicinais e acordes de root beer. Tem restrição IFRA — confira a Cat 4.",
"Woody-tobacco-amber; masculine and amber bases (Givaudan). Verify IFRA.":
    "Amadeirado com tabaco e âmbar. Bases masculinas e ambaradas (Givaudan). Confira a IFRA.",
}
