# -*- coding: utf-8 -*-
"""
build_deck.py — Gera web/lib/data/deck.json (o baralho do app swipe).

Entrada : web/lib/data/materials.json (593 materiais, saída do pipeline de scraping)
Saída   : web/lib/data/deck.json

O que ele resolve, que o JSON cru não resolve:

 1. LIMPEZA. As descrições vêm de 4 e-commerces: sobra CSS inline, tag HTML,
    "Número CAS: ...", "Compre agora!", "Recomendável cheirar em solução a 10%".
    Nada disso pode aparecer numa carta.
 2. FACETAS. Extrai chips curtos em PT (Limão, Ceroso, Indólico...) via léxico
    curado — é o que dá para ler em 1 segundo no swipe.
 3. PARA QUE SERVE. Usa a tradução curada de key_uses quando existe (157 casos);
    senão gera por template a partir de família + posição na pirâmide + força.
 4. PERCEPÇÃO POR CONCENTRAÇÃO. Três faixas (baixa/média/alta) com o % e o efeito
    esperado. É ESTIMATIVA derivada de força + dose típica + família — mesma
    natureza heurística do motor do app, não é medição.
 5. FOTO. Casa cada material com um "objeto do mundo real" (95 chaves curadas).
 6. ORDEM DO BARALHO. Dentro da família, encadeia por proximidade olfativa
    (vizinho mais parecido), começando pelo protótipo — Limão > Bergamota >
    Laranja > Tangerina, não alfabético nem aleatório.

Rodar:  cd web && python3 scripts/build_deck.py
"""

import json
import math
import re
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from deck_lexicon import (  # noqa: E402
    FAMILIES, FAMILY_BY_SLUG, CAP_LABEL, LEX, PHOTO_KEYS, PHOTO_BY_ID, FAMILY_PHOTO,
)
from deck_uses_pt import USES_PT  # noqa: E402
from deck_families import FACET_FAMILY, NEUTRAL  # noqa: E402

ROOT = HERE.parent
SRC = ROOT / "lib" / "data" / "materials.json"
OUT = ROOT / "lib" / "data" / "deck.json"


# ---------------------------------------------------------------------------
# Texto
# ---------------------------------------------------------------------------
def norm(s):
    """minúsculo, sem acento — base de todo o casamento por palavra-chave."""
    if not s:
        return ""
    s = unicodedata.normalize("NFD", str(s))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.lower()


# Ruído que aparece cru nas descrições dos fornecedores.
JUNK_PATTERNS = [
    r"<[^>]+>",                                     # tags HTML
    r"[\w.#-]*\s*\{[^}]*\}",                        # blocos CSS inline
    r"N[úu]mero\s+CAS\s*:?\s*[\d-]+",
    r"N[ºo°]?\.?\s*CAS\.?\s*:?\s*[\d-]+",
    r"CAS\s*(?:n[ºo°]|number)?\s*:?\s*\d{2,7}-\d{2}-\d\b",
    r"FEMA\s*n?[ºo°]?\.?\s*\d+",
    r"Recomend[áa]vel\s+cheirar[^.]*\.?",
    r"F[óo]rmula\s+deste\s+produto\s+dispon[íi]vel\s+aqui\.?",
    r"Compre\s+(?:agora|j[áa])[^.!]*[.!]?",
    r"Garanta\s+j[áa][^.!]*[.!]?",
    r"Descubra\s+(?:a|o)\s+(?=[a-z])",
    r"Saiba\s+mais[^.]*\.?",
    r"Adicione\s+ao\s+carrinho[^.]*\.?",
    r"Tenacidade\s+na\s+fita\s*:?\s*[\d,.]+\s*\w*",
    r"Informa[çc][õo]es\s+Apar[êe]ncia\s+\w+",
    r"Apar[êe]ncia\s*:?\s*L[íi]quido\b",
    r"Aplica[çc][ãa]o\s*:?\s*[\d,.\s%-]+%?",
    r"\bDilui[çc][ãa]o\s+sugerida[^.]*\.?",
    r"!important",
    r"box-sizing[^;]*;?",
]
JUNK_RE = [re.compile(p, re.I) for p in JUNK_PATTERNS]

# Rótulos "Nota olfativa: X" → mantém só o X.
LABEL_RE = re.compile(
    r"\b(Nota\s+olfativa|Fam[íi]lia|Odor|Notas?|Perfil\s+olfativo|Descri[çc][ãa]o)\s*:\s*",
    re.I,
)

# O texto que interessa costuma vir DEPOIS de "Odor:" / "Nota olfativa:".
ODOR_SEG_RE = re.compile(r"\b(?:Odor|Nota\s+olfativa|Perfil\s+olfativo)\s*:\s*(.+)", re.I | re.S)

