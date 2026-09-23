#!/usr/bin/env python3
"""
precache_assets.py — injeta no service worker os assets com hash do build.

O Next gera JS/CSS com nome hasheado a cada build, então eles não podem estar
escritos à mão no sw.js. Este script roda DEPOIS do `npm run build`: varre os
HTML de out/, coleta os /_next/static/* que as telas referenciam e escreve a
lista dentro de out/sw.js.

Efeito prático: ao instalar, a PWA baixa tudo de uma vez — inclusive o ebook.
Sem isto, o livro só ficaria offline depois de aberto uma vez com rede.

Uso:  NEXT_PUBLIC_BASE_PATH=/perfumista npm run build && python3 scripts/precache_assets.py
"""
import json, os, re, sys
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "out"
SW = OUT / "sw.js"
BASE = os.environ.get("NEXT_PUBLIC_BASE_PATH", "")

def main():
    if not SW.exists():
        sys.exit("out/sw.js não existe — rode o build antes.")
    padrao = re.compile(r'["\'(]([^"\'()]*?/_next/static/[A-Za-z0-9/._-]+\.(?:js|css))')
    achados = set()
    for html in OUT.rglob("*.html"):
        for m in padrao.finditer(html.read_text(errors="ignore")):
            achados.add(m.group(1))

    # vira caminho relativo ao próprio sw.js (funciona na raiz e em subpath)
    rel = set()
    for u in achados:
        caminho = u[len(BASE):] if BASE and u.startswith(BASE) else u
        caminho = caminho.lstrip("/")
        if (OUT / caminho).exists():
            rel.add("./" + caminho)

    # As rotas dos livros também são geradas: escritas à mão no sw.js, elas
    # ficam para trás quando entra livro novo — e o livro novo simplesmente não
    # funciona offline, sem nada acusar. A fonte é o books.json.
    livros = json.loads((OUT.parent / "lib" / "data" / "books.json").read_text())["livros"]
    rotas = "\n  ".join(f'"./livros/{l["slug"]}",' for l in livros)
    s0 = SW.read_text()
    s0 = re.sub(r'(  "\./livros",\n  "\./livros/audio",\n)(?:  "\./livros/[^"]+",\n)*',
                lambda m: m.group(1) + "  " + rotas + "\n", s0, count=1)
    SW.write_text(s0)
    print(f"sw.js: {len(livros)} rotas de livro no precache")

    # Zero asset NUNCA é resultado válido: significa que o basePath do ambiente
    # não bate com o do build, e o app iria ao ar sem precache — offline quebrado
    # na primeira abertura, que é justamente o caso de uso. Falhar aqui é melhor
    # que publicar calado.
    if not rel:
        sys.exit(f"nenhum asset encontrado (achei {len(achados)} referências nos HTML).\n"
                 f"NEXT_PUBLIC_BASE_PATH está como {BASE!r} — tem de ser o MESMO do build.\n"
                 f"exemplo: NEXT_PUBLIC_BASE_PATH=/perfumista python3 {Path(__file__).name}")

    lista = ",\n  ".join(f'"{u}"' for u in sorted(rel))
    s = SW.read_text()
    novo = re.sub(r"const BUILD_ASSETS = \[[^\]]*\];",
                  f"const BUILD_ASSETS = [\n  {lista},\n];", s, count=1)
    if novo == s:
        sys.exit("não achei o marcador BUILD_ASSETS no sw.js")
    SW.write_text(novo)
    kb = sum((OUT / u[2:]).stat().st_size for u in rel) / 1024
    print(f"sw.js: {len(rel)} assets no precache ({kb:.0f} KB)")

if __name__ == "__main__":
    main()
