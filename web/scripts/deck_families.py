# -*- coding: utf-8 -*-
"""
deck_families.py — De faceta para família, e o voto de reclassificação.

O `family_canon` que vem do pipeline é ruidoso (ESTADO.md já registra isso):
Tea Tree cai em "citrus", Fennel e Armoise caem em "woody". Num app cujo baralho
é AGRUPADO POR FAMÍLIA, esse erro fica na cara — o usuário vê erva-doce no meio
das madeiras. Então o build vota de novo: cada faceta detectada dá um voto para
a família a que ela pertence e, se a família original não tiver NENHUM voto e
outra tiver vantagem clara, a carta é remanejada.

FACET_FAMILY: rótulo PT (igual ao de deck_lexicon.LEX) → família canônica.
Rótulos transversais (Doce, Fresco, Suave, Fixador...) ficam de fora de
propósito: não são evidência de família.
"""

FACET_FAMILY = {
    # cítrica
    "Limão": "citrus", "Bergamota": "citrus", "Laranja": "citrus", "Tangerina": "citrus",
    "Grapefruit": "citrus", "Lima": "citrus", "Cítrico": "citrus", "Casca cítrica": "citrus",
    "Petitgrain": "citrus", "Yuzu": "citrus",
    # verde
    "Verde": "green", "Folha": "green", "Grama cortada": "green", "Gálbano": "green",
    "Folha de violeta": "green", "Seiva": "green", "Pepino": "green", "Ramo de tomate": "green",
    # herbal / aromática
    "Lavanda": "herbal", "Alecrim": "herbal", "Manjericão": "herbal", "Menta": "herbal",
    "Sálvia": "herbal", "Tomilho": "herbal", "Eucalipto": "herbal", "Canforado": "herbal",
    "Anis": "herbal", "Alcaçuz": "herbal", "Erva-doce": "herbal", "Camomila": "herbal",
    "Aromático": "herbal", "Herbal": "herbal", "Herbáceo": "herbal", "Feno": "herbal", "Chá": "herbal",
    # aquática
    "Marinho": "aquatic", "Aquático": "aquatic", "Ozônico": "aquatic", "Maresia": "aquatic",
    "Salgado": "aquatic", "Algas": "aquatic", "Chuva": "aquatic", "Mineral": "aquatic",
    # aldeídica
    "Aldeídico": "aldehydic", "Ceroso": "aldehydic",
    # frutada
    "Maçã": "fruity", "Pêra": "fruity", "Pêssego": "fruity", "Damasco": "fruity",
    "Abacaxi": "fruity", "Morango": "fruity", "Framboesa": "fruity", "Cassis": "fruity",
    "Melão": "fruity", "Banana": "fruity", "Uva": "fruity", "Cereja": "fruity",
    "Ameixa": "fruity", "Coco": "fruity", "Figo": "fruity", "Frutas vermelhas": "fruity",
    "Frutado": "fruity", "Tropical": "fruity", "Maracujá": "fruity", "Abacate": "fruity",
    # floral
    "Rosa": "floral", "Jasmim": "floral", "Muguet": "floral", "Lírio": "floral",
    "Violeta": "floral", "Íris": "floral", "Ylang-ylang": "floral", "Gardênia": "floral",
    "Tuberosa": "floral", "Narciso": "floral", "Mimosa": "floral", "Magnólia": "floral",
    "Frésia": "floral", "Peônia": "floral", "Gerânio": "floral", "Cravina": "floral",
    "Lilás": "floral", "Floral": "floral", "Flor de laranjeira": "floral",
    "Heliotrópio": "floral", "Flor branca": "floral", "Neroli": "floral",
    # especiaria
    "Pimenta": "spicy", "Canela": "spicy", "Cravo": "spicy", "Noz-moscada": "spicy",
    "Cardamomo": "spicy", "Gengibre": "spicy", "Açafrão": "spicy", "Cominho": "spicy",
    "Coentro": "spicy", "Especiado": "spicy",
    # amadeirada
    "Cedro": "woody", "Sândalo": "woody", "Vetiver": "woody", "Patchouli": "woody",
    "Oud": "woody", "Guaiaco": "woody", "Pinho": "woody", "Abeto": "woody",
    "Cipreste": "woody", "Musgo": "woody", "Musgo de carvalho": "woody",
    "Amadeirado": "woody", "Madeira seca": "woody", "Terroso": "woody", "Papiro": "woody",
    # balsâmica
    "Benjoim": "balsamic", "Mirra": "balsamic", "Olíbano": "balsamic", "Incenso": "balsamic",
    "Opoponax": "balsamic", "Estoraque": "balsamic", "Balsâmico": "balsamic", "Resinoso": "balsamic",
    # âmbar
    "Âmbar": "amber", "Âmbar cinza": "amber", "Labdano": "amber", "Tonka": "amber",
    "Cumarina": "amber",
    # gourmand
    "Baunilha": "gourmand", "Caramelo": "gourmand", "Chocolate": "gourmand", "Cacau": "gourmand",
    "Café": "gourmand", "Mel": "gourmand", "Amêndoa": "gourmand", "Avelã": "gourmand",
    "Leite": "gourmand", "Lactônico": "gourmand", "Cremoso": "gourmand", "Manteiga": "gourmand",
    "Açúcar": "gourmand", "Algodão doce": "gourmand", "Rum": "gourmand", "Whisky": "gourmand",
    "Biscoito": "gourmand", "Pão": "gourmand", "Malte doce": "gourmand", "Praliné": "gourmand",
    # couro
    "Couro": "leather", "Camurça": "leather", "Defumado": "leather", "Tabaco": "leather",
    "Alcatrão": "leather", "Bétula": "leather",
    # animálica
    "Animálico": "animalic", "Civeta": "animalic", "Castóreo": "animalic", "Indólico": "animalic",
    # almíscar
    "Almíscar": "musk", "Sabonete": "musk", "Roupa lavada": "musk", "Empoado": "musk",
    "Algodão": "musk", "Pele": "musk",
}

# Rótulos transversais: aparecem em qualquer família, não votam.
NEUTRAL = {
    "Doce", "Fresco", "Quente", "Seco", "Suave", "Intenso", "Limpo", "Verde-água",
    "Fixador", "Difusivo", "Radiante", "Transparente", "Metálico", "Medicinal", "Fenólico",
}