# "Combina bem com notas amadeiradas..." não é descrição de cheiro — é harmonização.
PAIRS_RE = re.compile(r"\bCombina\s+bem\s+com\b(.+?)(?:(?<=[.!?])\s|$)", re.I | re.S)

# Frase inteira que for propaganda sai fora.
MARKETING_RE = re.compile(
    r"(ideal\s+para\s+(?:perfumaria|cosm[ée]ticos|fragr[âa]ncias)"
    r"|[àa]s\s+suas\s+cria[çc][õo]es"
    r"|perfeito\s+para\s+(?:criar|suas)"
    r"|garanta\s+(?:j[áa]|a\s+sua)"
    r"|proporcione?\s+fixa[çc][ãa]o"
    r"|sofisticad[ao]\b.*\bexclusiv"
    r"|para\s+perfumes\s+e\s+cosm[ée]ticos\s+premium"
    r"|adicione\s+(?:frescor|sofistica|elegância)"
    r"|eleve\s+su[ao]s?"
    r"|surpreenda\b"
    r"|qualidade\s+premium\b"
    r"|melhor\s+pre[çc]o\b)", re.I)

# Sobra de CSS/HTML que denuncia que o texto não é utilizável.
CSS_MARKERS = re.compile(
    r"(font-family|font-size|!important|box-sizing|line-height|border-bottom"
    r"|margin\s*:|padding\s*:|color\s*:\s*#|\brem\b\s*;|\bpx\b\s*[;0-9])", re.I)


def strip_css(s):
    """Remove blocos CSS inline, inclusive os que vêm sem a chave de fechamento."""
    prev = None
    while prev != s:
        prev = s
        s = re.sub(r"[^{}]{0,120}\{[^{}]*\}", " ", s)
    # bloco aberto e nunca fechado: corta do seletor em diante
    if "{" in s:
        head, _, _ = s.partition("{")
        head = re.sub(r"[\w.#-]+(?:\s+[\w.#-]+)*\s*$", "", head)
        s = head
    return s


def extract_pairs(raw):
    """'Combina bem com X' → frase de harmonização, guardada à parte."""
    if not raw:
        return None
    m = PAIRS_RE.search(str(raw))
    if not m:
        return None
    body = re.sub(r"\s+", " ", m.group(1)).strip(" .;:,")
    body = LABEL_RE.split(body)[0].strip(" .;:,")
    if len(body) < 12 or len(body) > 220 or CSS_MARKERS.search(body):
        return None
    return "Combina bem com " + body + "."


# Gatilho de propaganda: do gatilho até o fim da string, nada mais é informação.
TAIL_CUT_RE = re.compile(
    r"\s*(?:Compre\b|Adquira\b|Garanta\b|Pe[çc]a\s+j[áa]\b|Adicione\s+(?:frescor|sofistica|elegância)"
    r"|Eleve\s+su|Surpreenda\b|Realce\s+su|Transforme\s+su|Confira\b|Aproveite\b"
    r"|,?\s*ideal\s+para\s+(?:perfumes|perfumaria|cosm[ée]ticos|fragr[âa]ncias|aromatiza)"
    r"|,?\s*perfeito\s+para\s+(?:perfumes|criar|suas)).*$", re.I | re.S)


def drop_marketing(text):
    """Descarta as FRASES de propaganda, preservando as informativas."""
    text = TAIL_CUT_RE.sub("", text)
    keep = [p for p in re.split(r"(?<=[.!?])\s+", text) if p.strip() and not MARKETING_RE.search(p)]
    out = " ".join(keep).strip()
    # "Descubra X da Givaudan, molécula ..." → começa na aposição informativa
    out = re.sub(r"^Descubra\s+", "", out, flags=re.I)
    return out.strip()


def clean_desc(raw):
    """Devolve prosa limpa (<=2 linhas) ou None se o que sobrou for lixo."""
    if not raw:
        return None
    s = strip_css(str(raw))
    m = ODOR_SEG_RE.search(s)
    if m and len(m.group(1).strip()) > 20:
        s = m.group(1)
    s = PAIRS_RE.sub(" ", s)
    for rx in JUNK_RE:
        s = rx.sub(" ", s)
    s = LABEL_RE.sub("", s)
    s = s.replace("\x96", "–").replace("\xa0", " ")
    s = re.sub(r"\s+", " ", s).strip(" -–—•;:,.")
    s = drop_marketing(s)
    if len(s) < 18 or CSS_MARKERS.search(s):
        return None
    # Corta em fronteira de frase, mirando ~190 caracteres.
    if len(s) > 200:
        cut = s[:200]
        mm = list(re.finditer(r"[.!?](?:\s|$)", cut))
        s = cut[: mm[-1].end()].strip() if mm else cut.rsplit(" ", 1)[0] + "…"
    s = s.strip(" -–—•;:,")
    if len(s) < 18:
        return None
    if s and s[-1] not in ".!?…":
        s += "."
    return s[0].upper() + s[1:]


