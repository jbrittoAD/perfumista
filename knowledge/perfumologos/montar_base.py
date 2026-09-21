#!/usr/bin/env python3
"""montar_base.py — transcrições + metadados -> base de conhecimento navegável.

Um arquivo por vídeo em `base/`, com cabeçalho de metadados e a transcrição
limpa. Mais o INDICE.md, ordenado do mais novo para o mais antigo — a ordem
importa: a regra do dono é que, havendo conflito, vale o que ele diz nos
vídeos mais recentes.
"""
import json
import re
from datetime import date
from pathlib import Path

AQUI = Path(__file__).parent
SUBS, TEXTO, BASE = AQUI / "subs", AQUI / "texto", AQUI / "base"


def meta(vid: str) -> dict:
    p = SUBS / f"{vid}.info.json"
    if not p.exists():
        return {}
    d = json.loads(p.read_text(encoding="utf-8"))
    return {k: d.get(k) for k in ("title", "upload_date", "duration", "view_count",
                                  "description", "categories", "tags")}


def main():
    BASE.mkdir(exist_ok=True)
    vids = []
    for t in sorted(TEXTO.glob("*.txt")):
        vid = t.stem
        m = meta(vid)
        up = m.get("upload_date") or ""
        iso = f"{up[:4]}-{up[4:6]}-{up[6:]}" if len(up) == 8 else "?"
        titulo = m.get("title") or vid
        dur = int(m.get("duration") or 0)
        vids.append((iso, vid, titulo, dur, m))
        cab = [
            f"# {titulo}", "",
            f"- **vídeo**: https://youtu.be/{vid}",
            f"- **publicado**: {iso}",
            f"- **duração**: {dur//60}min{dur%60:02d}",
        ]
        if m.get("description"):
            cab += ["", "## Descrição do autor", "", m["description"].strip()]
        cab += ["", "## Transcrição", "", t.read_text(encoding="utf-8")]
        (BASE / f"{iso}--{vid}.md").write_text("\n".join(cab), encoding="utf-8")

    vids.sort(reverse=True)
    idx = [
        "# PerfumoLogos — canal de Victor Lopes",
        "",
        "Transcrição de todo o canal, do mais NOVO para o mais antigo.",
        "",
        "> **Ordem de autoridade**: havendo conflito entre dois vídeos, vale o mais",
        "> recente. Esta lista já está nessa ordem — o de cima manda.",
        "",
        f"_{len(vids)} vídeos · gerado em {date.today().isoformat()}_",
        "",
        "| publicado | duração | vídeo |",
        "|---|---|---|",
    ]
    for iso, vid, titulo, dur, _ in vids:
        idx.append(f"| {iso} | {dur//60}min | [{titulo}](base/{iso}--{vid}.md) |")
    (AQUI / "INDICE.md").write_text("\n".join(idx) + "\n", encoding="utf-8")
    print(f"{len(vids)} vídeos na base · {sum(1 for v in vids if v[0] != '?')} com data")


if __name__ == "__main__":
    main()
