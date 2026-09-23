#!/usr/bin/env python3
"""
build_books.py — transforma o ebook em `web/lib/data/books.json`.

Lê os .md de knowledge/ebook/, converte para HTML com pandoc (gfm: tabelas),
INLINA as figuras SVG (para funcionar offline, sem requisição), e quebra cada
livro em seções de nível "##" — a seção é a unidade de progresso de leitura.

Rodar:  python3 web/scripts/build_books.py
"""
import json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "knowledge" / "ebook"
OUT = ROOT / "web" / "lib" / "data" / "books.json"

TITULOS = {
    "00-INDICE": ("Como usar este livro", "índice, escopo e registro da revisão"),
    "01-cheiro-e-materia-prima": ("1 · O cheiro e a matéria-prima", "olfato, famílias, volatilidade, IFRA, alérgenos"),
    "01b-catalogo-por-familia": ("1B · Catálogo dos 587 materiais", "por família: nota, força, dose, preço, cheiro"),
    "01c-similares-e-substitutos": ("1C · Os parecidos, lado a lado", "qual escolher e quanto custa de verdade"),
    "01d-natural-vs-sintetico": ("1D · Natural × sintético", "os mitos, o custo comparado e os solventes"),
    "02-bancada-e-criacao": ("2 · A bancada e a criação", "diluição, Jean Carles, planilha, maceração"),
    "02b-bancada-de-cosmetica": ("2B · A bancada de cosmética", "equipamento, EPI, compras e os três primeiros lotes"),
    "03-quimica": ("3 · A química que sustenta o resto", "tensoativos, emulsão, pH, conservação"),
    "03b-similares-cosmetica": ("3B · Os parecidos da cosmética", "tensoativo, emulsionante, conservante, manteiga"),
    "03c-dicionario-insumos": ("3C · Dicionário de insumos", "~160 materiais por função"),
    "04-sabonete": ("4 · Sabonete", "glicerinada, syndet, cold process, líquido"),
    "05-cabelo-barba-anidros": ("5 · Cabelo, barba e anidros", "shampoo sólido, BTMS, 3-em-1, bálsamo"),
    "06-emulsoes-e-ativos": ("6 · Emulsões e ativos", "creme, toque seco, ativos, alegações"),
    "07-perfumar-o-produto": ("7 · Perfumar o produto", "dose por categoria, substantividade, adaptação"),
    "08-qualidade": ("8 · Qualidade", "diagnóstico, estabilidade, PET, testes"),
    "09-negocio": ("9 · Virar negócio", "escala, preço, ANVISA, rótulo"),
    "10-apendices": ("Apêndices", "glossário, tabelas, fórmulas comentadas, fontes"),
    "11-a-compra": ("11 · A compra", "cinco versões da paleta, de R$ 294 a R$ 3.206"),
}
ORDEM = list(TITULOS.keys())