def looks_like_keyword_list(s):
    """'green, fruity, pineapple, galbanum' — lista de descritores, não frase."""
    if not s:
        return False
    parts = [p.strip() for p in s.rstrip(".").split(",")]
    if len(parts) < 3:
        return False
    return all(len(p.split()) <= 3 for p in parts)


# ---------------------------------------------------------------------------
# Facetas (chips)
# ---------------------------------------------------------------------------
def _key_regex(key):
    """Início sempre em fronteira; termos >=6 chars aceitam sufixo (radicais)."""
    esc = re.escape(key.strip())
    tail = "" if len(key.strip()) >= 6 or key.endswith(" ") else r"(?![a-z0-9])"
    return re.compile(r"(?<![a-z0-9])" + esc + tail)


LEX_RE = {k: _key_regex(k) for k in LEX}


def extract_facets(hay_strong, hay_weak, limit=6):
    """Chips PT ordenados por (peso do descritor, apareceu no nome?, posição)."""
    found = {}
    for key, (label, weight) in LEX.items():
        rx = LEX_RE[key]
        m = rx.search(hay_strong)
        strong = m is not None
        if not m:
            m = rx.search(hay_weak)
        if not m:
            continue
        score = weight * (2 if strong else 1)
        pos = m.start()
        prev = found.get(label)
        if prev is None or score > prev[0] or (score == prev[0] and pos < prev[1]):
            found[label] = (score, pos)
    ordered = sorted(found.items(), key=lambda kv: (-kv[1][0], kv[1][1]))
    return [label for label, _ in ordered[:limit]]


def facets_to_phrase(facets, family_label, _kind=None):
    """Sem prosa aproveitável, a linha de cheiro vira a lista de facetas em PT."""
    if not facets:
        return f"Família {family_label.lower()} — a fonte não trouxe descritor de cheiro."
    low = [f[0].lower() + f[1:] for f in facets[:5]]
    if len(low) == 1:
        return f"{low[0][0].upper()}{low[0][1:]}, sem outra faceta registrada na fonte."
    body = ", ".join(low[:-1]) + " e " + low[-1]
    return f"{body[0].upper()}{body[1:]}."


# ---------------------------------------------------------------------------
# Para que serve (fallback por template)
# ---------------------------------------------------------------------------
NOTE_ROLE = {
    "topo": "Nota de topo: é o que se sente nos primeiros minutos e evapora primeiro.",
    "coracao": "Nota de coração: sustenta a fórmula depois que o topo some.",
    "base": "Nota de base: é o rastro — o que ainda está na pele horas depois.",
}

FAMILY_USE = {
    "citrus": "Abre a fórmula com frescor e dá o impacto inicial de colônias e cítricos.",
    "aldehydic": "Dá a faísca ensaboada e o efeito 'roupa passada' dos florais aldeídicos.",
    "green": "Traz talo e folha — corta doçura e dá realismo a florais e frutados.",
    "herbal": "Constrói o eixo aromático de fougères, masculinos e águas de colônia.",
    "aquatic": "Monta o efeito maresia/ozônio dos frescos modernos e transparentes.",
    "fruity": "Dá polpa e apelo imediato; arredonda florais e sustenta gourmands.",
    "floral": "Compõe o coração floral — buquês, reconstituições e volume de flor.",
    "spicy": "Acende a fórmula com calor e atrito; clássico em orientais e masculinos.",
    "woody": "Dá estrutura seca e duração; é o esqueleto que segura o resto.",
    "balsamic": "Fecha a base com resina quente, fumaça e doçura escura.",
    "amber": "Entra no bloco quente âmbar/oriental e aumenta fixação e envolvimento.",
    "gourmand": "Traz o comestível — caramelo, baunilha, leite — em gourmands e orientais doces.",
    "leather": "Constrói couro, fumaça e tabaco; dá caráter adulto à fórmula.",
    "animalic": "Em traço, dá calor de pele e tira o ar de sabonete da fórmula.",
    "musk": "Dá pele limpa, volume e fixação; costura tudo sem chamar atenção.",
}

STRENGTH_TIP = {
    "alta": "Material potente: comece em diluição (1–10%) e vá por traço.",
    "média": "Potência média: aceita dose de trabalho sem dominar a fórmula.",
    "baixa": "Potência baixa: precisa de dose generosa para aparecer.",
}


