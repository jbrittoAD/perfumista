# -*- coding: utf-8 -*-
"""
fetch_photos.py — Baixa a foto de cada "objeto do mundo real" do deck.

A carta do app é uma FOTO de tela cheia do que o cheiro evoca (lascas de cedro,
abacaxi maduro, pedra molhada) — não a estrutura molecular. São 95 objetos
curados em deck_lexicon.PHOTO_KEYS; este script busca cada um no Wikimedia
Commons (licença livre, sem chave de API), pega a melhor foto que passa nos
filtros, corta em 3:4 e grava WebP em public/photos/<id>.webp.

Filtros: bitmap (jpg/png), >=1000px de largura, e o título não pode cheirar a
diagrama/mapa/logo — queremos fotografia, não ilustração científica.

Crédito e licença de cada imagem vão para public/photos/credits.json e aparecem
na tela de detalhe (exigência das licenças CC).

Rodar:  cd web && python3 scripts/fetch_photos.py [--only id1,id2] [--force]
"""

import io
import json
import sys
import time
import urllib.parse
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from deck_lexicon import PHOTO_KEYS  # noqa: E402

ROOT = HERE.parent
OUTDIR = ROOT / "public" / "photos"
CREDITS = OUTDIR / "credits.json"

API = "https://commons.wikimedia.org/w/api.php"
UA = "PerfumistaDeck/1.0 (app pessoal de estudo de perfumaria; contato via github)"

TARGET_W, TARGET_H = 900, 1200  # 3:4, retrato — é o formato da carta
BAD_TITLE = ("diagram", "chart", "map", "logo", "icon", "graph", "structure",
             "formula", "molecule", "skeletal", "plot", "scheme", "coat of arms",
             "flag", "poster", "banner", "screenshot", "engraving", "woodcut",
             "lithograph", "drawing", "illustration", "painting", "manuscript",
             "portrait", "postcard", "stamp", "label", "advert", "sign ")

# Palavras da consulta que não servem para conferir o título.
STOP = {"close", "up", "fresh", "dried", "texture", "plant", "leaves", "fruit",
        "flowers", "flower", "wood", "and", "the", "of", "a", "green", "white",
        "red", "dark", "golden", "purple", "yellow", "seed", "seeds", "spice"}


def must_tokens(query, label):
    """O título do arquivo precisa conter ALGUM termo específico da busca.

    É o filtro que separa 'foto do objeto' de 'foto que menciona o objeto'. Sem
    ele o Commons devolve, para 'cedar wood', a vista aérea de uma serraria; para
    'violet flowers', um lagarto pousado numa flor roxa.
    """
    # SÓ os termos da consulta (inglês/latim). O rótulo em português entrava aqui
    # e casava topônimo: "Madeira seca" aceitou "Rio Madeira em Época de Seca",
    # "Oud" aceitou uma ponte em Oud-Zevenaar.
    words = [w.strip('"').lower() for w in query.split()]
    toks = [w for w in words if len(w) > 3 and w not in STOP]
    return toks or [w for w in words if len(w) > 2]


def _open(url, timeout=40):
    """GET com backoff — o Commons devolve 429 se a gente apressar o lote."""
    last = None
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (429, 503):
                time.sleep(8 * (attempt + 1))
                continue
            raise
        except Exception as e:
            last = e
            time.sleep(2 * (attempt + 1))
    raise last


def api_get(params):
    url = API + "?" + urllib.parse.urlencode(params)
    return json.loads(_open(url).decode("utf-8"))


def search(query, limit=10):
    data = api_get({
        "action": "query", "generator": "search",
        "gsrsearch": f"filetype:bitmap {query}", "gsrnamespace": 6,
        "gsrlimit": limit, "prop": "imageinfo",
        "iiprop": "url|size|mime|extmetadata", "iiurlwidth": 1400,
        "format": "json", "formatversion": 2,
    })
    return data.get("query", {}).get("pages", []) or []


def plain(meta, key):
    v = (meta.get(key) or {}).get("value")
    if not v:
        return None
    import re
    return re.sub(r"<[^>]+>", "", str(v)).strip() or None


def pick(pages, must=()):
    for p in sorted(pages, key=lambda x: x.get("index", 99)):
        title = (p.get("title") or "").lower()
        if any(b in title for b in BAD_TITLE):
            continue
        if must and not any(t in title for t in must):
            continue
        ii = (p.get("imageinfo") or [{}])[0]
        if ii.get("mime") not in ("image/jpeg", "image/png"):
            continue
        if (ii.get("width") or 0) < 1000:
            continue
        thumb = ii.get("thumburl") or ii.get("url")
        if not thumb:
            continue
        meta = ii.get("extmetadata") or {}
        return {
            "title": p.get("title"),
            "url": thumb,
            "page": ii.get("descriptionurl"),
            "author": plain(meta, "Artist"),
            "license": plain(meta, "LicenseShortName"),
        }
    return None


def by_title(title):
    """Busca UM arquivo pelo título exato — usado quando a chave tem `file`
    fixado em deck_lexicon (escolha manual, porque a busca não achava nada bom)."""
    data = api_get({
        "action": "query", "titles": title, "prop": "imageinfo",
        "iiprop": "url|size|mime|extmetadata", "iiurlwidth": 1400,
        "format": "json", "formatversion": 2,
    })
    for page in data.get("query", {}).get("pages", []):
        ii = (page.get("imageinfo") or [{}])[0]
        if not ii.get("thumburl") and not ii.get("url"):
            continue
        meta = ii.get("extmetadata") or {}
        return {
            "title": page.get("title"), "url": ii.get("thumburl") or ii.get("url"),
            "page": ii.get("descriptionurl"),
            "author": plain(meta, "Artist"), "license": plain(meta, "LicenseShortName"),
        }
    return None


