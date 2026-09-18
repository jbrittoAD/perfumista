# -*- coding: utf-8 -*-
"""
enrich_pubchem.py — Completa a física dos materiais pelo PubChem.

POR QUE: mais da metade do catálogo veio dos fornecedores sem massa molar (55%),
sem ponto de ebulição (64%) e sem força do odor (61%). Isso não é detalhe de
ficha técnica — é o que decide a POSIÇÃO NA PIRÂMIDE de cada carta. Sem física,
204 cartas recebiam a posição por chute do padrão da família.

FONTE: PUG REST do PubChem (NCBI). É API pública, feita para acesso
programático, sem chave. O limite pedido pela NCBI é 5 req/s; aqui vai bem
abaixo disso.

  (O The Good Scents Company, que teria as descrições perceptuais, proíbe
   agentes de IA no robots.txt — ClaudeBot/anthropic-ai com Disallow: / — então
   não é raspado aqui. O que ele daria de perceptual entra no projeto por
   curadoria manual, em deck_notes_pt.py.)

SAÍDA: materials/data/pubchem.json, um cache por CAS. Rodar de novo é barato:
só busca o que ainda não está no cache.

Rodar:  cd web && python3 scripts/enrich_pubchem.py [--limit N] [--force]
"""

import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
SRC = ROOT / "lib" / "data" / "materials.json"
CACHE = ROOT.parent / "materials" / "data" / "pubchem.json"

API = "https://pubchem.ncbi.nlm.nih.gov/rest"
UA = "PerfumistaDeck/1.0 (app pessoal de estudo de perfumaria; uso não comercial)"
PAUSE = 0.34          # ~3 req/s, abaixo do limite pedido pela NCBI


def get(url, timeout=30):
    last = None
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None                      # CAS desconhecido: não é erro
            last = e
            time.sleep(2 * (attempt + 1))
        except Exception as e:
            last = e
            time.sleep(2 * (attempt + 1))
    if last:
        raise last
    return None


def props_by_cas(cas):
    """CAS → CID, massa molar, logP, nome IUPAC."""
    url = (f"{API}/pug/compound/name/{urllib.parse.quote(cas)}"
           "/property/MolecularWeight,XLogP,IUPACName/JSON")
    d = get(url)
    if not d:
        return None
    rows = d.get("PropertyTable", {}).get("Properties", [])
    if not rows:
        return None
    r = rows[0]
    return {
        "cid": r.get("CID"),
        "mw": _num(r.get("MolecularWeight")),
        "logp": _num(r.get("XLogP")),
        "iupac": r.get("IUPACName"),
    }


def _num(v):
    try:
        return round(float(v), 3)
    except (TypeError, ValueError):
        return None


# "177.6 °C" | "175-177 °C" | "348 to 349 °F at 760 mmHg"
TEMP_RE = re.compile(r"(-?\d+(?:\.\d+)?)\s*(?:to|-|–)?\s*(-?\d+(?:\.\d+)?)?\s*°?\s*([CF])\b", re.I)
VP_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:\[)?mm\s*Hg", re.I)


def parse_temp_c(text):
    m = TEMP_RE.search(text)
    if not m:
        return None
    a = float(m.group(1))
    b = float(m.group(2)) if m.group(2) else a
    val = (a + b) / 2
    if m.group(3).upper() == "F":
        val = (val - 32) * 5 / 9
    return round(val, 1) if -50 < val < 600 else None


def experimental(cid):
    """Ponto de ebulição (°C) e pressão de vapor (mmHg) das propriedades
    experimentais. Uma chamada só, em vez de uma por propriedade."""
    d = get(f"{API}/pug_view/data/compound/{cid}/JSON?heading=Experimental+Properties")
    if not d:
        return {}
    bp_texts, vp_texts = [], []

    def walk(node, heading=None):
        if isinstance(node, dict):
            h = node.get("TOCHeading", heading)
            for info in node.get("Information", []) or []:
                val = info.get("Value", {})
                chunks = [s.get("String", "") for s in val.get("StringWithMarkup", []) or []]
                if "Number" in val:
                    chunks.append(f"{val['Number'][0]} {val.get('Unit','')}"
                                  if isinstance(val["Number"], list) else str(val["Number"]))
                for c in chunks:
                    if h == "Boiling Point":
                        bp_texts.append(c)
                    elif h == "Vapor Pressure":
                        vp_texts.append(c)
            for v in node.values():
                if isinstance(v, (dict, list)):
                    walk(v, h)
        elif isinstance(node, list):
            for v in node:
                walk(v, heading)

    walk(d)
    out = {}
    for t in bp_texts:
        c = parse_temp_c(t)
        if c is not None:
            out["bp"] = c
            break
    for t in vp_texts:
        m = VP_RE.search(t)
        if m:
            try:
                out["vp"] = float(m.group(1))
                break
            except ValueError:
                pass
    return out


def main():
    args = sys.argv[1:]
    force = "--force" in args
    limit = int(args[args.index("--limit") + 1]) if "--limit" in args else None

    materials = json.loads(SRC.read_text(encoding="utf-8"))
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}

    todo = []
    for m in materials:
        cas = (m.get("cas") or "").strip()
        if not cas or (cas in cache and not force):
            continue
        todo.append(cas)
    todo = list(dict.fromkeys(todo))
    if limit:
        todo = todo[:limit]

    print(f"CAS no catálogo: {sum(1 for m in materials if m.get('cas'))} | "
          f"já em cache: {len(cache)} | a buscar: {len(todo)}")

    ok = miss = 0
    for i, cas in enumerate(todo, 1):
        try:
            p = props_by_cas(cas)
            if not p or not p.get("cid"):
                cache[cas] = {"found": False}
                miss += 1
            else:
                time.sleep(PAUSE)
                p.update(experimental(p["cid"]))
                p["found"] = True
                cache[cas] = p
                ok += 1
                print(f"[{i}/{len(todo)}] {cas:<14} CID {p['cid']:<9} "
                      f"MW {str(p.get('mw') or '—'):<8} BP {str(p.get('bp') or '—'):<7} "
                      f"logP {str(p.get('logp') or '—'):<6} VP {p.get('vp') or '—'}")
        except Exception as e:
            print(f"[{i}/{len(todo)}] {cas}: {type(e).__name__}")
        if i % 25 == 0:
            CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")
        time.sleep(PAUSE)

    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")
    found = sum(1 for v in cache.values() if v.get("found"))
    print(f"\nencontrados {ok} | sem registro {miss} | cache total {len(cache)} ({found} com dados)")
    for f in ("mw", "bp", "logp", "vp"):
        n = sum(1 for v in cache.values() if v.get(f) is not None)
        print(f"  com {f}: {n}")


if __name__ == "__main__":
    main()