def derive_uses(m, family, facets):
    """PT curado quando existe; senão monta uma frase a partir do que se sabe."""
    ku = m.get("key_uses")
    if ku and ku in USES_PT:
        return USES_PT[ku]
    kind = m.get("material_kind")
    if kind == "solvent":
        return ("Não é material de cheiro: serve para diluir os potentes e carregar "
                "resinoides. Entra como veículo, não como nota.")
    parts = [FAMILY_USE.get(family, "Entra na composição como matéria-prima de cheiro.")]
    if kind == "essential_oil":
        parts.append("Óleo essencial: traz várias notas de uma vez, com variação de lote.")
    elif kind == "base":
        parts.append("É uma base pronta — um acorde inteiro em um frasco só.")
    nt = m.get("note_type")
    if nt in NOTE_ROLE:
        parts.append(NOTE_ROLE[nt])
    st = m.get("odor_strength")
    if st in STRENGTH_TIP:
        parts.append(STRENGTH_TIP[st])
    if facets[:2]:
        parts.append("Facetas para segurar no nariz: " + ", ".join(facets[:3]).lower() + ".")
    return " ".join(parts)


# ---------------------------------------------------------------------------
# Dose e percepção por concentração
# ---------------------------------------------------------------------------
NUM = r"\d+(?:[.,]\d+)?"


def _f(x):
    return float(str(x).replace(",", "."))


def parse_dose(m):
    """(low, mid, high) em % — do banco quando dá, senão do perfil de força."""
    tp = m.get("typical_use_pct")
    if tp:
        nums = re.findall(NUM, str(tp))
        if len(nums) >= 2:
            lo, hi = _f(nums[0]), _f(nums[1])
            if 0 < lo < hi:
                return lo, round(math.sqrt(lo * hi), 3), hi
        elif len(nums) == 1:
            v = _f(nums[0])
            if v > 0:
                return round(v / 10, 3), v, round(v * 3, 2)
    rd = m.get("recommended_dosage")
    if rd:
        nums = re.findall(NUM, str(rd))
        if len(nums) >= 2:
            lo, hi = _f(nums[0]), _f(nums[1])
            if 0 < lo < hi:
                return lo, round(math.sqrt(lo * hi), 3), hi
        elif len(nums) == 1:
            v = _f(nums[0])
            if v > 0:
                return round(v / 10, 3), v, round(v * 2, 2)
    kind = m.get("material_kind")
    if kind == "solvent":
        return 5.0, 20.0, 60.0
    if kind == "essential_oil":
        return 0.5, 3.0, 12.0
    if kind == "base":
        return 1.0, 5.0, 20.0
    st = m.get("odor_strength")
    if st == "alta":
        return 0.05, 0.3, 1.5
    if st == "baixa":
        return 1.0, 5.0, 15.0
    return 0.3, 1.5, 5.0


def fmt_pct(v):
    if v >= 10:
        s = f"{v:.0f}"
    elif v >= 1:
        s = f"{v:.1f}".rstrip("0").rstrip(".")
    else:
        s = f"{v:.3f}".rstrip("0").rstrip(".")
    return s.replace(".", ",") + "%"


# (baixa, média, alta) — o que a dose faz PERCEPTIVAMENTE, por família.
PERCEPTION = {
    "citrus": (
        "Só brilho: o nariz sente frescor sem identificar a fruta.",
        "A casca cítrica aparece nítida e assina a abertura.",
        "Domina a saída, fica ácido/limpa-pisos e some rápido demais.",
    ),
    "aldehydic": (
        "Dá lift e uma sensação de limpo sem se denunciar.",
        "Entra o efeito champanhe/roupa passada, marca registrada do aldeídico.",
        "Vira cera de vela e sufoca o resto da fórmula.",
    ),
    "green": (
        "Um fio de seiva que tira o doce e dá naturalidade.",
        "Talo e folha ficam legíveis; a fórmula 'abre' o verde.",
        "Amarga, fica com gosto de grama e engole o floral.",
    ),
    "herbal": (
        "Dá um ar limpo de erva, quase imperceptível.",
        "O eixo aromático aparece — território de fougère e masculino.",
        "Vira chá de ervas medicinal e canforado.",
    ),
    "aquatic": (
        "Transparência: parece que alguém abriu a janela.",
        "Maresia e ozônio ficam claros; é o frescor moderno.",
        "Fica sabão de máquina de lavar, sintético e plano.",
    ),
    "fruity": (
        "Arredonda e dá suculência sem virar 'perfume de fruta'.",
        "A fruta é reconhecível e puxa o apelo imediato.",
        "Vira bala/xarope artificial e achata a fórmula.",
    ),
    "floral": (
        "Só macieza — dá corpo ao coração sem nomear a flor.",
        "A flor fica identificável e ocupa o centro da composição.",
        "Satura, fica enjoativo e some a leitura das outras notas.",
    ),
    "spicy": (
        "Um calor de fundo que acende a fórmula sem virar tempero.",
        "A especiaria aparece e dá atrito ao acorde.",
        "Vira armário de tempero e arranha, com risco de irritação.",
    ),
    "woody": (
        "Dá lastro e faz o topo durar mais, sem aparecer.",
        "A madeira fica audível e estrutura o rastro.",
        "Seca demais, vira serragem/lápis e engessa a fórmula.",
    ),
    "balsamic": (
        "Um fundo quente que cola as notas umas nas outras.",
        "Resina e fumaça ficam nítidas na base.",
        "Pesa, escurece tudo e deixa um rastro pegajoso.",
    ),
    "amber": (
        "Calor discreto e mais projeção sem mudar o caráter.",
        "O bloco ambarado aparece e envolve a fórmula.",
        "Vira 'bomba de âmbar': volume demais, nuance de menos.",
    ),
    "gourmand": (
        "Uma doçura de fundo que dá conforto sem virar sobremesa.",
        "O comestível fica explícito — caramelo, baunilha, leite.",
        "Enjoa: fica xarope e apaga topo e coração.",
    ),
    "leather": (
        "Uma sujeirinha seca que dá caráter à base.",
        "Couro e fumaça ficam legíveis e adultos.",
        "Vira alcatrão/cinzeiro e domina tudo.",
    ),
    "animalic": (
        "O truque clássico: em traço, tira o ar de sabonete e dá calor de pele.",
        "Fica perceptível como 'sujo bom' e adiciona tensão.",
        "Vira fecal/estábulo e arruína a fórmula.",
    ),
    "musk": (
        "Invisível sozinho, mas já costura e alonga o rastro.",
        "Dá pele limpa, volume e fixação claros.",
        "Fica amaciante de roupa e abafa as nuances de cima.",
    ),
}


