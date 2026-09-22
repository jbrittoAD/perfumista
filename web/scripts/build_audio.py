#!/usr/bin/env python3
"""
build_audio.py — transforma um livro do ebook em narração e gera o mp3.

    python3 web/scripts/build_audio.py 01-cheiro-e-materia-prima
    python3 web/scripts/build_audio.py --todos
    python3 web/scripts/build_audio.py 04-sabonete --so-texto   # só o roteiro

O que ele faz, nesta ordem:
  1. tira figura, link, marcação e código — o ouvinte não vê nada disso;
  2. troca cada TABELA pela narração escrita à mão em audio/narracoes.md
     (tabela sem narração é PULADA: livro de consulta não vira áudio);
  3. aplica o glossário — termo em inglês faz a voz multilíngue mudar de idioma,
     e não há como forçar por parâmetro (SSML é lido em voz alta pelo CLI);
  4. normaliza número, unidade e símbolo para a forma que se fala;
  5. corta em blocos, manda pro Edge TTS e junta com ffmpeg sem re-encodar.

Decisões registradas em knowledge/ebook/AUDIOLIVRO.md.
"""
import argparse, re, subprocess, sys, unicodedata

PY_TTS = ""
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
LIVROS = RAIZ / "knowledge" / "ebook"
NARR = LIVROS / "audio" / "narracoes.md"
SAIDA = LIVROS / "audio"

# Francisca é MONOLÍNGUE pt-BR: ela não tem outro idioma para escorregar.
# A Thalita é multilíngue e, mesmo com xml:lang='pt-BR' no SSML, ainda trocava
# para espanhol em trechos com termo técnico — confirmado ouvindo. Não existe
# trava de idioma neste endpoint (o <lang> do Azure é rejeitado), então a saída
# é escolher uma voz que só fale português.
VOZ, RATE, PITCH = "pt-BR-FranciscaNeural", "-12%", "-8Hz"
VENV = RAIZ / ".venv-audio"          # ambiente próprio do gerador (fora do git)


def tts_python() -> str:
    """Devolve o python que tem o edge_tts. Cria o ambiente na primeira vez.

    Chamar `uvx edge-tts` a cada bloco resolvia o ambiente de novo toda vez e
    dominava o tempo de geração — 1,7 s de síntese contra dezenas de resolução.
    """
    py = VENV / "bin" / "python3"
    if not py.exists():
        print("  criando o ambiente de áudio (uma vez só)…")
        subprocess.run(["uv", "venv", str(VENV)], check=True, capture_output=True)
        subprocess.run(["uv", "pip", "install", "--python", str(py), "--quiet", "edge-tts"],
                       check=True, capture_output=True)
    return str(py)

