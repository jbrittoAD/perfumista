#!/usr/bin/env python3
"""sync_physics.py — leva a física do SQLite para o materials.json.

POR QUE ISTO EXISTE. O `materials.json` é a entrada do build_deck, e é um
export da tabela `materials`. Só que não havia script que o regerasse: uma
correção feita no SQLite ficava lá, e o app continuava mostrando o dado velho.
Foi o que aconteceu com os pontos de ebulição — 156 materiais corrigidos no
banco, zero mudança no app, porque ninguém tinha exportado de novo.

Sincroniza só os campos físicos, casando por id. Não toca em texto, preço,
nota nem faceta: esses vêm de outras etapas e sobrescrevê-los aqui apagaria
curadoria.

    python3 scripts/sync_physics.py
"""
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT.parent / "materials" / "data" / "materials.db"
SRC = ROOT / "lib" / "data" / "materials.json"

CAMPOS = ("boiling_point_c", "molecular_weight", "logp", "vapor_pressure")


def main():
    db = sqlite3.connect(DB)
    fisica = {
        r[0]: dict(zip(CAMPOS, r[1:]))
        for r in db.execute(f"SELECT id, {', '.join(CAMPOS)} FROM materials")
    }
    mats = json.loads(SRC.read_text(encoding="utf-8"))

    mudou = {c: 0 for c in CAMPOS}
    for m in mats:
        novo = fisica.get(m.get("id"))
        if not novo:
            continue
        for c in CAMPOS:
            if m.get(c) != novo[c]:
                m[c] = novo[c]
                mudou[c] += 1

    SRC.write_text(json.dumps(mats, ensure_ascii=False), encoding="utf-8")
    print(f"{len(mats)} materiais · " + " · ".join(f"{c} {n}" for c, n in mudou.items()))


if __name__ == "__main__":
    main()