def perception(m, family, dose):
    lo, mid, hi = dose
    if m.get("material_kind") == "solvent":
        return [
            {"band": "Baixa", "pct": fmt_pct(lo), "effect": "Ajuste fino de viscosidade; quase não muda nada."},
            {"band": "Média", "pct": fmt_pct(mid), "effect": "Diluição de trabalho — o que se usa para pesar material potente."},
            {"band": "Alta", "pct": fmt_pct(hi), "effect": "Veículo principal da fórmula; enfraquece o cheiro por diluição."},
        ]
    a, b, c = PERCEPTION.get(family, PERCEPTION["floral"])
    return [
        {"band": "Baixa", "pct": fmt_pct(lo), "effect": a},
        {"band": "Média", "pct": fmt_pct(mid), "effect": b},
        {"band": "Alta", "pct": fmt_pct(hi), "effect": c},
    ]


# ---------------------------------------------------------------------------
# Foto
# ---------------------------------------------------------------------------
PHOTO_RE = [(p, [_key_regex(k) for k in p["kw"]]) for p in PHOTO_KEYS]


def pick_photo(hay_strong, hay_weak, family):
    best, best_score = None, 0
    for p, rxs in PHOTO_RE:
        score = 0
        for rx in rxs:
            if rx.search(hay_strong):
                score += 3
            elif rx.search(hay_weak):
                score += 1
        if score > best_score:
            best, best_score = p["id"], score
    return best or FAMILY_PHOTO.get(family, "laboratorio")


# ---------------------------------------------------------------------------
# Ordenação por proximidade olfativa (dentro da família)
# ---------------------------------------------------------------------------
NOTE_RANK = {"topo": 0, "coracao": 1, "base": 2, None: 1}


def order_by_proximity(cards, family):
    """Ordena a família por VIZINHANÇA OLFATIVA, não por nome nem sorteio.

    A unidade de agrupamento é a chave de foto — que é justamente 'o objeto que
    o cheiro evoca'. Todos os limões saem juntos, depois todas as bergamotas,
    depois as laranjas. Entre grupos, cadeia gulosa pelo vizinho mais parecido
    (facetas em comum), partindo do protótipo da família. Dentro do grupo:
    topo → coração → base, e material de prateleira (mais ofertas) primeiro.
    """
    anchor = set(FAMILY_BY_SLUG[family]["anchor"])

    groups = {}
    for c in cards:
        groups.setdefault(c["photo"], []).append(c)

    centroid = {}
    for key, members in groups.items():
        bag = {}
        for c in members:
            for f in c["facets"]:
                bag[norm(f)] = bag.get(norm(f), 0) + 1
            for w in c["name"].split():
                if len(w) > 3:
                    bag[norm(w)] = bag.get(norm(w), 0) + 0.5
        centroid[key] = bag

    def sim(a, b):
        va, vb = centroid[a], centroid[b]
        if not va or not vb:
            return 0.0
        inter = sum(min(va[t], vb.get(t, 0)) for t in va)
        union = sum(va.values()) + sum(vb.values()) - inter
        return inter / union if union else 0.0

    def anchor_score(key):
        bag = centroid[key]
        hits = sum(v for t, v in bag.items() if any(a in t or t in a for a in anchor))
        # a foto padrão da família é o balde do "resto": nunca deve abrir o baralho
        if key == FAMILY_PHOTO.get(family):
            hits -= 2
        return hits

    remaining = sorted(groups, key=lambda k: (-len(groups[k]), k))
    if not remaining:
        return []
    chain = [max(remaining, key=lambda k: (anchor_score(k), len(groups[k])))]
    remaining.remove(chain[0])
    while remaining:
        cur = chain[-1]
        nxt = max(remaining, key=lambda k: (round(sim(cur, k), 3), len(groups[k])))
        chain.append(nxt)
        remaining.remove(nxt)

    ordered = []
    for key in chain:
        members = sorted(
            groups[key],
            key=lambda c: (NOTE_RANK.get(c["note"], 1), -c.get("_offers_n", 0), c["name"]),
        )
        ordered.extend(members)
    return ordered


