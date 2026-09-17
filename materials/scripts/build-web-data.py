#!/usr/bin/env python3
"""
Regenera os dados ESTÁTICOS que o webapp (PWA) consome, a partir do banco
materials/data/materials.db + knowledge/data/aroma-chemicals.json.

Gera em web/lib/data/:
  - materials.json  (todos os aroma chemicals + offers + synonyms + derivados
                     + cap_color, family_canon, key_uses)
  - facets.json     (notes/families/kinds/strengths/sources/totals)
  - shopping.json   (por cor de tampa: lista ordenada p/ a página /compras)

Uso:  python3 materials/scripts/build-web-data.py
(rode depois de `npm run refresh` / mudanças no banco; depois rebuild+deploy o web/)
"""
import sqlite3, json, re, unicodedata, os, math

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DB   = os.path.join(ROOT, "materials", "data", "materials.db")
WEB  = os.path.join(ROOT, "web", "lib", "data")
os.makedirs(WEB, exist_ok=True)

def strip(s): return ''.join(c for c in unicodedata.normalize('NFD', (s or '').lower()) if unicodedata.category(c) != 'Mn')
def norm(s):
    s = strip(s); s = re.sub(r'\(.*?\)', '', s); s = re.sub(r'[^a-z0-9 ]', ' ', s); return re.sub(r'\s+', ' ', s).strip()
def cas_norm(x):
    m = re.search(r'(\d{2,7})-(\d{2})-(\d)', x or ''); return f"{m[1]}-{m[2]}-{m[3]}" if m else None

# --- base de pesquisa (família limpa + key_uses + descriptors) ---
ref = json.load(open(os.path.join(ROOT, "knowledge", "data", "aroma-chemicals.json")))
ref_cas, ref_name = {}, {}
for r in ref:
    rec = {"family": r.get("odor_family"), "key_uses": r.get("key_uses"),
           "descriptors": r.get("descriptors"), "use": r.get("typical_use_pct")}
    if r.get("cas"): ref_cas[cas_norm(r["cas"])] = rec
    for nm in [r.get("name"), r.get("name_pt")] + (r.get("synonyms") or []):
        if nm: ref_name.setdefault(norm(nm), rec)

# família canônica -> cor da tampa (9 cores)
FAM2COLOR = {"citrus":"amarelo","floral":"pink","green":"verde-folha","herbal":"azul","spicy":"azul",
 "aromatic":"azul","woody":"verde-escuro","aquatic":"verde-agua","aldehydic":"verde-agua",
 "gourmand":"laranja","fruity":"laranja","amber":"preto","balsamic":"preto","leather":"preto",
 "animalic":"preto","musk":"branco"}

# Correções manuais de família p/ acordes/bases onde a heurística erra pelo nome
# (ex.: "neroli"->citrus, "tamarine"->marine, "base"->default âmbar). Chave = material id.
FAMILY_OVERRIDE = {
 458:"floral",   # Neroli Artessence
 465:"citrus",   # Bergamota (perfumistico) — nome tinha "woody"
 470:"aquatic",  # Seaweed (algas marinhas)
 480:"woody",    # Pinho
 209:"fruity",   # BASE PRUNELA (ameixa)
 175:"fruity",   # Cassis Base SF (groselha preta)
 210:"floral",   # Jasmim Base
 227:"floral",   # Base Lyral (muguet)
 306:"citrus",   # Metil Pamplemousse (grapefruit)
 218:"green",    # Salicilato de cis-3-hexenila
 471:"green",    # Galbano Base
 504:"green",    # BS Galbano
 205:"fruity",   # TAMARINE (tamarindo) — pegou "marine" por engano
 331:"floral",   # Dorinia (base de rosa, Firmenich)
 467:"floral",   # Orris Givco (íris)
 475:"woody",    # Black Agar (agarwood/oud)
 474:"gourmand", # Miel Blanc (mel)
}
def kw_family(t):
    t = strip(t); h = lambda *k: any(x in t for x in k)
    if h('musk','almisc','muscen'): return 'musk'
    if h('ambar','amber','balsam','labdan','benzoin','olibano','incenso','mirra','myrrh','couro','leather','animal','indol','castore','civet','tabaco','tobacco','resin','narcot'): return 'amber'
    if h('musgo','oakmoss','madeir','wood','cedar','cedro','sandal','vetiver','patchoul','oud','guaiac'): return 'woody'
    if h('citr','lemon','laranj','orange','bergamot','grapefruit','hesper','neroli','petitgrain'): return 'citrus'
    if h('aquat','marine','marinh','ozon','calone','melon','aldeid','aldehyd','ceros','soapy'): return 'aquatic'
    if h('lavand','alecrim','rosemary','thyme','tomilho','sage','aromat','spic','pepper','pimenta','canela','cinnam','clove','cravo','cardamom','cumin','anis','menta','mint','carvon','eugenol','estragol'): return 'herbal'
    if h('gourm','caramel','vanil','baunilh','tonka','cumar','praline','doce','sweet','honey','coco','lact','leite','choc','coffee','nutty','berry','fruit','frut','peach','apple','tropical','heliotrop','amendo'): return 'gourmand'
    if h('flor','rose','rosa','jasmin','muguet','lily','lirio','violet','tuberose','ylang','lilac','hyacinth','gerani','narcis','mimosa','linden','orris','iris'): return 'floral'
    if h('verde','green','leaf','galban','herb','fig'): return 'green'
    return 'amber'

