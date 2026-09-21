#!/usr/bin/env python3
"""indexar_temas.py — mapa tema -> vídeos, do mais novo para o mais antigo.

Sem isto a base são 53 transcrições e nenhuma porta de entrada. O índice por
data responde "o que ele disse por último"; este responde "onde ele fala de X",
que é a pergunta que se faz na prática.

Cada tema lista os vídeos por relevância bruta (quantas vezes o assunto aparece)
MAS com a data ao lado, porque a regra da casa é que o mais recente manda.
"""
import json
import re
from pathlib import Path

AQUI = Path(__file__).parent

TEMAS = {
    "Diluição e soluções de trabalho": r"dilu[ií]|solu[çc][ãa]o de trabalho|\b10 ?%|\b1 ?%",
    "Fixação e longevidade": r"fixa[çc]|fixador|longevidade|substantivid|durar? mais",
    "Projeção e sillage": r"proje[çc]|sillage|silagem|difusiv|limiar de detec",
    "Curva de evaporação": r"curva de evapora|evapora[çc]|nota de topo|nota de base",
    "Maceração": r"macera",
    "Acordes e construção": r"\bacorde|jean carles|constru[íi]r? um",
    "Bases prontas e universais": r"base universal|base pronta|base de reconstitui",
    "Álcool, DPG e solventes": r"\bdpg\b|dipropileno|[áa]lcool de cereais|solvente|ve[íi]culo",
    "Equipamento e bancada": r"balan[çc]a|pipeta|frasco|etiqueta|equipamento|bancada",
    "Fornecedores e compra": r"fornecedor|perfum[íi]stico|flavorist|perfumoteca|onde comprar|pre[çc]o por grama",
    "Óleos essenciais e adulteração": r"adulter|[óo]leo essencial|cromatograf|gc.?ms",
    "Almíscares": r"almíscar|musk|galaxolide|habanolide|exaltolide|ambrettolide",
    "Âmbar e ambroxan": r"ambroxan|ambrox|ambergris|âmbar cinza|amberket",
    "IFRA e segurança": r"\bifra\b|alerg|sensibiliz|limite de uso|seguran[çc]a",
    "Olfato e treino": r"olfato|anosmia|treinar o nariz|mem[óo]ria olfativa|blotter|fita",
    "Clones e engenharia reversa": r"clone|tipo\b|inspirado|engenharia reversa|dupe",
    "Maceração e armazenamento": r"armazen|geladeira|luz|frasco [âa]mbar|validade",
}


def main():
    metas = {}
    for p in (AQUI / "subs").glob("*.info.json"):
        try:
            d = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            continue
        up = d.get("upload_date") or ""
        metas[p.name.split(".")[0]] = (
            f"{up[:4]}-{up[4:6]}-{up[6:]}" if len(up) == 8 else "?",
            d.get("title") or p.stem,
        )

    out = [
        "# PerfumoLogos — índice por tema",
        "",
        "Onde o Victor fala de cada assunto. O número entre parênteses é quantas",
        "vezes o tema aparece na transcrição — serve para achar o vídeo CENTRAL",
        "do assunto, não para medir qualidade.",
        "",
        "> **Em conflito, vale a data mais recente.** Ele mesmo diz, no vídeo de",
        "> equipamento de 12/09/2026, que o vídeo antigo sobre o mesmo tema",
        "> \"ficou desatualizado\" e que já não recomenda várias coisas de lá.",
        "",
    ]
    for tema, pat in TEMAS.items():
        rx = re.compile(pat, re.I)
        achados = []
        for t in (AQUI / "texto").glob("*.txt"):
            n = len(rx.findall(t.read_text(encoding="utf-8", errors="ignore")))
            if n >= 5:
                data, titulo = metas.get(t.stem, ("?", t.stem))
                achados.append((n, data, titulo, t.stem))
        if not achados:
            continue
        achados.sort(key=lambda x: (-x[0], x[1]))
        out.append(f"## {tema}")
        out.append("")
        for n, data, titulo, vid in achados[:6]:
            out.append(f"- **{data}** · [{titulo}](base/{data}--{vid}.md) ({n})")
        out.append("")
    (AQUI / "TEMAS.md").write_text("\n".join(out), encoding="utf-8")
    print(f"{len(TEMAS)} temas indexados")


if __name__ == "__main__":
    main()