# ---------------------------------------------------------------------------
# Nome
# ---------------------------------------------------------------------------
# O catálogo raspado inclui alguns itens de bancada (pipeta, frasco, kit de
# roll-on). Eles não têm cheiro e não podem virar carta.
NOT_A_MATERIAL_RE = re.compile(
    r"\b(pipeta|frasco|proveta|b[eé]quer|becker|balan[çc]a|esp[áa]tula|fita\s+olfativa"
    r"|tira\s+de\s+teste|seringa|etiqueta|embalagem|r[óo]tulo|luva|almofariz|funil"
    r"|conta-gotas|gotejador|v[áa]lvula|borrifador|atomizador|bast[ãa]o|kit\s+\d"
    r"|estojo|vareta|difusor\s+de\s+vareta|painel\s+olfativo|tira\s+olfativa"
    r"|blotter|kit\s+de\s+estudo)\b", re.I)


def clean_name(raw):
    """Nomes vêm com cauda de e-commerce ('X Almiscarado, Suave e Cremoso...')."""
    s = re.sub(r"\s+", " ", str(raw or "")).strip()
    s = s.replace("\x96", "–")
    # Cauda de SEO dos fornecedores: "… CAS 106-22-9", "… | CAS: 8000-29-1".
    s = re.sub(r"\s*[|\-–—]?\s*n?[ºo°]?\.?\s*CAS\.?\s*:?\s*\d{2,7}-\d{2}-\d\b", "", s, flags=re.I)
    s = re.sub(r"\s*[–—-]\s*(Base|Aroma|Óleo Essencial)?\s*$", "", s)
    # corta cauda de marketing depois de vírgula/travessão quando o nome é longo
    if len(s) > 46:
        for sep in (" – ", " - ", ","):
            if sep in s:
                head = s.split(sep)[0].strip()
                if len(head) >= 8:
                    s = head
                    break
    # As "bases BS" vêm com o nome seguido de adjetivo de vitrine
    # ("... Floral Elegante para Perfumaria e Cosméticos"). Corta ali.
    s = re.sub(
        r"\s+(?:para\s+(?:perfumaria|perfumes|cosm[ée]ticos)|"
        r"(?:intensa?|elegante|sofisticad[ao]|marcante|vibrante|exclusiv[ao]|premium|"
        r"cremos[ao]|natural|puro)\b.*)$",
        "", s, flags=re.I)
    if len(s) > 52:
        s = s[:50].rsplit(" ", 1)[0] + "…"
    s = balance_parens(s)
    return s.strip(" ,;–—-")


def balance_parens(s):
    """O banco tem nomes cortados no meio ('Heliotrópio Base (heliotropex')."""
    if s.count("(") > s.count(")"):
        s = s[: s.rfind("(")].strip(" ,;–—-")
    elif s.count(")") > s.count("("):
        s = s.replace(")", "", s.count(")") - s.count("("))
    return s


# Siglas/códigos que devem continuar em caixa alta (BS2126, DPG, IFF, CAS...).
CODE_RE = re.compile(r"^(?:[A-Z]{0,4}\d{1,5}[A-Z]?|[A-Z]-?\d+)$")
# Siglas do setor que continuam em caixa alta mesmo sem dígito.
KEEP_UPPER = {"DPG", "IPM", "DEP", "TEC", "IFF", "CAS", "USP", "EO", "MNA", "BB",
              "DL", "PA", "SA", "SD", "MCT", "TEA", "AAG", "OE", "PEA", "IBQ"}
# Partículas que não podem ficar gritando no meio do nome.
LOWER_PARTICLES = {"DE", "DA", "DO", "DAS", "DOS", "E", "COM", "EM", "OU", "TYPE", "AND", "OF"}