# Termo estrangeiro é o que faz a voz escorregar para o espanhol. Traduzir, nunca
# transcrever foneticamente — grafia tipo "cóuld prócess" empurra mais ainda.
# expressão em inglês: casa sem olhar caixa
GLOSSARIO = [
    (r"\bmelt\s*(&|and)\s*pour\b", "base glicerinada"), (r"\bcold\s+process\b", "processo a frio"),
    (r"\bleave-?on\b", "produto que fica na pele"), (r"\brinse-?off\b", "produto que se enxágua"),
    (r"\bchallenge\s+test\b", "teste de desafio do conservante"), (r"\bpatch\s+test\b", "teste de contato"),
    (r"\bsuperfat\b", "gordura sobrando"), (r"\bblur\b", "desfoque"), (r"\bsyndet\b", "sindete"),
    (r"\bnoodles?\b", "flocos"), (r"\bseize\b", "endurecimento súbito"), (r"\bricing\b", "grumos"),
    (r"\bslip\b", "deslize"), (r"\bshampoo\b", "xampu"),
]
# Termo francês de perfumaria: mesmo numa voz monolíngue, a grafia original sai
# esquisita. Escrevemos como o perfumista brasileiro fala.
FRANCES = [
    (r"\bfoug[eè]res?\b", "fujér"), (r"\bchypr[eé]s?\b", "chipre"),
    (r"\bsillage\b", "silage"), (r"\beau de parfum\b", "ô de parfã"),
    (r"\beau de toilette\b", "ô de tualete"), (r"\bextrait\b", "extré"),
    (r"\bJean Carles\b", "Jã Carles"), (r"\bparfum\b", "parfã"),
    (r"\bcoeurs?\b", "querr"), (r"\bPoucher\b", "Puchêr"),
    (r"\bhespéride\b", "esperide"),
]
# SIGLA: case-SENSITIVE, senão "DOS" casa com "dos" e "SLS" com qualquer coisa
SIGLAS = [
    (r"\bSCI\b", "isetionato de sódio"), (r"\bSLSA\b", "lauril sulfoacetato"),
    (r"\bSLES\b", "lauril éter sulfato"), (r"\bSLS\b", "lauril sulfato"),
    (r"\bBTMS\b", "bê-tê-eme-esse"), (r"\bCAPB\b", "cocamidopropil betaína"),
    (r"\bPET\b", "teste de desafio"), (r"\bDOS\b", "manchas de ranço"),
    (r"\bPFF2\b", "pê-efe-efe dois"), (r"\bINCI\b", "inci"), (r"\bCS\b", "cê-esse"),
]
UNIDADES = [
    (r"\bpH\b", "pê-agá"), (r"°C", " graus"), (r"≤\s*", "no máximo "), (r"≥\s*", "no mínimo "),
    (r"(\d)\s*×", r"\1 vezes"), (r"\bg/mol\b", "por mol"), (r"\bmg\b", "miligramas"),
    (r"\bkg\b", "quilos"), (r"\bml\b", "mililitros"), (r"\bkbps\b", "kilobits"),
    (r"\bh\b", "horas"), (r"\bmin\b", "minutos"),
    (r"~\s*(\d)", r"cerca de \1"), (r"(\d)\s*s\b", r"\1 segundos"),
    (r"\bnº\s*", "número "), (r"(\d)\s*ª", r"\1ª"),
]

def desmarcar(txt: str) -> str:
    txt = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", txt)          # figura: não se anuncia
    txt = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", txt)       # link vira o texto
    txt = re.sub(r"`([^`]*)`", r"\1", txt)
    txt = re.sub(r"\*\*|\*|__|~~", "", txt)
    txt = re.sub(r"^\s*>\s?", "", txt, flags=re.M)
    txt = re.sub(r"^\s*[-•]\s+", "", txt, flags=re.M)
    # Marcador de lista, não número solto: "364. O Sandalore..." numa narração
    # era apagado inteiro, e o ouvinte perdia o dado sem ninguém notar. Lista de
    # verdade não passa de 20 itens neste livro.
    txt = re.sub(r"^\s*(?:[1-9]|1\d|20)\.\s+", "", txt, flags=re.M)
    txt = re.sub(r"^-{3,}$", "", txt, flags=re.M)
    return txt

def numeros(txt: str) -> str:
    txt = re.sub(r"R\$\s*(\d+),(\d{2})\s*/\s*g", r"\1 reais e \2 por grama", txt)
    txt = re.sub(r"R\$\s*0,(\d{2})", r"\1 centavos", txt)
    txt = re.sub(r"R\$\s*(\d+),(\d{2})", r"\1 reais e \2", txt)
    txt = re.sub(r"R\$\s*(\d+)", r"\1 reais", txt)
    txt = re.sub(r"(\d)\s*[–—]\s*(\d)", r"\1 a \2", txt)     # faixa: 4–6 → 4 a 6
    for de, para in UNIDADES:
        txt = re.sub(de, para, txt)
    return txt

