#!/usr/bin/env python3
"""
tts_pt.py — Edge TTS falando português de verdade.

O problema: a voz multilíngue (Thalita) escorrega para espanhol/inglês em termo
estrangeiro. O edge-tts monta o SSML assim (communicate.py, mkssml):

    <speak ... xml:lang='en-US'><voice name='...'><prosody ...>TEXTO</prosody></voice></speak>

e escapa o texto — então tag escrita no --text é LIDA em voz alta, não interpretada.

A documentação do Azure manda usar o elemento <lang xml:lang=".."> para fixar o
idioma de uma voz multilíngue. **Não funciona aqui**: o endpoint gratuito do Edge
aceita só um subconjunto do SSML, e testando as variantes uma a uma:

    speak xml:lang='en-US'  (como a lib faz) ....... OK
    speak xml:lang='pt-BR' ......................... OK
    <lang> por fora do <prosody> ................... rejeitado (NoAudioReceived)
    <lang> por dentro do <prosody> ................. rejeitado
    com xmlns:mstts, como no exemplo do doc ........ rejeitado

Ou seja: o que existe é o `xml:lang` do <speak>, e a biblioteca o fixa em en-US —
declarando o documento inteiro como inglês para uma voz que decide o idioma pelo
texto. A correção é declarar pt-BR ali. Verificado: a síntese muda (md5 e duração
diferentes no mesmo texto).

Uso:
    python3 web/scripts/tts_pt.py --texto "..." --saida x.mp3 [--voz ..] [--rate ..] [--pitch ..]
"""
import argparse, asyncio, sys
import edge_tts
from edge_tts import communicate as _c

IDIOMA = "pt-BR"

_mkssml_original = _c.mkssml


def mkssml_pt(tc, escaped_text):
    """Mesmo SSML da biblioteca, com <lang xml:lang="pt-BR"> em volta do texto."""
    if isinstance(escaped_text, bytes):
        escaped_text = escaped_text.decode("utf-8")
    return (
        f"<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='{IDIOMA}'>"
        f"<voice name='{tc.voice}'>"
        f"<prosody pitch='{tc.pitch}' rate='{tc.rate}' volume='{tc.volume}'>"
        f"{escaped_text}"
        "</prosody>"
        "</voice>"
        "</speak>"
    )


def ativar():
    """Aplica o patch. Idempotente."""
    _c.mkssml = mkssml_pt
    if hasattr(edge_tts, "mkssml"):
        edge_tts.mkssml = mkssml_pt


async def falar(texto, saida, voz, rate, pitch):
    ativar()
    com = edge_tts.Communicate(texto, voz, rate=rate, pitch=pitch)
    await com.save(saida)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--texto", required=True)
    ap.add_argument("--saida", required=True)
    ap.add_argument("--voz", default="pt-BR-ThalitaMultilingualNeural")
    ap.add_argument("--rate", default="-12%")
    ap.add_argument("--pitch", default="-8Hz")
    ap.add_argument("--mostrar-ssml", action="store_true")
    a = ap.parse_args()
    if a.mostrar_ssml:
        ativar()
        class TC: voice, pitch, rate, volume = a.voz, a.pitch, a.rate, "+0%"
        print(_c.mkssml(TC, "TEXTO"))
        sys.exit(0)
    asyncio.run(falar(a.texto, a.saida, a.voz, a.rate, a.pitch))