def download(url):
    return _open(url, timeout=60)


def to_card(raw):
    """Corta no centro em 3:4 e grava WebP — é o que a carta consome."""
    im = Image.open(io.BytesIO(raw))
    im = im.convert("RGB")
    sw, sh = im.size
    target = TARGET_W / TARGET_H
    if sw / sh > target:                       # largo demais → corta as laterais
        nw = int(sh * target)
        im = im.crop(((sw - nw) // 2, 0, (sw - nw) // 2 + nw, sh))
    else:                                       # alto demais → corta em cima/baixo
        nh = int(sw / target)
        top = int((sh - nh) * 0.35)             # 0.35: assunto costuma ficar acima do centro
        im = im.crop((0, top, sw, top + nh))
    im = im.resize((TARGET_W, TARGET_H), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=55, threshold=3))
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=76, method=6)
    return buf.getvalue()


def fetch_variants(spec, credits):
    """Baixa fotos ALTERNATIVAS para as chaves que muitas cartas compartilham.

    Chaves genéricas ("folhagem verde", "madeira seca") pegam dezenas de cartas.
    Com uma foto só, o usuário vê a mesma imagem 50 vezes seguidas e o deck perde
    a graça. Cada variante extra vira <chave>-2.webp, <chave>-3.webp… e o app
    escolhe uma por id de carta.
    """
    ok = 0
    for item in spec.split(","):
        key, _, n = item.partition(":")
        n = int(n or 2)
        photo = PHOTO_BY_ID.get(key)
        if not photo:
            print(f"✗ chave desconhecida: {key}")
            continue
        pages = search(photo["q"], limit=24)
        must = must_tokens(photo["q"], photo["label"])
        used = {credits.get(key, {}).get("title")}
        slot = 2
        for page in sorted(pages, key=lambda x: x.get("index", 99)):
            if slot > n + 1:
                break
            hit = pick([page], must)
            if not hit or hit["title"] in used:
                continue
            dest = OUTDIR / f"{key}-{slot}.webp"
            try:
                dest.write_bytes(to_card(download(hit["url"])))
            except Exception as e:
                print(f"✗ {key}-{slot}: {type(e).__name__}")
                continue
            credits[f"{key}-{slot}"] = {
                "label": photo["label"], "title": hit["title"], "page": hit["page"],
                "author": hit["author"], "license": hit["license"],
            }
            used.add(hit["title"])
            print(f"✓ {key}-{slot:<2} {dest.stat().st_size//1024:>3} KB  {hit['title'][:56]}")
            ok += 1
            slot += 1
            time.sleep(2.0)
    return ok


def main():
    args = sys.argv[1:]
    force = "--force" in args
    only = None
    if "--only" in args:
        only = set(args[args.index("--only") + 1].split(","))

    OUTDIR.mkdir(parents=True, exist_ok=True)
    credits = json.loads(CREDITS.read_text(encoding="utf-8")) if CREDITS.exists() else {}

    if "--variants" in args:
        n = fetch_variants(args[args.index("--variants") + 1], credits)
        CREDITS.write_text(json.dumps(credits, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"\n{n} variantes baixadas")
        return

    todo = [p for p in PHOTO_KEYS if (only is None or p["id"] in only)]
    ok = skip = fail = 0
    for i, p in enumerate(todo, 1):
        dest = OUTDIR / f"{p['id']}.webp"
        if dest.exists() and not force:
            skip += 1
            continue
        try:
            if p.get("file"):
                hit = by_title(p["file"])
            else:
                must = must_tokens(p["q"], p["label"])
                hit = pick(search(p["q"], limit=24), must)
            if not hit and not p.get("file"):
                # 2ª tentativa amplia a busca, mas NUNCA relaxa o filtro de título:
                # foto errada é pior que sem foto — sem foto o app cai no gradiente
                # curado da chave, que pelo menos não mente sobre o cheiro.
                hit = pick(search(" ".join(must), limit=24), must)
            if not hit:
                print(f"[{i}/{len(todo)}] ✗ {p['id']}: nenhuma foto passou nos filtros")
                fail += 1
                continue
            dest.write_bytes(to_card(download(hit["url"])))
            credits[p["id"]] = {
                "label": p["label"], "title": hit["title"], "page": hit["page"],
                "author": hit["author"], "license": hit["license"],
            }
            ok += 1
            print(f"[{i}/{len(todo)}] ✓ {p['id']:<18} {dest.stat().st_size//1024:>3} KB  "
                  f"{(hit['license'] or '?')[:18]:<18} {hit['title'][:52]}")
        except Exception as e:  # rede/imagem quebrada não pode derrubar o lote
            print(f"[{i}/{len(todo)}] ✗ {p['id']}: {type(e).__name__} {e}")
            fail += 1
        time.sleep(5.0)  # educação com a API do Commons

    CREDITS.write_text(json.dumps(credits, ensure_ascii=False, indent=1), encoding="utf-8")
    total = sum(f.stat().st_size for f in OUTDIR.glob("*.webp"))
    print(f"\nbaixadas {ok} | já existiam {skip} | falharam {fail} | "
          f"total em disco {total/1024/1024:.1f} MB")


if __name__ == "__main__":
    main()