def md_to_html(path: Path) -> str:
    return subprocess.run(
        ["pandoc", "-f", "gfm", "-t", "html5", "--wrap=none", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout


def inline_svgs(html: str) -> str:
    """Troca <img src="figuras/x.svg" alt="..."> pelo SVG inteiro + legenda."""
    def sub(m):
        src, alt = m.group("src"), m.group("alt")
        f = SRC / src
        if not f.exists():
            return m.group(0)
        svg = f.read_text()
        svg = re.sub(r'\swidth="\d+"\s+height="\d+"', ' width="100%"', svg, count=1)
        return f'<figure class="fig">{svg}<figcaption>{alt}</figcaption></figure>'
    return re.sub(r'<img src="(?P<src>figuras/[^"]+)"[^>]*alt="(?P<alt>[^"]*)"[^>]*/?>', sub, html)


def split_sections(html: str):
    """Quebra em seções de <h2>. Cada seção vira unidade de progresso."""
    parts = re.split(r'(<h2\b[^>]*>.*?</h2>)', html, flags=re.S)
    head, out, i = parts[0], [], 0
    if head.strip():
        out.append({"id": "abertura", "titulo": "Abertura", "html": head})
    for j in range(1, len(parts), 2):
        h2, body = parts[j], parts[j + 1] if j + 1 < len(parts) else ""
        titulo = re.sub(r"<[^>]+>", "", h2).strip()
        i += 1
        out.append({"id": f"s{i}", "titulo": titulo, "html": h2 + body})
    return out


def copiar_audio():
    """Leva os mp3 gerados para public/audio, de onde o app os serve.

    Eles NÃO entram no precache (são ~50 MB contra 2,7 MB do app): a tela de
    ouvir guarda sob demanda, capítulo a capítulo ou tudo de uma vez.
    """
    origem = ROOT / "knowledge" / "ebook" / "audio"
    destino = ROOT / "web" / "public" / "audio"
    destino.mkdir(parents=True, exist_ok=True)
    # mp3 que não existe mais na origem (capítulo renomeado, voz trocada) tem de
    # sumir daqui, senão o app publica áudio velho ao lado do novo.
    # O Audiolivro-completo.mp3 é a concatenação dos 16 capítulos, feita só para
    # subir no YouTube. O app não o referencia, e copiá-lo dobraria o site: 108 MB
    # de conteúdo idêntico ao que já está publicado em capítulos.
    def e_capitulo(m):
        return not m.stem.startswith("Audiolivro")

    atuais = {m.name for m in origem.glob("*.mp3") if e_capitulo(m)}
    for velho in destino.glob("*.mp3"):
        if velho.name not in atuais:
            velho.unlink(); print(f"  áudio: removido órfão {velho.name}")
    n = tot = 0
    for mp3 in sorted(m for m in origem.glob("*.mp3") if e_capitulo(m)):
        alvo = destino / mp3.name
        if not alvo.exists() or alvo.stat().st_mtime < mp3.stat().st_mtime:
            alvo.write_bytes(mp3.read_bytes())
        n += 1; tot += alvo.stat().st_size
    if n: print(f"  áudio: {n} capítulos copiados para public/audio ({tot/1048576:.0f} MB)")


def copiar_pdf():
    """Leva o PDF gerado para public/, que é de onde a tela de download o pega.

    Já foi ao ar desatualizado uma vez: o build_pdf.sh escreve em knowledge/ e
    ninguém copiava. Agora a cópia é parte do build.
    """
    origem = ROOT / "knowledge" / "ebook" / "Do-quimico-aromatico-ao-produto.pdf"
    if not origem.exists():
        print("  ! PDF não encontrado — rode web/scripts/build_pdf.sh")
        return
    destino = ROOT / "web" / "public" / origem.name
    if not destino.exists() or destino.stat().st_mtime < origem.stat().st_mtime:
        destino.write_bytes(origem.read_bytes())
        print(f"  PDF: atualizado ({origem.stat().st_size/1048576:.1f} MB)")


def escrever_tamanhos():
    """Grava o tamanho real do PDF e do áudio para a tela de download mostrar.

    Estava escrito na mão no JSX ("4,7 MB", "~50 MB") e envelheceu: quando o
    bitrate dobrou, a tela continuou prometendo metade. Número que o usuário usa
    pra decidir se baixa no 4G não pode ser chute escrito em outro arquivo.
    """
    pdf = ROOT / "web" / "public" / "Do-quimico-aromatico-ao-produto.pdf"
    audio = sorted((ROOT / "knowledge" / "ebook" / "audio").glob("*.mp3"))
    audio = [m for m in audio if not m.stem.startswith("Audiolivro")]
    paginas = 0
    if pdf.exists():
        import re as _re
        paginas = len(_re.findall(rb"/Type\s*/Page[^s]", pdf.read_bytes()))
    dados = {
        "pdfPaginas": paginas,
        "pdfMB": round(pdf.stat().st_size / 1048576, 1) if pdf.exists() else 0,
        "audioMB": round(sum(m.stat().st_size for m in audio) / 1048576) if audio else 0,
        "capitulos": len(audio),
    }
    alvo = ROOT / "web" / "lib" / "data" / "tamanhos.json"
    alvo.write_text(json.dumps(dados, ensure_ascii=False))
    print(f"  tamanhos: PDF {dados['pdfMB']} MB · áudio {dados['audioMB']} MB em {dados['capitulos']} capítulos")


def main():
    livros = []
    for slug in ORDEM:
        f = SRC / f"{slug}.md"
        if not f.exists():
            print(f"  ! faltando {f.name}", file=sys.stderr)
            continue
        titulo, sub = TITULOS[slug]
        html = inline_svgs(md_to_html(f))
        secoes = split_sections(html)
        palavras = len(re.sub(r"<[^>]+>", " ", html).split())
        livros.append({
            "slug": slug, "titulo": titulo, "subtitulo": sub,
            "palavras": palavras, "minutos": max(1, round(palavras / 200)),
            "secoes": secoes,
        })
        print(f"  {slug:32s} {len(secoes):3d} seções · {palavras:6d} palavras")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"livros": livros}, ensure_ascii=False))
    kb = OUT.stat().st_size / 1024
    tot = sum(l["palavras"] for l in livros)
    copiar_audio()
    copiar_pdf()
    escrever_tamanhos()
    print(f"\n{OUT.relative_to(ROOT)}: {kb:.0f} KB · {len(livros)} livros · {tot} palavras · ~{round(tot/200)} min de leitura")


if __name__ == "__main__":
    main()