def carregar_narracoes() -> dict:
    if not NARR.exists(): return {}
    blocos = re.split(r"^## (.+?) :: (T\d+|RESUMO)\s*$", NARR.read_text(), flags=re.M)
    saida = {}
    for i in range(1, len(blocos), 3):
        saida[(blocos[i].strip(), blocos[i + 1].strip())] = blocos[i + 2].strip()
    return saida

def conferir_narracoes(narracoes: dict) -> None:
    """Avisa se a limpeza de markdown está comendo palavra de narração.

    Aconteceu de verdade: a narração dizia "...a cumarina em / 364. O Sandalore
    aguenta...", e como "364. " abre linha igual a item de lista numerada, o
    desmarcar() apagava o número. O ouvinte perdia o dado e nada acusava — o
    checar_idioma.py compara o áudio com o roteiro JÁ processado, então para ele
    estava tudo certo. A conferência é aqui, antes de virar áudio.
    """
    # Só conta o que tem letra ou número: separador "---" some na limpeza, e
    # deve sumir mesmo — contá-lo geraria aviso toda vez e a trava viraria ruído.
    def palavras(s):
        return [w for w in s.split() if any(c.isalnum() for c in w)]

    for (slug, chave), nar in narracoes.items():
        antes = len(palavras(nar))
        depois = len(palavras(desmarcar(nar)))
        if depois < antes:
            print(f"  ⚠️  {slug} :: {chave} perdeu {antes - depois} palavra(s) na limpeza "
                  f"de markdown — provavelmente uma linha começa com número, hífen ou '>'")


def roteiro(slug: str) -> str:
    md = (LIVROS / f"{slug}.md").read_text()
    narracoes = carregar_narracoes()
    conferir_narracoes(narracoes)
    # livro de consulta (dicionário, apêndice): entra como resumo falado, não inteiro
    if (slug, "RESUMO") in narracoes:
        return narracoes[(slug, "RESUMO")]
    linhas, fora, n_tab, puladas = md.split("\n"), [], 0, 0
    i = 0
    while i < len(linhas):
        l = linhas[i]
        if l.strip().startswith("|"):
            bloco = []
            while i < len(linhas) and linhas[i].strip().startswith("|"):
                bloco.append(linhas[i]); i += 1
            if len(bloco) >= 3:
                n_tab += 1
                nar = narracoes.get((slug, f"T{n_tab}"))
                if nar:
                    # "Treinar o nariz, protocolo de 8 semanas:" é chamada da tabela;
                    # falada, ela duplica a primeira frase da narração.
                    while fora and not fora[-1].strip(): fora.pop()
                    if fora and re.sub(r"[*_`\s]+$", "", fora[-1]).endswith(":"): fora.pop()
                    fora.append("\n" + nar + "\n")
                else: puladas += 1
            continue
        if l.startswith("# "):   fora.append(l[2:].strip() + ".")
        elif l.startswith("## "): fora.append("\n" + re.sub(r"^#+\s*", "", l).strip().rstrip(".") + ".")
        elif l.startswith("###"): fora.append("\n" + re.sub(r"^#+\s*", "", l).strip().rstrip(".") + ".")
        else: fora.append(l)
        i += 1
    # referência cruzada ("Catálogo dos 587 materiais: 01b") não faz sentido falada
    fora = [l for l in fora if not re.match(
        r"^\s*(Catálogo dos|Contexto e|Referência:|Complementa |Itens? \d|Pesquisado em|Fecha o item|Chave:)", l)]
    txt = desmarcar("\n".join(fora))
    for de, para in GLOSSARIO:
        txt = re.sub(de, para, txt, flags=re.I)
    for de, para in SIGLAS:
        txt = re.sub(de, para, txt)          # sem re.I: sigla é caixa alta
    for de, para in FRANCES:
        txt = re.sub(de, para, txt, flags=re.I)
    txt = numeros(txt)
    txt = re.sub(r"\n{3,}", "\n\n", txt).strip()
    if puladas: print(f"  ({puladas} tabela(s) sem narração — puladas)")
    return txt

