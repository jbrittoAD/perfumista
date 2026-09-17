# -*- coding: utf-8 -*-
"""
deck_lexicon.py — Vocabulário do deck de cartas (app swipe).

Três tabelas, todas curadas à mão para perfumaria:

  PHOTO_KEYS  — os "objetos do mundo real" que cada cheiro evoca. Cada carta
                recebe UMA chave (foto de tela cheia + gradiente de fallback).
  LEX         — descritores olfativos EN/PT → rótulo PT curto (chips de faceta).
                Também é o que alimenta o resumo quando a descrição crua é lixo.
  FAMILIES    — metadados das 15 famílias canônicas (rótulo, cor de tampa, ordem
                do "baralho", âncora de ordenação por proximidade olfativa).

Sem dependências; consumido só por build_deck.py.
"""

# ---------------------------------------------------------------------------
# FAMÍLIAS
# ---------------------------------------------------------------------------
# ordem = sequência sugerida do baralho (do mais fácil/imediato ao mais denso).
# anchor = tokens do material "protótipo" da família; a ordenação por proximidade
# olfativa começa por quem mais se parece com a âncora e caminha por vizinhança.
FAMILIES = [
    dict(slug="citrus",    label="Cítrica",              cap="amarelo",      hex="#e6c84f",
         emoji="🍋", order=1,  anchor=["limao", "lemon", "citrico", "citrus", "fresco"],
         blurb="A abertura. Voláteis, luminosos, duram pouco e chamam atenção primeiro."),
    dict(slug="aldehydic", label="Aldeídica",            cap="verde-agua",   hex="#5bc8c2",
         emoji="🥂", order=2,  anchor=["aldeidico", "aldehydic", "ceroso", "waxy", "ensaboado"],
         blurb="Faísca de champanhe e roupa passada. Traço potente: erra a dose e vira vela."),
    dict(slug="green",     label="Verde",                cap="verde-folha",  hex="#6fbf73",
         emoji="🌿", order=3,  anchor=["verde", "green", "folha", "leaf", "grama"],
         blurb="Talo partido, grama cortada, seiva. Dá realismo e corta o doce."),
    dict(slug="herbal",    label="Aromática / Herbal",   cap="azul",         hex="#3f6fd1",
         emoji="🌾", order=4,  anchor=["herbal", "aromatico", "lavanda", "alecrim", "canforado"],
         blurb="Ervas de jardim e canfora. A espinha dos fougères e dos masculinos clássicos."),
    dict(slug="aquatic",   label="Aquática",             cap="verde-agua",   hex="#5bc8c2",
         emoji="🌊", order=5,  anchor=["marinho", "marine", "aquatico", "ozonico", "melao"],
         blurb="Maresia, ozônio, pedra molhada. Moderno, transparente, fácil de exagerar."),
    dict(slug="fruity",    label="Frutada",              cap="laranja",      hex="#e08a3c",
         emoji="🍑", order=6,  anchor=["frutado", "fruity", "pessego", "maca", "pera"],
         blurb="Polpa madura. Dá volume e apelo imediato — a armadilha é o ar de bala."),
    dict(slug="floral",    label="Floral",               cap="pink",         hex="#e8749e",
         emoji="🌸", order=7,  anchor=["floral", "rosa", "jasmim", "flor", "petala"],
         blurb="O coração da maioria das fórmulas. Do sabonete branco ao índol animálico."),
    dict(slug="spicy",     label="Especiaria",           cap="azul",         hex="#3f6fd1",
         emoji="🌶️", order=8,  anchor=["especiado", "spicy", "pimenta", "cravo", "canela"],
         blurb="Calor e atrito. Em traço acende a fórmula; em excesso vira armário de tempero."),
    dict(slug="woody",     label="Amadeirada",           cap="verde-escuro", hex="#2f7d4f",
         emoji="🪵", order=9,  anchor=["amadeirado", "woody", "cedro", "sandalo", "madeira"],
         blurb="Estrutura seca e longa. Segura tudo que está por cima sem aparecer."),
    dict(slug="balsamic",  label="Balsâmica / Resinosa", cap="preto",        hex="#3a3a42",
         emoji="🕯️", order=10, anchor=["balsamico", "resinoso", "benjoim", "incenso", "resina"],
         blurb="Resina quente e fumaça de igreja. Fecha a base com doçura escura."),
    dict(slug="amber",     label="Âmbar / Oriental",     cap="preto",        hex="#3a3a42",
         emoji="🟤", order=11, anchor=["ambar", "amber", "quente", "baunilha", "labdano"],
         blurb="O grande bloco quente: baunilha, labdano, tonka. Fixa e envolve."),
    dict(slug="gourmand",  label="Gourmand",             cap="laranja",      hex="#e08a3c",
         emoji="🍮", order=12, anchor=["doce", "sweet", "caramelo", "baunilha", "gourmand"],
         blurb="Comida no perfume: caramelo, leite, café. Vicia rápido e enjoa rápido."),
    dict(slug="leather",   label="Couro",                cap="preto",        hex="#3a3a42",
         emoji="🧳", order=13, anchor=["couro", "leather", "defumado", "birch", "tabaco"],
         blurb="Fumaça, betume e pele curtida. Dá caráter adulto e um quê de perigo."),
    dict(slug="animalic",  label="Animálica",            cap="preto",        hex="#3a3a42",
         emoji="🐾", order=14, anchor=["animalico", "animalic", "civeta", "castoreo", "indol"],
         blurb="Calor corporal. Em traço homeopático é o que separa perfume de sabonete."),
    dict(slug="musk",      label="Almíscar",             cap="branco",       hex="#e8e8ee",
         emoji="🤍", order=15, anchor=["almiscar", "musk", "limpo", "pele", "macio"],
         blurb="Pele limpa e lençol seco. Quase invisível sozinho, indispensável no conjunto."),
]