db = sqlite3.connect(DB); db.row_factory = sqlite3.Row; c = db.cursor()
mats = [dict(r) for r in c.execute("SELECT * FROM materials WHERE is_aroma_chemical=1 ORDER BY name_canonical")]
offers_by, syn_by = {}, {}
for o in c.execute("SELECT material_id,source,source_url,product_name,cas_raw,brand,size_value,size_unit,dilution,price,price_per_g,in_stock FROM offers WHERE material_id IS NOT NULL ORDER BY price_per_g"):
    offers_by.setdefault(o["material_id"], []).append(dict(o))
for s in c.execute("SELECT material_id,synonym FROM material_synonyms"):
    syn_by.setdefault(s["material_id"], []).append(s["synonym"])

out = []
for m in mats:
    offs = offers_by.get(m["id"], [])
    prices = [o["price"] for o in offs if o["price"] is not None]
    ppgs = [o["price_per_g"] for o in offs if o["price_per_g"] is not None]
    ref_rec = ref_cas.get(cas_norm(m.get("cas"))) or ref_name.get(norm(m.get("name_canonical")))
    fam = (ref_rec or {}).get("family") or kw_family((m.get("odor_family") or '') + ' ' + (m.get("odor_description") or '') + ' ' + (m.get("name_canonical") or ''))
    fam = FAMILY_OVERRIDE.get(m["id"], fam)
    m.update({
        "offers": offs,
        "synonyms": sorted(set(syn_by.get(m["id"], [])))[:30],
        "min_price": min(prices) if prices else None,
        "min_price_per_g": min(ppgs) if ppgs else None,
        "offer_count": len(offs),
        "sources": ",".join(sorted(set(o["source"] for o in offs))) or None,
        "cheapest_source": (min(offs, key=lambda o: o["price_per_g"] if o["price_per_g"] is not None else 9e9)["source"] if ppgs else None),
        "family_canon": fam,
        "cap_color": FAM2COLOR.get((fam or '').lower(), "preto"),
        "key_uses": (ref_rec or {}).get("key_uses"),
    })
    out.append(m)
json.dump(out, open(os.path.join(WEB, "materials.json"), "w"), ensure_ascii=False)

# facets
def facet(col):
    return [dict(r) for r in c.execute(f"SELECT {col} v, COUNT(*) n FROM materials WHERE is_aroma_chemical=1 AND {col} IS NOT NULL GROUP BY {col} ORDER BY n DESC")]
facets = {"notes": facet("note_type"), "families": facet("odor_family")[:20], "kinds": facet("material_kind"),
          "strengths": facet("odor_strength"),
          "sources": [{"v": s, "n": sum(1 for m in out if m["sources"] and s in m["sources"])} for s in ["flavorist","perfumistico","perfumoteca","euperfumista"]],
          "totals": {"materials": len(out), "offers": sum(m["offer_count"] for m in out)}}
json.dump(facets, open(os.path.join(WEB, "facets.json"), "w"), ensure_ascii=False)

# shopping por cor (dedupe por nome, ordena por disponibilidade/preço)
seen = {}
for m in out:
    k = norm(m["name_canonical"])
    if k in seen and (m["offer_count"] or 0) <= (seen[k]["offer_count"] or 0): continue
    seen[k] = m
shop = {}
for m in seen.values():
    shop.setdefault(m["cap_color"], []).append(m)
for color in shop:
    shop[color].sort(key=lambda m: (-(m["offer_count"] or 0), m["min_price"] or 9999))
    shop[color] = [{"id": m["id"], "name": m["name_canonical"], "cas": m.get("cas"), "min_price": m.get("min_price"),
                    "cheapest_source": m.get("cheapest_source"), "offer_count": m.get("offer_count")} for m in shop[color]]
json.dump(shop, open(os.path.join(WEB, "shopping.json"), "w"), ensure_ascii=False, indent=1)

print(f"OK: {len(out)} materiais -> web/lib/data/materials.json, facets.json, shopping.json")
print("cores:", {k: len(v) for k, v in shop.items()})
