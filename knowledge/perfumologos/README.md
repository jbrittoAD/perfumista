# PerfumoLogos — base de conhecimento

Canal do **Victor Lopes**, perfumista autodidata brasileiro.
https://youtube.com/@perfumologos

53 dos 54 vídeos públicos, com transcrição em português. O que falta é
*"Criando um acorde de incenso na prática"* (`7q-otY568OA`), exclusivo para
membros do canal.

## Como usar

| arquivo | para quê |
|---|---|
| [INDICE.md](INDICE.md) | todos os vídeos, **do mais novo ao mais antigo** |
| [TEMAS.md](TEMAS.md) | onde ele fala de cada assunto |
| `base/AAAA-MM-DD--<id>.md` | um vídeo: metadados + transcrição com marca de tempo |

## A regra de autoridade

> **Havendo conflito entre dois vídeos, vale o mais recente.**

Não é convenção minha: ele mesmo diz, no vídeo de equipamento de 12/09/2026, que
o vídeo antigo sobre o mesmo tema **"ficou desatualizado"** e que **"tem muita
coisa que eu indiquei naquele vídeo e que eu não indico mais"**.

Por isso todo índice aqui nasce ordenado por data, e o cabeçalho de cada arquivo
traz a data de publicação.

## Como foi feito

```bash
./baixar.sh              # metadados + legenda automática PT de todo o canal
./metadados.sh           # segunda passada: o --write-info-json falha na maioria
python3 limpar_vtt.py subs texto    # legenda -> texto legível
python3 montar_base.py              # base/ + INDICE.md
python3 indexar_temas.py            # TEMAS.md
```

A legenda automática do YouTube vem em rolagem: cada frase repetida três vezes,
com timing por palavra (`<00:00:00.680><c> aí</c>`). Crua, uma transcrição de 25
minutos são 4.000 linhas ilegíveis. `limpar_vtt.py` reduz a uma linha por fala,
com o minuto na frente para voltar ao ponto do vídeo.

Nada de vídeo foi baixado — só texto. Frames só serão extraídos dos vídeos que
mostram planilha ou tabela, e sob demanda.

## Skills geradas daqui

Em `.claude/skills/`:

- **diluir-materia-prima** — frasco de 30 ml retém 24 g; 10% = 2,4 g + 24 mg de BHT + álcool
- **formular-perfume** — a planilha de duas partes: a fórmula é pura, a diluição é sua
- **fixacao-e-projecao** — a molécula fixa porque não evapora; daí a troca
- **maceracao** — seis semanas, no armário, sem geladeira
- **fornecedores-confiaveis** — os três de químico, os três de óleo essencial