def title_case_ok(s):
    """CAIXA ALTA de catálogo vira Caixa de Título; siglas e códigos sobrevivem."""
    def fix(word, first):
        core = word.strip("()[],.®©™")
        if not core or not core.isupper() or not core.isalnum() and not any(ch.isalnum() for ch in core):
            return word
        if not core.isupper():
            return word
        if core in LOWER_PARTICLES:
            return word.replace(core, core.capitalize() if first else core.lower())
        if core in KEEP_UPPER or CODE_RE.match(core) or any(ch.isdigit() for ch in core) or len(core) <= 2:
            return word
        return word.replace(core, core.capitalize())

    def fix_word(word, first):
        # nomes técnicos hifenizados (TRIDECENE-2-NITRILE) precisam de tratamento
        # segmento a segmento, senão o dígito no meio salva a palavra toda.
        if "-" in word and any(ch.isalpha() for ch in word):
            return "-".join(fix(seg, first and i == 0) for i, seg in enumerate(word.split("-")))
        return fix(word, first)

    return " ".join(fix_word(w, i == 0) for i, w in enumerate(s.split()))


# "Aldeído c 08", "Aldeido C-8", "aldeído c8" → "Aldeído C8" (nomenclatura usual).
ALD_RE = re.compile(r"\baldeido\s*c\s*-?\s*0*(\d{1,2})\b", re.I)


def normalize_aldehyde(name):
    def repl(m):
        return "Aldeído C" + m.group(1)
    if "ldeido" in norm(name):
        idx = 0
        out = []
        for m in ALD_RE.finditer(norm(name)):
            out.append(name[idx:m.start()] + repl(m))
            idx = m.end()
        if out:
            return ("".join(out) + name[idx:]).strip()
    return name


# ---------------------------------------------------------------------------
# Reclassificação de família (o family_canon da fonte é ruidoso)
# ---------------------------------------------------------------------------
def revote_family(current, facets):
    """Se a família original não tem NENHUM apoio nas facetas e outra tem
    vantagem clara (>=2 votos e o dobro da 2ª), a carta muda de família."""
    votes = {}
    for i, f in enumerate(facets):
        if f in NEUTRAL:
            continue
        fam = FACET_FAMILY.get(f)
        if not fam:
            continue
        votes[fam] = votes.get(fam, 0) + (3 if i == 0 else 2 if i == 1 else 1)
    if not votes:
        return current, False
    if votes.get(current, 0) > 0:
        return current, False
    ranked = sorted(votes.items(), key=lambda kv: -kv[1])
    top, top_v = ranked[0]
    second_v = ranked[1][1] if len(ranked) > 1 else 0
    if top_v >= 3 and top_v > second_v:
        return top, True
    return current, False