FAMILY_BY_SLUG = {f["slug"]: f for f in FAMILIES}

CAP_LABEL = {
    "amarelo": "Cítrica", "pink": "Floral", "verde-folha": "Verde/Herbácea",
    "verde-escuro": "Amadeirada/Chipre", "verde-agua": "Aquática/Aldeídica",
    "laranja": "Gourmand/Frutada", "azul": "Aromática/Especiaria",
    "preto": "Oriental/Âmbar/Couro", "branco": "Almíscar",
}

# ---------------------------------------------------------------------------
# LÉXICO DE DESCRITORES  (chave = token normalizado sem acento, minúsculo)
# ---------------------------------------------------------------------------
# valor = (rótulo PT do chip, peso). Peso alto = descritor específico e
# informativo (dá boa faceta); peso baixo = genérico ("doce", "fresco").
LEX = {
    # cítricos
    "lemon": ("Limão", 3), "limao": ("Limão", 3), "citrus": ("Cítrico", 2), "citrico": ("Cítrico", 2),
    "citrica": ("Cítrico", 2), "bergamot": ("Bergamota", 3), "bergamota": ("Bergamota", 3),
    "orange": ("Laranja", 3), "laranja": ("Laranja", 3), "mandarin": ("Tangerina", 3),
    "tangerina": ("Tangerina", 3), "mandarina": ("Tangerina", 3), "grapefruit": ("Grapefruit", 3),
    "toranja": ("Grapefruit", 3), "lime": ("Lima", 3), "lima": ("Lima", 3), "petitgrain": ("Petitgrain", 3),
    "neroli": ("Neroli", 3), "yuzu": ("Yuzu", 3), "zest": ("Casca cítrica", 2), "casca": ("Casca cítrica", 1),
    # verdes
    "green": ("Verde", 2), "verde": ("Verde", 2), "leaf": ("Folha", 3), "folha": ("Folha", 3),
    "grass": ("Grama cortada", 3), "grama": ("Grama cortada", 3), "galbanum": ("Gálbano", 3),
    "galbano": ("Gálbano", 3), "violet leaf": ("Folha de violeta", 3), "seiva": ("Seiva", 3),
    "sap": ("Seiva", 3), "herbaceo": ("Herbáceo", 2), "herbaceous": ("Herbáceo", 2),
    "cucumber": ("Pepino", 3), "pepino": ("Pepino", 3), "tomato": ("Ramo de tomate", 3),
    # herbal / aromático
    "lavender": ("Lavanda", 3), "lavanda": ("Lavanda", 3), "rosemary": ("Alecrim", 3),
    "alecrim": ("Alecrim", 3), "basil": ("Manjericão", 3), "manjericao": ("Manjericão", 3),
    "mint": ("Menta", 3), "menta": ("Menta", 3), "hortela": ("Menta", 3), "peppermint": ("Menta", 3),
    "sage": ("Sálvia", 3), "salvia": ("Sálvia", 3), "thyme": ("Tomilho", 3), "tomilho": ("Tomilho", 3),
    "eucalyptus": ("Eucalipto", 3), "eucalipto": ("Eucalipto", 3), "camphor": ("Canforado", 3),
    "canfora": ("Canforado", 3), "canforado": ("Canforado", 3), "anise": ("Anis", 3), "anis": ("Anis", 3),
    "licorice": ("Alcaçuz", 3), "alcacuz": ("Alcaçuz", 3), "fennel": ("Erva-doce", 3),
    "chamomile": ("Camomila", 3), "camomila": ("Camomila", 3), "aromatic": ("Aromático", 1),
    "aromatico": ("Aromático", 1), "herbal": ("Herbal", 2), "feno": ("Feno", 3), "hay": ("Feno", 3),
    "tea": ("Chá", 3), "cha ": ("Chá", 3),
    # floral
    "rose": ("Rosa", 3), "rosa": ("Rosa", 3), "rosy": ("Rosa", 3), "jasmine": ("Jasmim", 3),
    "jasmim": ("Jasmim", 3), "muguet": ("Muguet", 3), "lily of the valley": ("Muguet", 3),
    "lirio": ("Lírio", 3), "lily": ("Lírio", 3), "violet": ("Violeta", 3), "violeta": ("Violeta", 3),
    "iris": ("Íris", 3), "orris": ("Íris", 3), "ylang": ("Ylang-ylang", 3), "gardenia": ("Gardênia", 3),
    "tuberose": ("Tuberosa", 3), "tuberosa": ("Tuberosa", 3), "narciso": ("Narciso", 3),
    "narcissus": ("Narciso", 3), "mimosa": ("Mimosa", 3), "magnolia": ("Magnólia", 3),
    "freesia": ("Frésia", 3), "fresia": ("Frésia", 3), "peony": ("Peônia", 3), "peonia": ("Peônia", 3),
    "geranium": ("Gerânio", 3), "geranio": ("Gerânio", 3), "carnation": ("Cravina", 3),
    "cravina": ("Cravina", 3), "lilac": ("Lilás", 3), "lilas": ("Lilás", 3), "floral": ("Floral", 1),
    "flor de laranjeira": ("Flor de laranjeira", 3), "orange blossom": ("Flor de laranjeira", 3),
    "azahar": ("Flor de laranjeira", 3), "heliotrope": ("Heliotrópio", 3), "heliotropio": ("Heliotrópio", 3),
    "white floral": ("Flor branca", 2), "flor branca": ("Flor branca", 2),
    # frutas
    "apple": ("Maçã", 3), "maca": ("Maçã", 3), "pear": ("Pêra", 3), "pera": ("Pêra", 3),
    "peach": ("Pêssego", 3), "pessego": ("Pêssego", 3), "apricot": ("Damasco", 3), "damasco": ("Damasco", 3),
    "pineapple": ("Abacaxi", 3), "abacaxi": ("Abacaxi", 3), "strawberry": ("Morango", 3),
    "morango": ("Morango", 3), "raspberry": ("Framboesa", 3), "framboesa": ("Framboesa", 3),
    "cassis": ("Cassis", 3), "blackcurrant": ("Cassis", 3), "melon": ("Melão", 3), "melao": ("Melão", 3),
    "banana": ("Banana", 3), "grape": ("Uva", 3), "uva": ("Uva", 3), "cherry": ("Cereja", 3),
    "cereja": ("Cereja", 3), "plum": ("Ameixa", 3), "ameixa": ("Ameixa", 3), "coconut": ("Coco", 3),
    "coco": ("Coco", 3), "fig": ("Figo", 3), "figo": ("Figo", 3), "berry": ("Frutas vermelhas", 2),
    "fruity": ("Frutado", 1), "frutado": ("Frutado", 1), "tropical": ("Tropical", 2),
    "maracuja": ("Maracujá", 3), "passion fruit": ("Maracujá", 3), "abacate": ("Abacate", 3),
    # gourmand
    "vanilla": ("Baunilha", 3), "baunilha": ("Baunilha", 3), "caramel": ("Caramelo", 3),
    "caramelo": ("Caramelo", 3), "chocolate": ("Chocolate", 3), "cocoa": ("Cacau", 3), "cacau": ("Cacau", 3),
    "coffee": ("Café", 3), "cafe": ("Café", 3), "honey": ("Mel", 3), "mel ": ("Mel", 3),
    "almond": ("Amêndoa", 3), "amendoa": ("Amêndoa", 3), "hazelnut": ("Avelã", 3), "avela": ("Avelã", 3),
    "milk": ("Leite", 3), "leite": ("Leite", 3), "lactonic": ("Lactônico", 3), "lactonico": ("Lactônico", 3),
    "creamy": ("Cremoso", 2), "cremoso": ("Cremoso", 2), "butter": ("Manteiga", 3), "manteiga": ("Manteiga", 3),
    "sugar": ("Açúcar", 2), "acucar": ("Açúcar", 2), "cotton candy": ("Algodão doce", 3),
    "algodao doce": ("Algodão doce", 3), "rum": ("Rum", 3), "whisky": ("Whisky", 3),
    "biscuit": ("Biscoito", 3), "biscoito": ("Biscoito", 3), "bread": ("Pão", 3), "pao ": ("Pão", 3),
    "maltol": ("Malte doce", 3), "praline": ("Praliné", 3), "tonka": ("Tonka", 3), "coumarin": ("Cumarina", 3),
    "cumarina": ("Cumarina", 3), "sweet": ("Doce", 1), "doce": ("Doce", 1),
    # especiarias
    "pepper": ("Pimenta", 3), "pimenta": ("Pimenta", 3), "cinnamon": ("Canela", 3), "canela": ("Canela", 3),
    "clove": ("Cravo", 3), "cravo": ("Cravo", 3), "nutmeg": ("Noz-moscada", 3), "noz-moscada": ("Noz-moscada", 3),
    "cardamom": ("Cardamomo", 3), "cardamomo": ("Cardamomo", 3), "ginger": ("Gengibre", 3),
    "gengibre": ("Gengibre", 3), "saffron": ("Açafrão", 3), "acafrao": ("Açafrão", 3),
    "cumin": ("Cominho", 3), "cominho": ("Cominho", 3), "coriander": ("Coentro", 3),
    "spicy": ("Especiado", 2), "especiado": ("Especiado", 2), "condimentado": ("Especiado", 2),
    # madeiras
    "cedar": ("Cedro", 3), "cedro": ("Cedro", 3), "sandalwood": ("Sândalo", 3), "sandalo": ("Sândalo", 3),
    "vetiver": ("Vetiver", 3), "patchouli": ("Patchouli", 3), "oud": ("Oud", 3), "agarwood": ("Oud", 3),
    "guaiac": ("Guaiaco", 3), "guaiaco": ("Guaiaco", 3), "pine": ("Pinho", 3), "pinho": ("Pinho", 3),
    "fir": ("Abeto", 3), "cypress": ("Cipreste", 3), "cipreste": ("Cipreste", 3),
    "moss": ("Musgo", 3), "musgo": ("Musgo", 3), "oakmoss": ("Musgo de carvalho", 3),
    "woody": ("Amadeirado", 2), "amadeirado": ("Amadeirado", 2), "madeira": ("Amadeirado", 2),
    "dry wood": ("Madeira seca", 2), "earthy": ("Terroso", 2), "terroso": ("Terroso", 2),
    "papyrus": ("Papiro", 3), "birch": ("Bétula", 3), "betula": ("Bétula", 3),
    # âmbar / balsâmico / resina
    "amber": ("Âmbar", 3), "ambar": ("Âmbar", 3), "ambergris": ("Âmbar cinza", 3),
    "labdanum": ("Labdano", 3), "labdano": ("Labdano", 3), "benzoin": ("Benjoim", 3),
    "benjoim": ("Benjoim", 3), "myrrh": ("Mirra", 3), "mirra": ("Mirra", 3),
    "frankincense": ("Olíbano", 3), "olibano": ("Olíbano", 3), "incense": ("Incenso", 3),
    "incenso": ("Incenso", 3), "opoponax": ("Opoponax", 3), "styrax": ("Estoraque", 3),
    "balsamic": ("Balsâmico", 2), "balsamico": ("Balsâmico", 2), "resin": ("Resinoso", 2),
    "resinoso": ("Resinoso", 2), "resina": ("Resinoso", 2), "warm": ("Quente", 1), "quente": ("Quente", 1),
    # couro / animálico / fumaça
    "leather": ("Couro", 3), "couro": ("Couro", 3), "suede": ("Camurça", 3), "camurca": ("Camurça", 3),
    "smoky": ("Defumado", 3), "defumado": ("Defumado", 3), "smoke": ("Defumado", 3), "fumaca": ("Defumado", 3),
    "tobacco": ("Tabaco", 3), "tabaco": ("Tabaco", 3), "tar": ("Alcatrão", 3),
    "animalic": ("Animálico", 3), "animalico": ("Animálico", 3), "civet": ("Civeta", 3),
    "civeta": ("Civeta", 3), "castoreum": ("Castóreo", 3), "castoreo": ("Castóreo", 3),
    "indol": ("Indólico", 3), "indole": ("Indólico", 3), "fecal": ("Indólico", 3),
    "skin": ("Pele", 2), "pele": ("Pele", 2),
    # almíscar / limpo
    "musk": ("Almíscar", 3), "almiscar": ("Almíscar", 3), "musky": ("Almíscar", 3),
    "clean": ("Limpo", 2), "limpo": ("Limpo", 2), "soap": ("Sabonete", 3), "sabonete": ("Sabonete", 3),
    "sabao": ("Sabonete", 3), "soapy": ("Sabonete", 3), "ensaboad": ("Sabonete", 3),
    "laundry": ("Roupa lavada", 3), "powdery": ("Empoado", 2), "empoado": ("Empoado", 2),
    "atalcad": ("Empoado", 2), "talco": ("Empoado", 2), "cotton": ("Algodão", 2),
    # aquático / ozônico / aldeídico / metálico
    "marine": ("Marinho", 3), "marinho": ("Marinho", 3), "aquatic": ("Aquático", 2), "aquatico": ("Aquático", 2),
    "ozonic": ("Ozônico", 3), "ozonico": ("Ozônico", 3), "ozone": ("Ozônico", 3),
    "sea": ("Maresia", 3), "mar ": ("Maresia", 3), "salt": ("Salgado", 3), "salgado": ("Salgado", 3),
    "algae": ("Algas", 3), "alga": ("Algas", 3), "rain": ("Chuva", 3), "chuva": ("Chuva", 3),
    "aldehydic": ("Aldeídico", 3), "aldeidico": ("Aldeídico", 3), "aldeid": ("Aldeídico", 3),
    "waxy": ("Ceroso", 2), "ceroso": ("Ceroso", 2), "metallic": ("Metálico", 2), "metalico": ("Metálico", 2),
    "fresh": ("Fresco", 1), "fresco": ("Fresco", 1), "mineral": ("Mineral", 2),
    # textura / comportamento
    "fixative": ("Fixador", 2), "fixador": ("Fixador", 2), "diffusive": ("Difusivo", 2),
    "difusivo": ("Difusivo", 2), "radiant": ("Radiante", 2), "transparent": ("Transparente", 2),
    "transparente": ("Transparente", 2), "intense": ("Intenso", 1), "intenso": ("Intenso", 1),
    "suave": ("Suave", 1), "soft": ("Suave", 1), "seco": ("Seco", 1), "dry": ("Seco", 1),
    "medicinal": ("Medicinal", 2), "phenolic": ("Fenólico", 2), "fenolico": ("Fenólico", 2),
    "verde-agua": ("Aquático", 1),
}

