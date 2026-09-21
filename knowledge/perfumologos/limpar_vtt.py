#!/usr/bin/env python3
"""limpar_vtt.py — VTT do YouTube -> texto corrido com marca de tempo.

A legenda automática do YouTube vem em rolagem: cada bloco repete a linha
anterior e traz timing por palavra (<00:00:00.680><c> aí</c>). Lida crua, uma
transcrição de 25 minutos vira 4000 linhas com cada frase três vezes. Isto
reduz a uma linha por fala, com o minuto na frente para poder voltar ao vídeo.
"""
import re
import sys
from pathlib import Path

TAG = re.compile(r"<[^>]+>")
# aceita vtt (00:00:00.359) e srt (00:00:00,359): o --convert-subs do
# yt-dlp só converte quando o ffmpeg dá conta, então vêm os dois.
TEMPO = re.compile(r"^(\d\d):(\d\d):(\d\d)[.,]\d+\s+-->")
SO_NUMERO = re.compile(r"^\d+$")


def limpar(vtt: str) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    visto: set[str] = set()
    ts = "00:00"
    for linha in vtt.splitlines():
        m = TEMPO.match(linha)
        if m:
            h, mi, s = m.groups()
            ts = f"{int(h)*60 + int(mi):02d}:{s}"
            continue
        if not linha.strip() or linha.startswith(("WEBVTT", "Kind:", "Language:")):
            continue
        if SO_NUMERO.match(linha.strip()):      # numeração de bloco do srt
            continue
        txt = TAG.sub("", linha).strip()
        if not txt or txt in visto:
            continue
        visto.add(txt)
        # o bloco seguinte costuma começar repetindo o fim do anterior
        if out and out[-1][1].endswith(txt):
            continue
        if out and txt.startswith(out[-1][1]):
            out[-1] = (out[-1][0], txt)
            continue
        out.append((ts, txt))
    return out


def main():
    alvos = sorted(list(Path(sys.argv[1]).glob("*.pt-orig.vtt"))
                + list(Path(sys.argv[1]).glob("*.pt-orig.srt")))
    for p in alvos:
        falas = limpar(p.read_text(encoding="utf-8", errors="ignore"))
        destino = Path(sys.argv[2]) / (p.name.split(".")[0] + ".txt")
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_text("\n".join(f"[{t}] {x}" for t, x in falas), encoding="utf-8")
        print(f"{p.name:<34} {len(falas):>5} falas -> {destino.name}")


if __name__ == "__main__":
    main()
