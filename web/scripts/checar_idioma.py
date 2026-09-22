#!/usr/bin/env python3
"""
checar_idioma.py — confere o áudio gerado sem precisar escutar.

Duas perguntas, porque uma só não basta:

1. **Está tudo em português?** A voz do Edge escorrega para espanhol ou francês
   em frase ambígua ("cerca de 400 tipos" é espanhol válido) e em termo
   estrangeiro. O script corta o áudio nos silêncios e roda a detecção de
   idioma do Whisper em cada trecho.

2. **Está falando o que o livro diz?** Detecção de idioma não pega tabela
   vazando, bloco faltando nem palavra comida. Então o áudio é transcrito e
   comparado com o roteiro (`<slug>.txt`, salvo pelo build_audio.py). Divergiu
   muito, algo se perdeu no caminho.

    python3 web/scripts/checar_idioma.py 04-sabonete
    python3 web/scripts/checar_idioma.py --todos

Sai com código 1 se algum capítulo reprovar — dá para usar como portão antes
de publicar.
"""
import argparse, difflib, re, subprocess, sys, unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
AUDIO = RAIZ / "knowledge" / "ebook" / "audio"
SR = 16000
CONF_IDIOMA = 0.60   # confiança mínima para acusar outro idioma
MIN_TRECHO = 2.5     # trecho curto demais engana o detector
FIDELIDADE = 0.80    # abaixo disso o áudio não bate com o roteiro


def ler_audio(mp3: Path):
    import numpy as np
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(mp3),
                          "-f", "f32le", "-ar", str(SR), "-ac", "1", "-"],
                         capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


# O Whisper escreve número como dígito; o roteiro às vezes traz por extenso
# ("nove por um, oito por dois"). Sem unificar isso, o alinhador acusa buraco
# onde o áudio está perfeito — e gate que grita à toa para de ser lido. A
# conversão é aplicada nos DOIS lados, então "um fundo" vira "1 fundo" em ambos
# e nada se perde.
NUMEROS = {
    "zero": "0", "um": "1", "uma": "1", "dois": "2", "duas": "2", "tres": "3",
    "quatro": "4", "cinco": "5", "seis": "6", "sete": "7", "oito": "8", "nove": "9",
    "dez": "10", "onze": "11", "doze": "12", "treze": "13", "quatorze": "14",
    "catorze": "14", "quinze": "15", "dezesseis": "16", "dezessete": "17",
    "dezoito": "18", "dezenove": "19", "vinte": "20", "trinta": "30",
    "quarenta": "40", "cinquenta": "50", "sessenta": "60", "setenta": "70",
    "oitenta": "80", "noventa": "90", "cem": "100", "cento": "100", "mil": "1000",
    "meio": "0.5", "meia": "0.5",
}


def normalizar(t: str) -> list:
    """Compara som, não ortografia: sem acento, sem pontuação, sem caixa."""
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    t = re.sub(r"[^a-z0-9\s]", " ", t)
    return [NUMEROS.get(w, w) for w in t.split()]


def checar(mp3: Path, modelo, verbose=False) -> dict:
    audio = ler_audio(mp3)
    segmentos, _ = modelo.transcribe(audio, language="pt", beam_size=1,
                                     vad_filter=True, condition_on_previous_text=False)
    segmentos = list(segmentos)

    fora, falado = [], []
    for s in segmentos:
        falado.append(s.text)
        if s.end - s.start < MIN_TRECHO:
            continue
        trecho = audio[int(s.start * SR):int(s.end * SR)]
        lang, prob, _ = modelo.detect_language(audio=trecho)
        if lang != "pt" and prob >= CONF_IDIOMA:
            fora.append({"em": f"{int(s.start)//60}:{int(s.start)%60:02d}",
                         "idioma": lang, "conf": round(prob, 2),
                         "texto": s.text.strip()[:120]})

    r = {"arquivo": mp3.name, "fora": fora, "fidelidade": None, "buracos": []}

    roteiro = mp3.with_suffix(".txt")
    if roteiro.exists():
        esperado, ouvido = normalizar(roteiro.read_text()), normalizar(" ".join(falado))
        sm = difflib.SequenceMatcher(None, esperado, ouvido, autojunk=False)
        r["fidelidade"] = round(sm.ratio(), 3)
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag != "equal" and (i2 - i1) >= 12:      # some trecho longo do roteiro
                r["buracos"].append({"palavras": i2 - i1,
                                     "roteiro": " ".join(esperado[i1:i1 + 14]),
                                     "audio": " ".join(ouvido[j1:j1 + 14]) or "(nada)"})
        r["buracos"].sort(key=lambda b: -b["palavras"])
    return r


def imprimir(r: dict) -> bool:
    ok = not r["fora"] and (r["fidelidade"] is None or r["fidelidade"] >= FIDELIDADE)
    fid = f"fidelidade {r['fidelidade']:.0%}" if r["fidelidade"] is not None else "sem roteiro"
    print(f"{'  ok ' if ok else '  ⚠️ '} {r['arquivo']:<32} {fid}")
    for x in r["fora"]:
        print(f"        {x['em']} · {x['idioma']} ({x['conf']}) · {x['texto']}")
    for b in r["buracos"][:5]:
        print(f"        buraco de {b['palavras']} palavras")
        print(f"          roteiro: {b['roteiro']}")
        print(f"          áudio:   {b['audio']}")
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slugs", nargs="*")
    ap.add_argument("--todos", action="store_true")
    ap.add_argument("--modelo", default="small")
    a = ap.parse_args()

    from faster_whisper import WhisperModel
    modelo = WhisperModel(a.modelo, device="cpu", compute_type="int8")

    alvos = sorted(AUDIO.glob("*.mp3")) if a.todos else \
        [p if (p := Path(s)).exists() else AUDIO / f"{s}.mp3" for s in a.slugs]

    reprovados = [r["arquivo"] for mp3 in alvos if not imprimir(r := checar(mp3, modelo))]
    print()
    if reprovados:
        print(f"{len(reprovados)} de {len(alvos)} reprovaram: {', '.join(reprovados)}")
        return 1
    print(f"{len(alvos)} capítulo(s): tudo em português e fiel ao roteiro.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