def round_pct(v):
    """2 algarismos significativos — 0.707 vira 0.71, 12.34 vira 12."""
    if v is None or v <= 0:
        return v
    import math as _m
    d = max(0, 1 - int(_m.floor(_m.log10(abs(v)))))
    return round(v, min(d, 4))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    materials = json.loads(SRC.read_text(encoding="utf-8"))
    cards = []
    stats = {"desc_prosa": 0, "desc_facetas": 0, "uses_curado": 0, "foto_kw": 0,
             "reclassificados": 0}

    for m in materials:
        raw_family = m.get("family_canon") or "amber"
        if raw_family not in FAMILY_BY_SLUG:
            raw_family = "amber"

        name = normalize_aldehyde(title_case_ok(clean_name(
            m.get("name_pt") or m.get("name_canonical"))))
        syns = [s for s in (m.get("synonyms") or []) if norm(s) != norm(name)][:3]

        raw_desc = m.get("odor_description")
        desc = clean_desc(raw_desc)
        pairs = extract_pairs(raw_desc)

        ku_pt = USES_PT.get(m.get("key_uses") or "", "")
        hay_strong = norm(name + " " + " ".join(syns))
        # facetas só sobre texto JÁ LIMPO — senão "margin:" do CSS vira "Maresia"
        hay_weak = norm(" ".join([desc or "", pairs or "", str(m.get("odor_family") or ""), ku_pt]))

        facets = extract_facets(hay_strong, hay_weak)
        family, moved = revote_family(raw_family, facets)
        fam = FAMILY_BY_SLUG[family]
        if moved:
            stats["reclassificados"] += 1

        if desc and not looks_like_keyword_list(desc):
            smell = desc
            stats["desc_prosa"] += 1
        else:
            smell = facets_to_phrase(facets, fam["label"], m.get("kind_label"))
            stats["desc_facetas"] += 1

        uses = derive_uses(m, family, facets)
        if m.get("key_uses") in USES_PT:
            stats["uses_curado"] += 1

        photo = pick_photo(hay_strong, hay_weak, family)
        if photo != FAMILY_PHOTO.get(family):
            stats["foto_kw"] += 1

        dose = tuple(round_pct(v) for v in parse_dose(m))

        offers = sorted(
            [o for o in (m.get("offers") or []) if o.get("price")],
            key=lambda o: (o.get("price_per_g") or 1e9, o.get("price") or 1e9),
        )[:6]

        ppg = m.get("min_price_per_g")
        cards.append({
            "id": m["id"],
            "name": name,
            "syn": syns,
            "cas": m.get("cas"),
            "family": family,
            "familyRaw": raw_family if moved else None,
            "cap": fam["cap"],
            "note": m.get("note_type"),
            "kind": m.get("material_kind"),
            "strength": m.get("odor_strength"),
            "smell": smell,
            "pairs": pairs,
            "facets": facets,
            "uses": uses,
            "dose": {"low": dose[0], "mid": dose[1], "high": dose[2],
                     "label": m.get("typical_use_pct") or m.get("recommended_dosage") or None},
            "perception": perception(m, family, dose),
            "photo": photo,
            "price": {
                "perG": round(ppg, 3) if ppg else None,
                "min": m.get("min_price"),
                "source": m.get("cheapest_source"),
                "count": m.get("offer_count") or 0,
                "offers": [{
                    "s": o.get("source"), "url": o.get("source_url"),
                    "size": o.get("size_value"), "unit": o.get("size_unit"),
                    "dil": o.get("dilution"), "price": o.get("price"),
                    "ppg": round(o["price_per_g"], 3) if o.get("price_per_g") else None,
                } for o in offers],
            },
            "tech": {
                "mw": m.get("molecular_weight"), "bp": m.get("boiling_point_c"),
                "logp": m.get("logp"), "formula": m.get("molecular_formula"),
                "ifra": m.get("ifra_limit_pct"), "tgsc": m.get("tgsc_url"),
                "cid": m.get("pubchem_cid"),
            },
            "_offers_n": m.get("offer_count") or 0,
        })

    dropped = [c for c in cards if NOT_A_MATERIAL_RE.search(c["name"])]
    if dropped:
        cards = [c for c in cards if c not in dropped]
        print("  itens de bancada removidos do baralho: "
              + ", ".join(c["name"] for c in dropped))

    # ordem do baralho: por família (ordem canônica), e dentro dela por vizinhança
    by_family = {}
    for c in cards:
        by_family.setdefault(c["family"], []).append(c)

    ordered = []
    families_meta = []
    for fam in sorted(FAMILIES, key=lambda f: f["order"]):
        group = by_family.get(fam["slug"], [])
        if not group:
            continue
        chain = order_by_proximity(group, fam["slug"])
        for idx, c in enumerate(chain):
            c["seq"] = idx
            ordered.append(c)
        families_meta.append({
            "slug": fam["slug"], "label": fam["label"], "cap": fam["cap"],
            "hex": fam["hex"], "emoji": fam["emoji"], "blurb": fam["blurb"],
            "order": fam["order"], "count": len(chain),
            "capLabel": CAP_LABEL.get(fam["cap"], fam["label"]),
        })

    for c in ordered:
        c.pop("_offers_n", None)

    # Quantos arquivos existem por chave (base + variantes). O app usa isso para
    # alternar a imagem entre cartas que caem na mesma chave.
    photo_dir = ROOT / "public" / "photos"
    photos = {}
    for p in PHOTO_KEYS:
        n = 0
        if (photo_dir / f"{p['id']}.webp").exists():
            n = 1
            while (photo_dir / f"{p['id']}-{n + 1}.webp").exists():
                n += 1
        photos[p["id"]] = {
            "label": p["label"], "emoji": p["emoji"], "grad": p["grad"], "n": n,
        }

    deck = {
        "version": 1,
        "count": len(ordered),
        "families": families_meta,
        "photos": photos,
        "cards": ordered,
    }
    OUT.write_text(json.dumps(deck, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    used_photos = {}
    for c in ordered:
        used_photos[c["photo"]] = used_photos.get(c["photo"], 0) + 1
    print(f"deck.json — {len(ordered)} cartas, {len(families_meta)} famílias, "
          f"{OUT.stat().st_size/1024:.0f} KB")
    print(f"  descrição em prosa: {stats['desc_prosa']} | gerada de facetas: {stats['desc_facetas']}")
    print(f"  'para que serve' curado: {stats['uses_curado']} | por template: {len(ordered)-stats['uses_curado']}")
    print(f"  foto por palavra-chave: {stats['foto_kw']} | por família (fallback): {len(ordered)-stats['foto_kw']}")
    print(f"  fotos distintas usadas: {len(used_photos)}/{len(PHOTO_KEYS)}")
    print(f"  famílias corrigidas por voto de faceta: {stats['reclassificados']}")
    nofacet = sum(1 for c in ordered if not c["facets"])
    print(f"  cartas sem nenhuma faceta: {nofacet}")


if __name__ == "__main__":
    main()
