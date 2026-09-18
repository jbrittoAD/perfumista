# -*- coding: utf-8 -*-
"""
deck_notes_pt.py — O que separa um material do vizinho mais parecido.

POR QUE ISTO EXISTE À MÃO: o baralho põe lado a lado os materiais mais próximos,
e aí vem a pergunta que o dado cru não responde — "por que eu compraria Javanol
em vez de Sandalore?". Os fornecedores brasileiros raspados não trazem isso, e a
referência que traria (The Good Scents Company) bloqueia agentes de IA no
robots.txt. Então é curadoria: conhecimento consolidado de perfumaria, escrito
material a material.

COBERTURA: os grupos onde a confusão é maior — sândalos sintéticos, almíscares,
âmbares, muguets, iononas, aldeídos graxos, álcoois de rosa, ésteres frutados,
mentas e madeiras. Não cobre o catálogo inteiro de propósito: nota genérica não
ajuda ninguém, e onde não há o que dizer o app admite que não há.

CHAVE: trecho do nome, normalizado (minúsculo, sem acento). O build casa por
substring, então "javanol" pega "Javanol® – Sândalo de Alta Performance".
Chaves mais específicas vencem as mais curtas.
"""

NOTES_PT = {

# --- sândalos sintéticos: o grupo que mais confunde quem está comprando ------
"javanol": "O mais potente e o mais caro do grupo: sândalo cremoso com uma rosa "
           "por dentro, que aparece em 0,1% e segura por dias. Se o orçamento "
           "permite um só sândalo, é este.",
"polysantol": "Mais doce e leitoso que o Javanol, e bem mais barato. O sândalo "
              "'bonito' de perfumaria comercial — menos realista, mais fácil de usar.",
"ebanol": "O sândalo SECO do grupo: menos leite, mais madeira e um toque de couro. "
          "Use quando o acorde já tem doçura sobrando.",
"bacdanol": "Cremoso com faceta rosada nítida, mais transparente que o Polysantol. "
            "Boa ponte entre sândalo e floral.",
"sandalore": "O sândalo barato de referência: quente e cremoso, mas com um fundo "
             "meio 'sintético/cartonado' que denuncia. Serve de volume, não de assinatura.",
"sandela": "Parente pobre do Sandalore — mais áspero e com nuance de cânfora. "
           "Funciona em sabonete e linha funcional, não em perfumaria fina.",
"osyrol": "Sândalo mais leve e seco, quase amadeirado-limpo. Some rápido perto "
          "dos macrocíclicos; bom para clarear um acorde pesado.",
"sandiff": "Isobornila-ciclohexanol: sândalo áspero e canforado, o mais 'técnico' "
           "do grupo. Barato e estável, mas precisa de companhia cremosa.",
"indisan": "Mesma família do Sandiff, perfil seco e canforado. Use como extensor "
           "barato embaixo de um sândalo bom, não sozinho.",
"santalex": "Reconstituição de sândalo em base: já vem balanceada, então entra em "
            "dose alta e resolve o acorde inteiro — ao custo de não poder ajustar.",
"sandalwood artessence": "Base que substitui o óleo de sândalo natural em fórmula. "
                         "Vale pela estabilidade de lote, não pelo realismo.",

# --- almíscares: a diferença é comportamento, não cheiro ---------------------
"galaxolide": "O almíscar 'roupa lavada': limpo, doce e com projeção enorme. "
              "É o mais barato por efeito, mas é policíclico e tem restrição ambiental.",
"habanolide": "Macrocíclico metálico-limpo, mais transparente que o Galaxolide e "
              "sem o lado adocicado. Deixa a fórmula moderna em vez de amaciante.",
"exaltolide": "O almíscar de PELE: quente, gorduroso, quase animal em dose alta. "
              "É o que dá sensação de proximidade — Galaxolide não faz isso.",
"ambrettolide": "Frutado-floral com nuance de pêra, o mais 'bonito' dos macrocíclicos. "
                "Caro; use onde o almíscar precisa ser perceptível como nota.",
"helvetolide": "Almíscar limpo com pêra explícita. Alicíclico, muito estável em base, "
               "e deixa um rastro frutado que o Galaxolide não tem.",
"velvione": "Macrocíclico aveludado, mais quente que o Habanolide e menos doce que "
            "o Galaxolide. Meio-termo elegante.",
"etileno brassilato": "O macrocíclico mais barato do mercado: almíscar macio e "
                      "morno, sem personalidade própria. Serve de volume e fixação.",
"brassilato": "O macrocíclico mais barato do mercado: almíscar macio e morno, sem "
              "personalidade própria. Serve de volume e fixação.",
"cashmeran": "Não é bem almíscar: é um amadeirado-especiado aveludado que faz o "
             "efeito 'cashmere'. Domina rápido — passe de 2% e ele vira a fórmula.",
"tonalide": "Policíclico irmão do Galaxolide, mais seco e menos doce. Mesmo "
            "problema ambiental; hoje se prefere macrocíclico.",
"musk ketone": "Nitroalmíscar vintage: doce, empoado, com um quê de baunilha. "
               "É o cheiro de perfumaria antiga — e a maioria das casas já não usa.",
"almiscar cetona": "Nitroalmíscar vintage: doce, empoado, com um quê de baunilha. "
                   "É o cheiro de perfumaria antiga — e a maioria das casas já não usa.",
"kephalis": "Amadeirado-tabaco-âmbar, não almíscar de verdade. Dá corpo seco e "
            "masculino; ótimo entre madeira e âmbar.",
"vertenex": "Amadeirado-floral fresco e barato. Enche volume sem chamar atenção — "
            "é enchimento de qualidade, não assinatura.",

# --- âmbares amadeirados: todos 'ambrox', nenhum igual ----------------------
"ambroxan": "O padrão do grupo: âmbar seco e mineral, com projeção que parece "
            "brilhar na pele. É o motor das 'bombas de âmbar' modernas.",
"ambrox": "Versão racêmica do Ambroxan — mesmo papel, potência um pouco menor e "
          "preço normalmente melhor.",
"amber xtreme": "Ultrapotente: 10 a 20 vezes o Ambroxan. Dose em partes por milhão; "
                "um erro de pesagem aqui mata a fórmula inteira.",
"ambrocenide": "Âmbar-amadeirado cristalino e agressivo, com projeção brutal. "
               "Traço resolve; em excesso vira cheiro de amaciante caro.",
"karanal": "Âmbar seco e salgado, com lado mineral/âmbar-cinza mais marcado. "
           "Menos doce que o Ambroxan.",
"grisalva": "Âmbar com faceta marinha/animálica de âmbar-cinza de verdade. "
            "É o que dá o lado 'maresia suja' que o Ambroxan não tem.",
"amberketal": "Âmbar suave e difuso, de fundo. Não brilha como o Ambroxan — "
              "serve para dar continuidade embaixo dos outros.",
"kohinool": "Âmbar amadeirado moderno da IFF, mais madeira que âmbar. "
            "Boa ponte para acordes de oud sintético.",
"ambermax": "Âmbar de altíssima difusão e substantividade; feito para linha "
            "funcional, onde tem que sobreviver ao sabão.",
"labdano": "O âmbar NATURAL: resinoso, doce, com couro e mel por baixo. "
           "É a alma do acorde de âmbar clássico, que os sintéticos não reproduzem.",
"iso e super": "Amadeirado-âmbar transparente e onipresente. Muita gente é anósmica "
               "a ele; entra em dose alta (10-20%) como volumizador, não como nota.",

# --- muguet: o acorde mais regulado da perfumaria ---------------------------
"lilial": "PROIBIDO na UE (reprotóxico) e pela IFRA. Era o muguet mais usado do "
          "mundo — está aqui só para você reconhecer e substituir.",
"lysmeral": "Mesmo material que o Lilial, outro nome comercial. PROIBIDO.",
"lyral": "PROIBIDO pela IFRA (sensibilizante forte). Foi o muguet-chave por décadas.",
"hidroxicitronelal": "O muguet clássico, doce e leitoso. Ainda permitido, mas com "
                     "teto baixo — e é sensibilizante conhecido.",
"florhydral": "Muguet verde e potente, com um corte de folha que o hidroxicitronelal "
              "não tem. É a substituição mais direta do Lilial.",
"mayol": "Muguet aquoso e transparente da Firmenich, quase sem doçura. "
         "O mais 'moderno' do grupo.",
"majantol": "Muguet limpo e sem arestas, muito estável em base. Menos bonito que o "
            "Florhydral, muito mais fácil de trabalhar.",
"nympheal": "Muguet moderno com faceta aquática/verde, criado justamente para "
            "substituir Lilial. Caro, mas é o mais completo.",
"florol": "Não é muguet puro: é floral-verde aquoso com lado de pêra. "
          "Dá transparência onde o muguet clássico pesaria.",
"piranol": "Muguet com flor de tília, mais melífero que verde. "
           "Boa alternativa quando o acorde está seco demais.",
"magnolan": "Muguet-magnólia frutado, com lado de pêssego. Menos 'lírio', mais flor branca.",
"carbinol muguet": "Muguet suave de baixo custo; sem a projeção dos modernos, "
                   "serve para arredondar em vez de assinar.",

# --- iononas e violetas: a diferença é doçura contra secura -----------------
"ionona alfa": "A mais FLORAL e doce das iononas: violeta de verdade, com framboesa "
               "por trás. É a que se usa quando a violeta tem que ser bonita.",
"ionona beta": "Mais SECA e amadeirada que a alfa, com projeção maior. "
               "Violeta de fundo, quase madeira — base de acordes de íris.",
"metil ionona": "Mais empoada e cremosa que as iononas simples; o caminho clássico "
                "para íris/pó-de-arroz sem pagar preço de orris.",
"isoraldeina": "Metil-ionona isomerizada: íris empoada, elegante e estável. "
               "É o que dá o lado 'maquiagem' de muitos florais.",
"irone": "A nota VERDADEIRA de manteiga de íris — o que a metil-ionona imita. "
         "Caríssima e dosada em traço; nada chega perto.",
"undecavertol": "Violeta verde e aquosa, não empoada. Dá o lado 'folha de violeta' "
                "sem o peso das iononas.",
"metil octino carbonato": "Folha de violeta brutalmente potente e verde-metálica. "
                          "Dose em traço homeopático; tem teto IFRA muito baixo.",
"koavone": "Frutado-empoado com lado de violeta seca; mais moderno e menos "
           "'perfume de vovó' que a metil-ionona.",

# --- aldeídos graxos: a diferença é o comprimento da cadeia -----------------
"aldeido c8": "O mais volátil e agressivo: casca de laranja verde e gordurosa. "
              "Cheirar puro machuca — sempre a 1% ou menos.",
"aldeido c9": "Rosa cerosa com um lado de casca; a ponte entre cítrico e floral "
              "nos aldeídicos clássicos.",
"aldeido c10": "Casca de laranja cerosa, o mais 'redondo' da série. "
               "É o aldeído do Chanel Nº 5 junto com o C11 e o C12.",
"aldeido c11": "Ceroso e ensaboado, com verde por trás. O undecilênico é mais verde; "
               "o undecílico, mais limpo e redondo.",
"aldeido c12 mna": "Metil-nonil-acetaldeído: o mais metálico e ambarado da série, "
                   "e a assinatura reconhecível do Nº 5.",
"aldeido c12 laurico": "Ensaboado e ceroso puro, sem o metálico do MNA. "
                       "É o aldeído 'sabonete' por excelência.",
"aldeido c14": "Não é aldeído: é lactona de pêssego. Cremoso e frutado — "
               "nada a ver com a série graxa em que o nome o coloca.",
"aldeido c16": "Também não é aldeído: éster glicidato de morango. "
               "Nome herdado da indústria, perfil totalmente diferente.",
"aldeido c18": "Lactona de coco. Mesma armadilha de nome dos C14 e C16.",

# --- álcoois de rosa: quatro caminhos para a mesma flor ---------------------
"geraniol": "Rosa clássica e um pouco gerânio, com lado ceroso. "
            "É o esqueleto da rosa — mas tem teto IFRA baixo por alergênico.",
"nerol": "Isômero do geraniol, mais fresco e verde, menos doce. "
         "Use quando a rosa precisa parecer recém-cortada.",
"citronelol": "Rosa de BOTÃO: fresca, leve, com lado cítrico. "
              "Mais transparente que o geraniol e igualmente restrito.",
"alcool feniletilico": "A rosa aquosa e suave que aceita dose enorme sem cansar. "
                       "É o volume da rosa; sozinho é meio plano.",
"acetato de feniletila": "Versão frutada e melífera do álcool feniletílico. "
                         "Puxa a rosa para mel e fruta.",
"rose oxide": "Rosa verde-metálica cortante, com lichia. Potentíssimo — "
              "é o 'brilho' no topo da rosa, em traço.",
"damascenona": "A molécula de impacto da rosa damascena: frutada, com ameixa e maçã. "
               "Uma das mais potentes da perfumaria; teto IFRA baixíssimo.",
"damascona": "Rosa frutada potente do grupo das cetonas de rosa. A alfa é mais "
             "maçã-verde, a beta mais ameixa, a delta mais verde.",
"rhodinol": "Mistura natural de citronelol e geraniol; rosa mais 'inteira' que "
            "qualquer um dos dois isolados.",

# --- cítricos: onde o usuário começou a reclamar ---------------------------
"limoneno": "O terpeno barato do limão: fresco mas some em minutos e oxida fácil. "
            "Serve de diluente cítrico, não de nota.",
"citral": "A molécula-chave do limão, potentíssima. Sensibilizante — use com "
          "quencher (limoneno/geraniol) e respeite o teto.",
"citronelal": "Cítrico com lado herbal e canforado, mais rústico que o citral. "
              "É a assinatura da citronela.",
"lemonile": "Nitrila de limão: mesmo efeito do citral com MUITO mais estabilidade "
            "em base e sabão. Não oxida como o citral.",
"citrathal": "Limão limpo e estável, feito para sobreviver em linha funcional.",
"dihidromircenol": "O 'fresco-aquático-cítrico' dos masculinos dos anos 90. "
                   "Lima e colônia com projeção enorme; hoje soa datado se exagerar.",
"acetato de linalila": "O coração de bergamota e lavanda. Mais doce e frutado que "
                       "o linalol sozinho.",
"linalol": "Floral-fresco onipresente; é o que dá 'lift' em quase tudo. "
           "Oxida com o tempo e o peróxido é que sensibiliza.",

# --- mentas e canforados ---------------------------------------------------
"mentol": "Frio físico na pele, além do cheiro. Em perfume é traço; passou disso "
          "vira pastilha para garganta.",
"mentona": "Menta sem o efeito gelado: mais herbal e seca que o mentol.",
"carvona": "A L é hortelã-pimenta; a D é cominho/endro. O mesmo material com "
           "estereoquímica trocada cheira a coisas completamente diferentes.",
"eucaliptol": "Cineol puro: fresco medicinal e penetrante. É o que dá o lado "
              "'farmácia' de muitos frescos.",
"canfora": "Gelado e medicinal, com lado de naftalina. Em traço dá lift a fougère; "
           "em excesso é cheiro de pomada.",
"salicilato de metila": "Wintergreen: mentolado-medicinal com lado de root beer. "
                        "Muito reconhecível — difícil de esconder numa fórmula.",

# --- ésteres frutados: quase todos 'maçã', quase todos diferentes ----------
"manzanate": "Maçã verde suculenta e realista. O mais 'fruta de verdade' do grupo.",
"fructone": "Maçã doce de bala, não de fruta. Barato e estável; bom em gourmand.",
"verdox": "Amadeirado-frutado com maçã por trás. Mais estrutura que os ésteres puros.",
"acetato de hexila": "Maçã-pêra verde e leve, some rápido. Topo puro.",
"isoamyl acetate": "Banana e bala de pêra, inconfundível. Difícil de usar sem "
                   "lembrar doce de festa infantil.",
"etil 2-metil butirato": "Maçã madura intensa e um pouco 'suco de caixinha'. "
                         "Potente para um éster.",
"allyl caproate": "Abacaxi cremoso e persistente, o mais forte dos abacaxis.",
"allyl amyl glycolate": "Abacaxi verde com gálbano; é o abacaxi 'de perfume', "
                        "não o de suco. Booster de florais modernos.",

# --- madeiras e terrosos ---------------------------------------------------
"patchouli": "Terroso, adocicado e canforado; melhora com o tempo no frasco. "
             "O óleo 'light' tira a canfora e deixa só o lado limpo.",
"vetiver": "Raiz defumada e terrosa. O do Haiti é mais limpo e cítrico; "
           "o de Java, mais defumado e escuro.",
"cedro": "O da Virgínia é lápis apontado e seco; o do Texas, mais áspero e "
         "canforado; o Atlas, mais resinoso e balsâmico.",
"cedramber": "Éter de cedro: amadeirado-âmbar seco, muito mais estável e barato "
             "que o óleo de cedro. Extensor de base.",
"acetato de cedrila": "Cedro macio e arredondado, sem a aspereza do óleo. "
                      "Fixador amadeirado discreto.",
"norlimbanol": "Madeira SECA extrema, quase oud sintético. Potentíssimo e áspero; "
               "traço já domina.",
"oud": "Nos catálogos brasileiros quase nunca é agarwood real — em geral é "
       "reconstituição com bétula, cypriol e madeira seca.",

# --- balsâmicos e resinas --------------------------------------------------
"olibano": "Incenso resinoso com lado cítrico-terpênico no topo. "
           "Menos doce que o benjoim, mais 'igreja'.",
"benjoim": "Resina doce de baunilha e caramelo. É o lado guloso das bases orientais.",
"opoponax": "Mirra doce: balsâmico quente com fundo animálico leve.",
"mirra": "Amarga e medicinal ao lado do benjoim; dá seriedade a acordes doces demais.",
"estoraque": "Cinâmico e acouroado. Ponte natural entre âmbar e couro.",

# --- couro e fumaça --------------------------------------------------------
"isobutil quinolina": "Couro AMARGO e seco, quase tinta. É o couro de Bandit — "
                      "potentíssimo e muito difícil de domar.",
"isobutilquinoleina": "Couro AMARGO e seco, quase tinta. É o couro de Bandit — "
                      "potentíssimo e muito difícil de domar.",
"safraleine": "Couro quente com açafrão e tabaco. Muito mais fácil de usar que a "
              "isobutil quinolina, e é a base do 'oud ocidental'.",
"betula": "Alcatrão de bétula: fogueira e couro russo. O bruto é proibido pela "
          "IFRA; só o retificado é utilizável.",

# --- gourmand --------------------------------------------------------------
"etil maltol": "Algodão-doce puro; 3 a 4 vezes mais forte que o maltol. "
               "É o que fez a perfumaria gourmand dos anos 2000.",
"maltol": "Caramelo tostado, mais discreto e menos 'bala' que o etil maltol.",
"furaneol": "Morango cozido com caramelo. Potentíssimo e com lado quase de caldo "
            "de carne em dose alta.",
"vanilina": "Baunilha direta e barata; amarela a fórmula com o tempo.",
"etil vanilina": "3 a 4 vezes mais forte que a vanilina e mais caramelada, "
                 "porém menos 'baunilha de verdade'.",
"cumarina": "Feno doce e tonka — a assinatura do fougère. Teto IFRA de 1,5%.",
"heliotropina": "Amêndoa-baunilha empoada. Dá o lado cremoso e vintage do gourmand.",

# --- aquáticos e ozônicos: todos "mar", cada um de um jeito ----------------
"calone": "A molécula que criou o gênero aquático nos anos 90: melão oceânico com "
          "lado de maresia. Datada se exagerar — hoje entra em traço.",
"melonal": "Melão verde e aldeídico, mais fruta que mar. Menos 'sintético' que o "
           "Calone e mais fácil de esconder.",
"helional": "Aquático-ozônico com floral verde por trás. É o que dá o efeito "
            "'roupa secando ao vento' — mais elegante que o Calone.",
"floralozone": "Ozônico de ar livre com lado floral; o mais 'ar depois da chuva' "
               "do grupo. Muito difusivo.",
"ultrazur": "Marinho salgado e mineral, sem doçura de melão. Para acordes de "
            "maresia de verdade, não de perfume aquático comercial.",
"aphermate": "Aquático-frutado leve com lado de maçã e casca. Ponte entre o "
             "aquático e o frutado.",
"farenal": "Aldeído verde-aquático muito difusivo, quase metálico. Dá lift onde "
           "o Calone pesaria.",
"adoxal": "Aldeído verde-marinho potente e duradouro, com lado de lírio. "
          "Mais estrutura que os ozônicos leves.",
"seaweed": "Algas de verdade: iodado, salgado e um pouco podre. Nada a ver com o "
           "aquático limpo — é mar real, e em dose alta incomoda.",
"aldeido myrac": "Aldeído verde-marinho com cítrico no topo. Ponte entre o cítrico "
                 "e o aquático.",
"rosalva": "Aldeído com rosa aquosa e lado de melão; floral molhado em vez de mar.",
"canthoxal": "Aldeído anisado com lado aquático e de espinheiro. "
             "Mais floral-empoado que marinho.",

# --- especiarias: onde a diferença é calor contra corte --------------------
"eugenol": "O cravo cru: quente, medicinal e dentário. Sensibilizante forte, "
           "com teto IFRA baixíssimo — traço resolve.",
"isoeugenol": "Cravo mais macio e floral que o eugenol, puxando cravina. "
              "Teto ainda mais baixo: ~0,008% Cat 4.",
"acetil isoeugenol": "Versão acetilada: cravo atalcado e doce, de longa duração. "
                     "Muito mais gentil que o isoeugenol livre.",
"cinamaldeido": "Canela de verdade, quente e mordente. Sensibilizante e com teto "
                "IFRA apertado; em excesso arranha a pele.",
"cinnamyl acetate": "Canela suavizada, com lado floral-balsâmico. "
                    "É a canela que dá para usar em dose de trabalho.",
"pimenta preta": "Pimenta seca e terpênica, com lado de madeira. "
                 "Dá corte no topo sem o doce da pimenta rosa.",
"pink peppercorn": "Pimenta rosa: frutada e efervescente, nada a ver com a preta. "
                   "É o topo onipresente da perfumaria dos anos 2010.",
"cardamomo": "Fresco-especiado com cineol; abre para o lado do eucalipto, "
             "não do calor. Ponte entre cítrico e especiaria.",
"gengibre": "Mordente e fresco, com lado de sabão e terra. O óleo 'fresh' é "
            "cítrico; o CO2, mais quente e realista.",
"cariofileno": "Especiado-amadeirado seco, presente no cravo e na pimenta. "
               "Dá estrutura seca sem trazer doçura.",
"bisabolol": "Floral-cremoso suave com lado de camomila. Mais calmante que "
             "especiado — usa-se para arredondar arestas.",
"metil diantilis": "Cravina doce com baunilha e um lado de especiaria empoada. "
                   "Substituto gentil do isoeugenol.",

# --- animálicos: a fronteira entre caráter e desastre ---------------------
"indol": "Sozinho cheira a naftalina e fezes; a 0,1% dentro de um jasmim é o que "
         "faz a flor parecer viva. Sempre em diluição de 1 a 10%.",
"indolene": "Indol em base pronta, já diluído e domado. Mais seguro que o cristal "
            "puro para quem está começando.",
"civet": "Quente, gorduroso e fecal em concentração; em traço dá o calor de pele "
         "que separa perfume de sabonete. Hoje sempre sintético.",
"castoreum": "Couro animal com mel e alcatrão. Reconstituição — o natural "
             "praticamente não existe mais no mercado.",
"metil anisol": "Fenólico com lado de narciso e estábulo. Em traço dá naturalidade "
                "a ylang e flores brancas; acima disso, suja tudo.",

# --- verdes: todos 'folha', cada um de um verde ---------------------------
"cis-3-hexenol": "A folha RASGADA: grama recém-cortada, brutalmente realista e "
                 "potente. Traço já domina; é o verde mais natural que existe.",
"cis-3-hexenila": "Éster do álcool de folhas: mesmo verde, porém mais suave, "
                  "frutado e muito mais fácil de dosar.",
"galbano": "Verde AMARGO e resinoso, quase de pimentão. É o verde 'adulto' — "
           "nada a ver com o verde doce dos ésteres.",
"spirogalbanone": "Gálbano moderno, mais limpo e menos amargo que a resina. "
                  "Dá o verde sem o lado de terra.",
"stemone": "Folha de figo e ramo de tomate: verde leitoso e um pouco medicinal. "
           "Assinatura dos verdes modernos.",
"triplal": "Verde CORTANTE e aldeídico, com folha de tomate. Potentíssimo e "
           "agressivo; abre acorde verde em traço.",
"ligustral": "Mesmo material do Triplal: verde aldeídico afiado, para traço.",
"folione": "Folha de violeta e pepino, verde-gorduroso. Teto IFRA muito baixo — "
           "some com ele em dose de trabalho.",
"vernaldehyde": "Aldeído verde com melão e muguet; mais macio que o Triplal.",
"dupical": "Aldeído de folhagem verde com lado de muguet; verde floral, não cortante.",
"anther": "Éter verde frutado e transparente; verde leve para topo, sem amargor.",
"undercarvetol": "Verde herbal com lado de menta e hortelã; verde 'aromático' "
                 "em vez de folha.",
"salicilato de hexila": "Verde-floral macio com lado de protetor solar. "
                        "Dá volume e fixação a florais modernos.",

# --- ésteres frutados: o mapa que evita comprar cinco vezes a mesma coisa --
"butirato de etila": "Abacaxi-maçã doce e volátil; o éster frutado mais básico. "
                     "Some em minutos — é topo puro.",
"etil 2-metil butirato": "Maçã madura intensa, quase suco concentrado. "
                         "Bem mais potente que o butirato de etila simples.",
"ethyl isovaler": "Maçã com um fundo queijoso; é o éster que dá o lado 'fruta "
                  "fermentada'. Use pouco.",
"ethyl valerianate": "Maçã verde seca, menos doce que os butiratos.",
"methyl butyrate": "Maçã-abacaxi cortante e muito volátil; o mais agressivo do grupo.",
"hexyl butyrate": "Frutado verde com pêra; mais pesado e duradouro que os etílicos.",
"butirato de amila": "Damasco-pêssego cremoso, mais gordo que os butiratos leves.",
"heptanoato de etila": "Uva e conhaque; o éster 'vinho' do grupo.",
"ethyl caprynate": "Frutado ceroso e gorduroso, quase sabão. Fixa mais que os leves.",
"ethyl caproate": "Abacaxi-banana com fundo ceroso. Meio-termo entre fruta e gordura.",
"ethyl caprylate": "Frutado ceroso com lado de laranja; mais discreto e persistente.",
"ethyl benzoate": "Frutado balsâmico com lado de camomila; ponte para o gourmand.",
"benzoato de metila": "Ylang-frutado com lado medicinal; menos fruta, mais flor.",
"acetato de prenila": "Maçã-abacaxi verde; frutado leve e de topo.",
"allyl cyclohexyl propionate": "Abacaxi maduro intenso e persistente — o abacaxi "
                               "mais forte do catálogo.",
"propionato de isoamila": "Abacaxi-damasco doce; parente mais macio do acetato de isoamila.",
"isobutirato de fenoxietila": "Frutado-floral rosado e discreto; mais fixador que nota.",
"glycolierral": "Frutado verde com lado de melão e violeta; moderno e transparente.",
"cyclabute": "Frutado tropical difusivo de topo, com maracujá. Moderno e caro.",
"trans-2-hexenol": "Verde-frutado de folha e maçã verde; entre o verde cortante "
                   "e o frutado leve.",
"liffarome": "Folha verde com lado de morango; o verde 'frutado' por excelência.",
"octalactona": "Coco-creme leve; lactona discreta para arredondar frutas.",
"dodecalactona": "Pêssego-coco cremoso e persistente; das lactonas mais gordas.",
"nectaril": "Pêssego suculento e moderno, sem o lado enjoativo das lactonas clássicas.",
"acido butirico": "Não é perfume: manteiga rançosa e vômito. Existe no catálogo "
                  "como traço para dar realismo a fruta — em ppm, nunca mais.",

# --- lavandas e herbais: a diferença é quanta cânfora ----------------------
"lavanda fran": "Lavanda fina de altitude: floral, doce e com pouca cânfora. "
                "A mais cara e a mais bonita do grupo.",
"lavandin": "Híbrido mais barato e mais canforado que a lavanda verdadeira. "
            "Rende volume, mas endurece o acorde.",
"lavandula": "Lavanda: floral-herbal com acetato de linalila. Quanto mais alta a "
             "altitude, menos cânfora e mais floral.",
"dimetol": "Herbal-floral limpo e suave, quase muguet; lavanda sem a cânfora.",
"linalool oxyde": "Fresco-doce com lado terroso; dá sustentação a florais sem "
                  "trazer o floral de volta.",
"amyl vinyl carbinol": "Verde-herbal fresco com lado de folha esmagada.",
"tarragon": "Estragão: anisado e herbal, com lado doce. Muito reconhecível.",
"fenchone": "Canforado-anisado, mais seco que a cânfora. Lado de funcho.",
"borneol": "Canforado amadeirado, menos gelado que a cânfora e mais terroso.",
"acetato de isobornila": "Pinho-canforado limpo; o cheiro de floresta de produto "
                         "de limpeza, no bom sentido.",
"timol": "Fenólico-herbal de tomilho: medicinal e antisséptico. Em traço dá "
         "caráter; acima disso vira gargarejo.",
"niaouli": "Cineol com lado doce e ligeiramente frutado; parente mais macio do "
           "tea tree.",
"tea tree": "Medicinal, terroso e um pouco sulfuroso. Difícil em perfumaria fina; "
            "mais útil em linha funcional.",
"alcaravia": "Carvi: anisado-especiado com lado de pão de centeio.",
"mint arvensis": "Menta de campo, mais áspera e canforada que a piperita. "
                 "É de onde vem o mentol industrial.",
"menta piperita": "Hortelã-pimenta: mentolada e doce, a menta 'bonita'.",

# --- florais: rosas, jasmins e salicilatos --------------------------------
"rosyrane": "Rosa verde-metálica moderna, transparente e difusiva; mais 'rosa de "
            "perfume' que de jardim.",
"acetato rosa": "Cristais de rosa: rosa doce e cerosa, muito estável em base.",
"fenoxietanol": "Rose ether: rosa fraca e discreta, mais conservante que nota.",
"pau-rosa": "Linalol natural com lado amadeirado; rosa suave e transparente.",
"benzofenona": "Floral-rosado leve com lado de gerânio; usado mais como fixador.",
"acetato de benzila": "O jasmim barato: floral-frutado limpo, sem o índol. "
                      "Volume de flor branca sem sujeira.",
"jasmal": "Jasmim frutado moderno com lado de pêssego; mais fácil que o hedione.",
"hedione": "Jasmim transparente e radiante. Não cheira a muito sozinho, mas "
           "aceita 20-30% e é o que dá 'ar' à fórmula inteira.",
"acetato de citronelila": "Rosa frutada suave com lado verde; mais discreta que "
                          "o citronelol livre.",
"acetato de geranila": "Rosa frutada doce, mais estável que o geraniol e sem o "
                       "mesmo teto de alergênico.",
"salicilato de isoamila": "Floral-verde com lado de trevo; o mais 'orquídea' dos "
                          "salicilatos.",
"salicilato de benzila": "O acorde de protetor solar. Fixa florais e dá volume, "
                         "com cheiro quase imperceptível sozinho.",
"salicilato de feniletila": "Floral-balsâmico doce com rosa; fixador macio.",
"farnesol": "Floral suave de tília e muguet; mais conhecido como desodorante "
            "natural que como nota.",
"etil safranato": "Açafrão-frutado seco com lado de couro; ponte entre especiaria "
                  "e floral moderno.",
"geranium": "Rosa VERDE com menta: o gerânio é a rosa 'masculina', usada em "
            "fougères onde a rosa seria doce demais.",
"ylang": "Floral cremoso com banana e borracha. O 'extra' é mais floral; "
         "o terceiro, mais amadeirado e barato.",
"osmanthus": "Damasco com couro e chá; floral frutado dos mais complexos.",
"tuberosa": "Flor branca cremosa com lado de gasolina e cânfora. Não é jasmim: "
            "é muito mais pesada e narcótica.",
"gardenia": "Flor branca com lactona de coco e cogumelo. Nenhuma reconstituição "
            "chega perto do natural, que não existe comercialmente.",
"mimosa": "Floral empoado com mel e amêndoa; verde-amarelo e delicado.",
"narciso": "Floral verde com feno e um lado animálico; das flores mais 'sujas'.",
"jacinto": "Verde-floral aquoso com lado metálico; primavera fria.",

# --- cítricos: terpenos, nitrilas e óleos ---------------------------------
"terpeno de limao": "Subproduto barato da destilação do limão: cheiro fraco e "
                    "oxida rápido. Serve de diluente cítrico, não de nota.",
"terpeno de laranja": "Mesma lógica do de limão: d-limoneno quase puro, barato e "
                      "volátil. Mais veículo que perfume.",
"terpenos de bergamota": "Fração terpênica da bergamota: o frescor sem o floral "
                         "do acetato de linalila. Mais barato e menos fino.",
"lemongrass": "Capim-limão: citral bruto com lado herbal e rústico. "
              "Mais áspero e mais barato que o óleo de limão.",
"litsea": "May chang: citral com floral por trás, mais suave que o lemongrass. "
          "Boa alternativa barata ao limão.",
"verbena": "Verbena verdadeira é caríssima e rara; o que se vende costuma ser "
           "litsea ou mistura de citral. Confira a origem.",
"limao siciliano": "O óleo de limão clássico, prensado a frio: fresco e realista, "
                   "mas fototóxico e some rápido.",
"mandarina": "Mais doce e menos ácida que a laranja, com lado floral. "
             "A verde é mais amarga e vibrante; a amarela, mais açucarada.",
"tangerinol": "Tangerina sintética estável, sem a fototoxicidade do óleo.",
"clonal": "Mandarina sintética com lado aldeídico; estável e difusiva.",
"nitrile": "Nitrila: mesma direção olfativa do aldeído correspondente, porém MUITO "
           "mais estável em sabão e alvejante. É a versão que sobrevive à base.",
"nitrilo": "Nitrila: mesma direção olfativa do aldeído correspondente, porém MUITO "
           "mais estável em sabão e alvejante. É a versão que sobrevive à base.",
"petitgrain": "Folha e galho da laranjeira: verde-amargo e amadeirado, nada a ver "
              "com a flor (neroli) nem com a fruta.",
"palmarosa": "Rosa barata via geraniol natural; mais herbal e menos fina que a "
             "rosa de verdade.",
"peonile": "Nitrila de gerânio: rosa-verde estável, para linha funcional.",
"pimenta rosa": "Frutada e efervescente, não pungente. Confundida com pimenta "
                "preta no nome, é outro cheiro completamente.",
"dimethyl octenone": "Cítrico-frutado difusivo e moderno; menos limão, mais casca.",
"methyl heptenone": "Cítrico-verde leve com lado de capim; bloco de construção barato.",

# --- madeiras e coníferas --------------------------------------------------
"guaiaco": "Madeira defumada e adocicada, com lado de rosa. "
           "Fixador amadeirado dos mais persistentes.",
"copaiba": "Amadeirado-balsâmico suave com lado de pimenta; barato e discreto.",
"acetato de cedrenila": "Cedro macio e ambarado, mais redondo que o cedrila.",
"trimofix": "Amadeirado-âmbar seco e muito substantivo; base que segura por dias.",
"sabineno": "Terpênico amadeirado com lado de pimenta e conífera; fresco e volátil.",
"alfa-pineno": "Pinho resinoso e fresco; oxida rápido e o peróxido é que irrita.",
"beta-pineno": "Mais verde e menos resinoso que o alfa; conífera fresca.",
"pineno": "Pinho resinoso; a fração que dá o cheiro de floresta. Oxida fácil.",
"cipreste": "Conífera seca com lado de fumaça; menos doce que o pinho.",
"patchoulol": "O álcool isolado do patchouli: o lado limpo e amadeirado, sem a "
              "terra e a canfora do óleo bruto.",
"tetrahidromircenol": "Lima-floral limpa e muito estável; versão 'domada' do "
                      "dihidromircenol para base e sabão.",
"limetol": "Lima fresca sintética, estável e difusiva.",
"verdila": "Amadeirado-verde frutado com lado de maçã; ponte entre madeira e fruta.",

# --- gourmand ---------------------------------------------------------------
"lactona de leite": "Leite condensado cremoso; a lactona mais 'láctea' do grupo.",
"gamma-decalactona": "Pêssego cremoso clássico. A gama é mais frutada; a delta, "
                     "mais leitosa e cremosa.",
"delta decalactona": "Coco-leite cremoso, mais gordo e menos frutado que a gama.",
"metil laitone": "Lactona leitosa e cremosa potentíssima; traço já dá corpo.",
"veloutone": "Cremoso-amadeirado aveludado com lado de creme de leite; moderno.",
"acetoina": "Manteiga e creme fresco; o cheiro de laticínio de verdade.",
"acetanisol": "Baunilha-anisada doce com lado de feno; barato e eficaz.",
"veratraldeido": "Baunilha empoada com lado de heliotrópio; mais seca que a vanilina.",
"acetofenona": "Amêndoa-cereja doce com lado de mimosa; frutado-floral.",
"benzaldeido": "Amêndoa amarga e cereja — o cheiro de marzipã. "
               "Oxida a ácido benzoico com o tempo.",
"pirazina": "Tostado: café, cacau, pão torrado. Potentíssima e em ppm; "
            "é o que dá o lado 'assado' dos gourmands.",
"coffee mercaptan": "Café torrado real, com o lado sulfuroso da bebida. "
                    "Uma das moléculas mais potentes que existem — partes por bilhão.",
"jasmonyl": "Frutado-floral cremoso com lado de jasmim e pêssego; arredonda gourmand.",
"ethyl laurate": "Ceroso-frutado leve e gorduroso; mais textura que cheiro.",
}