def blocos(txt: str, limite=1400):
    atual = ""
    for par in txt.split("\n\n"):
        if len(atual) + len(par) > limite and atual:
            yield atual.strip(); atual = ""
        atual += par + "\n\n"
    if atual.strip(): yield atual.strip()

def gerar(slug: str, so_texto=False):
    SAIDA.mkdir(exist_ok=True)
    txt = roteiro(slug)
    (SAIDA / f"{slug}.txt").write_text(txt)
    palavras = len(txt.split())
    print(f"  roteiro: {palavras} palavras (~{palavras/140:.0f} min)")
    if so_texto: return
    global PY_TTS
    PY_TTS = tts_python()
    partes, tmp = [], SAIDA / "_partes"
    tmp.mkdir(exist_ok=True)
    for n, bloco in enumerate(blocos(txt), 1):
        f = tmp / f"{slug}-{n:03d}.mp3"
        # tts_pt.py reescreve o SSML com xml:lang='pt-BR' no <speak>, porque o
        # edge-tts manda 'en-US' fixo. Isso sozinho não resolveu: a voz
        # multilíngue ainda escorregava. Por isso a VOZ aqui é monolíngue.
        subprocess.run([PY_TTS, str(Path(__file__).parent / "tts_pt.py"),
                        "--voz", VOZ, "--rate", RATE, "--pitch", PITCH,
                        "--texto", bloco, "--saida", str(f)], check=True, capture_output=True)
        partes.append(f); print(f"    bloco {n}", end="\r")
    lista = tmp / f"{slug}.txt"
    lista.write_text("\n".join(f"file '{p.name}'" for p in partes))
    saida = SAIDA / f"{slug}.mp3"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0",
                    "-i", str(lista), "-c", "copy", str(saida)], check=True)
    for p in partes: p.unlink()
    lista.unlink()
    dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", str(saida)], capture_output=True, text=True).stdout.strip()
    mb = saida.stat().st_size / 1024 / 1024
    print(f"  → {saida.name}: {float(dur)/60:.1f} min · {mb:.1f} MB")

def unico():
    """Junta os 16 capítulos num arquivo só — é o formato que o YouTube quer.

    Sem recodificar: todos os capítulos saem do mesmo encoder, no mesmo bitrate,
    então o concat do ffmpeg só cola os quadros. Recodificar aqui perderia
    qualidade de graça.

    O arquivo NÃO entra no git: são os mesmos 2,5 h que já estão publicados em
    capítulos, e 140 MB duplicados no repositório não servem a ninguém.
    """
    faixas = [f for f in sorted(SAIDA.glob("*.mp3")) if not f.stem.startswith("Audiolivro")]
    if not faixas:
        print("nenhum capítulo gerado ainda"); return
    lista = SAIDA / "_unico.txt"
    lista.write_text("\n".join(f"file '{f.name}'" for f in faixas))
    saida = SAIDA / "Audiolivro-completo.mp3"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0",
                    "-i", str(lista), "-c", "copy", str(saida)], check=True)
    lista.unlink()
    dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", str(saida)], capture_output=True, text=True).stdout.strip()
    h = float(dur) / 3600
    print(f"\n→ {saida.name}: {len(faixas)} capítulos · {h:.1f} h · {saida.stat().st_size/1048576:.0f} MB")
    print(f"   {saida}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("slug", nargs="?")
    ap.add_argument("--todos", action="store_true")
    ap.add_argument("--so-texto", action="store_true")
    ap.add_argument("--unico", action="store_true",
                    help="junta os capítulos num arquivo só (YouTube)")
    a = ap.parse_args()
    if a.unico:
        unico(); raise SystemExit(0)
    alvos = [p.stem for p in sorted(LIVROS.glob("*.md"))
             if p.stem not in {"AUDIOLIVRO", "AUDIO-AMOSTRA", "01b-catalogo-por-familia"}] if a.todos else [a.slug]
    for s in alvos:
        print(f"\n{s}")
        gerar(s, a.so_texto)