# ---------------------------------------------------------------------------
# FOTOS — "o objeto do mundo real que o cheiro evoca"
# ---------------------------------------------------------------------------
# id       : slug do arquivo em public/photos/<id>.webp
# label    : legenda mostrada na carta
# emoji    : fallback e marca d'água
# grad     : gradiente de fallback (usado enquanto a foto carrega / se faltar)
# q        : consulta no Wikimedia Commons (fotografia do objeto real)
# kw       : termos que fazem a carta cair nessa foto (peso 3 = específico)
P = lambda i, l, e, g, q, kw: dict(id=i, label=l, emoji=e, grad=g, q=q, kw=kw)

PHOTO_KEYS = [
    # ---- cítricos
    P("limao", "Limão siciliano", "🍋", ["#f6e27a", "#7a6a12"], "lemon fruit close up", ["limao", "lemon", "citral", "limonene"]),
    P("bergamota", "Bergamota", "🍊", ["#e8d478", "#4e5f22"], "bergamot orange fruit", ["bergamot", "bergamota", "linalyl acetate", "acetato de linalila"]),
    P("laranja", "Laranja doce", "🍊", ["#f0a44a", "#6b3410"], "orange fruit slices", ["orange", "laranja", "sweet orange", "valencia"]),
    P("tangerina", "Tangerina", "🍊", ["#f2914a", "#5e2e0c"], "mandarin orange fruit", ["mandarin", "tangerina", "mandarina", "clementina"]),
    P("grapefruit", "Grapefruit", "🍊", ["#f08a7a", "#5e1f22"], "grapefruit cut half", ["grapefruit", "toranja", "pomelo", "nootkatone"]),
    P("lima", "Lima / Limão taiti", "🍈", ["#c8e06a", "#2f5216"], "lime fruit green close up", ["lime", "lima", "taiti", "key lime"]),
    P("flor-laranjeira", "Flor de laranjeira", "🌼", ["#f5e6c8", "#6b5a2a"], "orange blossom flower", ["neroli", "orange blossom", "flor de laranjeira", "azahar", "petitgrain"]),
    # ---- verdes
    P("grama", "Grama recém-cortada", "🌱", ["#9fd36a", "#22400f"], "freshly cut grass close up", ["grass", "grama", "cis-3-hexenol", "hexenol", "leaf alcohol"]),
    P("folha-figueira", "Folha de figueira", "🌿", ["#8ec06a", "#1f3a14"], "fig leaf green", ["fig leaf", "folha de figueira", "figo", "fig"]),
    P("galbano", "Gálbano (resina verde)", "🌾", ["#a8c169", "#2c3a12"], "galbanum resin plant", ["galbanum", "galbano"]),
    P("cha-verde", "Chá verde", "🍵", ["#b6cf7e", "#2e401a"], "green tea leaves cup", ["tea", "cha verde", "green tea", "matcha"]),
    P("hera", "Folhagem úmida", "🍃", ["#7fbf7a", "#183a1c"], "green leaves foliage macro", ["verde", "green", "leaf", "folha", "herbaceo", "herbaceous"]),
    P("pepino", "Pepino fatiado", "🥒", ["#bfe08a", "#274a20"], "cucumber slices", ["cucumber", "pepino", "violet leaf", "folha de violeta"]),
    # ---- herbal / aromático
    P("lavanda", "Campo de lavanda", "💜", ["#b6a6dd", "#2f2a52"], "lavender field flowers", ["lavender", "lavanda", "lavandin", "linalool"]),
    P("alecrim", "Alecrim", "🌿", ["#9bb98a", "#233a20"], "Rosmarinus officinalis leaves plant", ["rosemary", "alecrim", "cineol"]),
    P("manjericao", "Manjericão", "🌿", ["#8fc47f", "#1d3a16"], "basil leaves fresh", ["basil", "manjericao", "estragol", "methyl chavicol"]),
    P("menta", "Hortelã", "🌱", ["#8fd6b0", "#17402e"], "Mentha piperita leaves plant", ["mint", "menta", "hortela", "mentol", "menthol", "peppermint"]),
    P("salvia", "Sálvia esclareia", "🌾", ["#a9b492", "#333a22"], "clary sage plant", ["sage", "salvia", "sclarea", "esclareia"]),
    P("eucalipto", "Eucalipto", "🌿", ["#8fc2b6", "#1e3a36"], "Eucalyptus globulus leaves tree", ["eucalyptus", "eucalipto", "camphor", "canfora", "canforado"]),
    P("anis", "Anis estrelado", "⭐", ["#c8a77a", "#42280f"], "star anise Illicium verum spice", ["anise", "anis", "licorice", "alcacuz", "fennel", "erva-doce", "anetol"]),
    P("feno", "Feno cortado", "🌾", ["#d6c184", "#4a3a13"], "hay bales field straw", ["hay", "feno", "coumarin", "cumarina", "tonka"]),
    P("camomila", "Camomila", "🌼", ["#ecd88a", "#4d3f14"], "Matricaria chamomilla flowers", ["chamomile", "camomila"]),
    # ---- aquático
    P("mar", "Maresia na rocha", "🌊", ["#7fc4d6", "#123243"], "sea waves rocks coast", ["marine", "marinho", "sea", "maresia", "calone", "helional", "oceano"]),
    P("pedra-molhada", "Pedra molhada", "🪨", ["#9fb3bb", "#26343a"], "wet stones pebbles", ["mineral", "pedra", "petrichor", "ozonico", "ozonic", "ozone"]),
    P("chuva", "Chuva no vidro", "💧", ["#a3bdd1", "#1d2c3d"], "rain drops on glass", ["rain", "chuva", "aquatic", "aquatico", "water", "agua"]),
    P("melancia", "Melão / melancia", "🍉", ["#a8dd9a", "#2b4a26"], "watermelon slices red fruit", ["melon", "melao", "melancia", "watermelon", "cucumber melon"]),
    P("algas", "Algas marinhas", "🌿", ["#7fae9a", "#16332c"], "seaweed algae underwater", ["algae", "alga", "seaweed", "kelp"]),
    # ---- aldeídico
    P("champanhe", "Taça de champanhe", "🥂", ["#e6d9a0", "#4a3c14"], "champagne glass bubbles", ["aldehydic", "aldeidico", "aldeido", "aldehyde", "champagne", "efervescente"]),
    P("cera-vela", "Cera de vela", "🕯️", ["#e3d6bd", "#463b28"], "candle wax close up", ["waxy", "ceroso", "cera", "wax"]),
    P("lencol", "Lençol branco ao sol", "🏳️", ["#e8ecef", "#3c444c"], "white linen laundry hanging line", ["laundry", "roupa", "linen", "lencol", "clean", "limpo", "fresh air"]),
    # ---- frutas
    P("maca-verde", "Maçã verde", "🍏", ["#b8dd6a", "#2f4a13"], "green apples Malus fruit", ["apple", "maca", "hexyl acetate"]),
    P("pera", "Pêra", "🍐", ["#d8dd8a", "#46491c"], "pear fruit close up", ["pear", "pera"]),
    P("pessego", "Pêssego maduro", "🍑", ["#f3b183", "#5c2a18"], "peach fruit close up", ["peach", "pessego", "apricot", "damasco", "aldeido c14", "undecalactone"]),
    P("abacaxi", "Abacaxi", "🍍", ["#f0cd5f", "#4f3a0e"], "pineapple fruit slices", ["pineapple", "abacaxi", "allyl", "ananas"]),
    P("morango", "Morangos", "🍓", ["#ef7a86", "#4d121c"], "strawberries close up", ["strawberry", "morango", "furaneol", "aldeido c16"]),
    P("framboesa", "Framboesa", "🫐", ["#e0708f", "#3e1024"], "raspberries close up", ["raspberry", "framboesa", "raspberry ketone", "frutas vermelhas", "berry"]),
    P("cassis", "Cassis", "🫐", ["#a06fa8", "#2b1236"], "blackcurrant berries", ["cassis", "blackcurrant", "buchu"]),
    P("banana", "Banana", "🍌", ["#efd36a", "#4a3a0f"], "banana fruit close up", ["banana", "isoamyl acetate", "acetato de isoamila"]),
    P("uva", "Uvas", "🍇", ["#a87fc0", "#2c1440"], "grapes bunch close up", ["grape", "uva", "methyl anthranilate"]),
    P("cereja", "Cereja", "🍒", ["#de5f6e", "#43101a"], "Prunus avium cherries fruit red", ["cherry", "cereja", "benzaldehyde", "benzaldeido"]),
    P("ameixa", "Ameixa", "🟣", ["#a5709a", "#2f1330"], "Prunus domestica plums fruit purple", ["plum", "ameixa", "prune", "damascone"]),
    P("coco", "Coco aberto", "🥥", ["#e5d6b8", "#463823"], "coconut open half", ["coconut", "coco", "lactone", "gamma nonalactone"]),
    P("frutas-tropicais", "Frutas tropicais", "🥭", ["#f2b44f", "#553112"], "tropical fruits mango papaya", ["tropical", "mango", "manga", "maracuja", "passion fruit", "papaya"]),
    # ---- floral
    P("rosa", "Rosa vermelha", "🌹", ["#e88a9a", "#4a1420"], "red rose flower close up", ["rose", "rosa", "geraniol", "citronellol", "damascenone", "phenyl ethyl alcohol"]),
    P("jasmim", "Jasmim", "🤍", ["#f0ead8", "#4a4326"], "jasmine flowers white", ["jasmine", "jasmim", "hedione", "benzyl acetate", "jasmonate"]),
    P("muguet", "Muguet (lírio-do-vale)", "🔔", ["#dfe8d0", "#31401f"], "lily of the valley flowers", ["muguet", "lily of the valley", "lirio do vale", "lilial", "florhydral", "hidroxicitronelal"]),
    P("violeta", "Violeta", "💜", ["#a98fcf", "#2c1f4a"], "Viola odorata flowers purple", ["violet", "violeta", "ionone", "iona", "methyl ionone"]),
    P("iris", "Íris / raiz de orris", "🪻", ["#c9c0dd", "#37324e"], "iris flower purple", ["iris", "orris", "irone", "irisone"]),
    P("ylang", "Ylang-ylang", "💛", ["#ecd684", "#4a3d12"], "ylang ylang flower", ["ylang", "cananga"]),
    P("gardenia", "Gardênia", "🤍", ["#eef0e2", "#3f462e"], "gardenia flower white", ["gardenia", "tuberose", "tuberosa", "magnolia", "flor branca", "white floral"]),
    P("mimosa", "Mimosa", "💛", ["#f0dc7a", "#4e4113"], "Acacia dealbata mimosa yellow flowers", ["mimosa", "acacia", "cassie"]),
    P("geranio", "Gerânio", "🌸", ["#eb8fa6", "#451825"], "geranium flower pink", ["geranium", "geranio", "rose geranium"]),
    P("lilas", "Lilás", "💐", ["#c4a8dd", "#332448"], "Syringa vulgaris lilac flowers", ["lilac", "lilas", "terpineol"]),
    P("narciso", "Narciso", "🌼", ["#f0e3a8", "#4c4318"], "narcissus daffodil flower", ["narcissus", "narciso", "cresyl", "cresol"]),
    P("flor-generica", "Pétalas", "🌸", ["#e9a2bb", "#42192a"], "flower petals macro pastel", ["floral", "flor", "petala", "blossom", "bouquet"]),
    # ---- especiarias
    P("pimenta", "Pimenta-do-reino", "⚫", ["#b09a86", "#2e2419"], "black peppercorns Piper nigrum", ["pepper", "pimenta", "piperine", "rosa pepper"]),
    P("canela", "Canela em pau", "🟤", ["#c78a52", "#3d1f0c"], "cinnamon sticks", ["cinnamon", "canela", "cinnamic"]),
    P("cravo", "Cravo-da-índia", "🌰", ["#a87a55", "#31190c"], "clove spice close up", ["clove", "cravo", "eugenol", "isoeugenol"]),
    P("cardamomo", "Cardamomo", "💚", ["#c7cf94", "#3a4018"], "cardamom pods spice", ["cardamom", "cardamomo"]),
    P("noz-moscada", "Noz-moscada", "🌰", ["#c1a074", "#3a2a14"], "nutmeg spice close up", ["nutmeg", "noz-moscada", "mace", "macis"]),
    P("gengibre", "Gengibre", "🫚", ["#dcc287", "#4a3617"], "ginger root fresh", ["ginger", "gengibre"]),
    P("acafrao", "Açafrão", "🧡", ["#e0913f", "#4c2409"], "saffron threads Crocus stigmas", ["saffron", "acafrao", "safranal", "safraleine"]),
    P("especiarias", "Especiarias moídas", "🧂", ["#c99a68", "#3a2412"], "ground spices bowls", ["spicy", "especiado", "condimentado", "cumin", "cominho", "coriander", "coentro"]),
    # ---- madeiras
    P("cedro", "Lascas de cedro", "🪵", ["#c08d5e", "#3a2411"], "cedar wood planks timber texture", ["cedar", "cedro", "cedryl", "cedramber", "vertofix"]),
    P("sandalo", "Sândalo", "🪵", ["#d8b98a", "#453218"], "sandalwood logs powder", ["sandalwood", "sandalo", "santalol", "javanol", "polysantol", "ebanol"]),
    P("vetiver", "Raiz de vetiver", "🌾", ["#a89a6e", "#2f2c14"], "vetiver roots", ["vetiver", "vetiveryl"]),
    P("patchouli", "Patchouli", "🍂", ["#8d9a62", "#252e12"], "patchouli leaves dried", ["patchouli", "patchuli"]),
    P("madeira-seca", "Madeira seca", "🪵", ["#b99a72", "#33230f"], "dry wood grain texture plank", ["woody", "amadeirado", "madeira", "iso e super", "timberol", "amberwood", "cashmeran", "norlimbanol"]),
    P("musgo", "Musgo de carvalho", "🌲", ["#7f9a5e", "#1e2c12"], "oakmoss lichen tree", ["moss", "musgo", "oakmoss", "evernyl", "veramoss"]),
    P("pinho", "Floresta de pinheiros", "🌲", ["#7aa87f", "#14301c"], "pine forest Pinus trees green", ["pine", "pinho", "fir", "abeto", "cypress", "cipreste", "juniper", "zimbro"]),
    P("terra", "Terra úmida", "🟫", ["#9a8265", "#2b1f12"], "soil earth dark humus texture", ["earthy", "terroso", "geosmin", "beterraba", "truffle"]),
    P("oud", "Oud / agarwood", "🖤", ["#8a6a52", "#251509"], "agarwood oud wood chips incense", ["oud", "agarwood", "aoud"]),
    # ---- resinas / âmbar
    P("incenso", "Incenso queimando", "🕯️", ["#c4a88a", "#2d2013"], "frankincense resin Boswellia incense", ["incense", "incenso", "frankincense", "olibano", "myrrh", "mirra", "elemi"]),
    P("ambar-resina", "Resina de âmbar", "🟠", ["#d99a4e", "#3f2109"], "amber resin fossil stone golden", ["amber", "ambar", "ambroxan", "ambrox", "labdanum", "labdano", "cistus"]),
    P("benjoim", "Benjoim", "🟤", ["#c9a071", "#3a2412"], "benzoin resin amber", ["benzoin", "benjoim", "styrax", "estoraque", "opoponax", "balsamico", "balsamic", "peru balsam"]),
    P("baunilha", "Fava de baunilha", "🟤", ["#c9a37a", "#33200f"], "vanilla pods beans Vanilla planifolia", ["vanilla", "baunilha", "vanillin", "vanilina", "ethyl vanillin", "heliotropin", "heliotropina"]),
    P("tonka", "Fava tonka", "🟤", ["#bd9a72", "#2f1e10"], "tonka beans close up", ["tonka", "coumarin", "cumarina"]),
    # ---- gourmand
    P("caramelo", "Caramelo", "🍮", ["#dfa155", "#3c1f07"], "caramel sauce dessert sweet", ["caramel", "caramelo", "maltol", "toffee", "butterscotch"]),
    P("chocolate", "Chocolate", "🍫", ["#a5714c", "#2a1509"], "dark chocolate pieces", ["chocolate", "cocoa", "cacau"]),
    P("cafe", "Café torrado", "☕", ["#a8785a", "#241009"], "roasted coffee beans", ["coffee", "cafe", "espresso"]),
    P("mel", "Mel escorrendo", "🍯", ["#e5b054", "#4a2c08"], "honey jar dripping golden", ["honey", "mel", "phenylacetic", "beeswax"]),
    P("amendoa", "Amêndoas", "🌰", ["#d9bc8e", "#3f2d16"], "almonds close up", ["almond", "amendoa", "heliotrope", "benzaldehyde", "hazelnut", "avela", "praline"]),
    P("leite", "Leite / creme", "🥛", ["#eee6d8", "#443b2c"], "milk glass pouring white", ["milk", "leite", "lactonic", "lactonico", "creamy", "cremoso", "lactona"]),
    P("biscoito", "Biscoito / pão", "🍪", ["#d8ab72", "#42260e"], "cookies biscuits close up", ["biscuit", "biscoito", "bread", "pao", "bakery", "waffle"]),
    P("algodao-doce", "Algodão doce", "🍭", ["#f0a8c4", "#4a1a30"], "cotton candy pink", ["cotton candy", "algodao doce", "ethyl maltol", "sugar", "acucar", "bala", "candy"]),
    P("rum", "Rum / licor", "🥃", ["#c08a4e", "#3a2008"], "rum whisky glass amber", ["rum", "whisky", "cognac", "licor", "alcoolico"]),
    # ---- couro / animálico / fumaça
    P("couro", "Couro curtido", "🧳", ["#a87a55", "#2a1509"], "brown leather texture", ["leather", "couro", "suede", "camurca", "safraleine", "isobutyl quinoline"]),
    P("fumaca", "Fogueira / fumaça", "🔥", ["#9a8272", "#221610"], "campfire fire wood burning embers", ["smoky", "defumado", "birch", "betula", "tar", "alcatrao", "guaiacol", "creosol"]),
    P("tabaco", "Folha de tabaco", "🍂", ["#b08a54", "#31200c"], "tobacco leaves Nicotiana drying", ["tobacco", "tabaco"]),
    P("pele-animal", "Pelo / almíscar animal", "🐾", ["#a08a72", "#241a12"], "animal fur texture brown", ["animalic", "animalico", "civet", "civeta", "castoreum", "castoreo", "indol", "fecal"]),
    # ---- almíscar / limpo
    P("algodao", "Algodão branco", "🤍", ["#e8e8ee", "#3c3c48"], "white cotton fabric texture", ["musk", "almiscar", "galaxolide", "habanolide", "muscone", "ambrettolide", "exaltolide"]),
    P("sabonete", "Sabonete", "🧼", ["#dfe6ea", "#39424a"], "soap bars white bathroom", ["soap", "sabonete", "sabao", "soapy", "ensaboad", "clean", "limpo"]),
    P("po-arroz", "Pó de arroz", "🤍", ["#e6ddd2", "#443c33"], "face powder cosmetic compact", ["powdery", "empoado", "atalcad", "talco"]),
    # ---- técnico
    P("frasco", "Frasco de laboratório", "⚗️", ["#b9c4cc", "#2b3238"], "laboratory glass bottles chemistry", ["solvent", "solvente", "dpg", "ipm", "dietil ftalato", "diluente", "alcohol", "carrier"]),
    P("laboratorio", "Bancada de perfumista", "🧪", ["#c2b49a", "#302a20"], "perfume bottles laboratory organ", ["base", "reconstitution", "reconstituicao", "acorde"]),
]

PHOTO_BY_ID = {p["id"]: p for p in PHOTO_KEYS}

# Foto padrão por família (quando nenhum keyword bate).
FAMILY_PHOTO = {
    "citrus": "limao", "aldehydic": "champanhe", "green": "hera", "herbal": "alecrim",
    "aquatic": "mar", "fruity": "pessego", "floral": "flor-generica", "spicy": "especiarias",
    "woody": "madeira-seca", "balsamic": "benjoim", "amber": "ambar-resina",
    "gourmand": "caramelo", "leather": "couro", "animalic": "pele-animal", "musk": "algodao",
}
