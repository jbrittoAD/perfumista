# Audiolivro — decisões fechadas e o que falta

## A voz

```
voz    pt-BR-FranciscaNeural     (Edge TTS / Microsoft)
rate   -12%
pitch  -8Hz
```

A Thalita (`pt-BR-ThalitaMultilingualNeural`) foi a primeira escolha, ouvindo, em 22/09/2026 — timbre
melhor. Saiu por um motivo que não é de gosto: **é multilíngue, e multilíngue escorrega.** Ver abaixo.

Descartadas: `pt-BR-AntonioNeural` (robótica) e todas as vozes do `say` do macOS.

Como gerar (sem tocar no Python do sistema, que está com o `edge_tts` quebrado por falta do `idna`):

```bash
uvx edge-tts -v pt-BR-FranciscaNeural --rate="-12%" --pitch="-8Hz" \
  -t "texto" --write-media saida.mp3
```

## O bitrate — 96 kbps, e por que não 128

O `edge-tts` pede `audio-24khz-48kbitrate-mono-mp3`, escrito na mão dentro do método que monta o pedido.
Eu tinha registrado isso como "fixo, não dá para mudar". **Estava errado** — dá, e o endpoint entrega o
dobro. Testado um formato por vez, com a lib alterada e o resultado medido no `ffprobe`:

| Formato pedido | O que volta |
|---|---|
| `24khz-48kbitrate` (padrão da lib) | MP3 válido, 48 kbps |
| **`24khz-96kbitrate`** | **MP3 válido, 96 kbps — é o teto** |
| `24khz-160kbitrate` | "aceito", arquivo ilegível |
| `48khz-96kbitrate` | "aceito", arquivo ilegível |
| `48khz-192kbitrate` | "aceito", arquivo ilegível |
| `16khz-128kbitrate` | "aceito", arquivo ilegível |

**O detalhe perigoso:** pedir mais que 96 **não dá erro**. A chamada retorna normalmente e grava um
arquivo que o ffmpeg não consegue ler. Quem não medir a saída publica áudio quebrado achando que subiu
a qualidade.

Então os 128 kbps que o Britto pediu não existem neste endpoint. Ficamos em 96, o dobro do padrão — e a
24 kHz a banda útil termina em 12 kHz, então acima disso não haveria ganho audível de qualquer forma.

O patch mora em `web/scripts/tts_pt.py` (`usar_formato`), trocando a constante dentro do code object em
vez de editar o `site-packages`: o `.venv-audio` é descartável e recriado pelo build.

## O problema do idioma — três tentativas, e o que resolveu

**A causa:** o `edge-tts` monta o SSML com `xml:lang='en-US'` fixo no `<speak>` (`communicate.py`,
função `mkssml`). Uma voz multilíngue decide o idioma pelo contexto, e o contexto que ela recebia
declarava o documento inteiro como inglês.

**Tentativa 1 — `<lang xml:lang>`, que é o que o doc do Azure manda usar.** Rejeitado pelo endpoint.

**Tentativa 2 — declarar `pt-BR` no `<speak>`.** É o que `web/scripts/tts_pt.py` faz, trocando o
`mkssml`. Aceito, e melhorou — mas **não resolveu**. O Britto ouviu e apontou "cerca de 400 tipos" saindo
em espanhol. E ele estava certo: aquela frase *é* espanhol válido. Com o idioma certo declarado, a voz
multilíngue ainda decide pelo contexto da frase, e em frase ambígua ela decide errado.

**Tentativa 3, a que resolveu — trocar por uma voz monolíngue.** A Francisca só fala português: não
existe idioma para onde escorregar. O que sobrou de termo estrangeiro (fougère, chypre, sillage, eau de
parfum) virou pronúncia aportuguesada no glossário `FRANCES` do `build_audio.py`.

**A lição, que custou três rodadas:** parâmetro de idioma é dica de contexto, não trava. Quando a
saída correta importa, escolha o modelo que não consegue errar em vez de pedir para ele não errar.

**Como isso é conferido agora, sem ninguém escutar:** `web/scripts/checar_idioma.py` transcreve cada
capítulo com Whisper, detecta o idioma de cada trecho e compara a transcrição com o roteiro. Reprova com
código 1. Foi escrito porque o Britto disse, com razão, que não teria tempo de ouvir 2,5 horas de áudio
para conferir o meu trabalho.

**O que NÃO funciona, testado uma a uma:**

| SSML enviado | Resultado |
|---|---|
| `speak xml:lang='en-US'` (como a lib faz) | aceito — e é a causa do problema |
| `speak xml:lang='pt-BR'` | aceito, necessário, **e insuficiente sozinho** |
| `<lang xml:lang>` por fora do `<prosody>` | rejeitado (NoAudioReceived) |
| `<lang>` por dentro do `<prosody>` | rejeitado |
| com `xmlns:mstts`, o exemplo literal do doc do Azure | rejeitado |

Passar a tag no `--text` do CLI faz a voz **ler a tag em voz alta** (4,7 KB viram 32 KB no mesmo texto).

**Transcrição fonética piora.** "cóuld prócess", "Dóvi", "mélti end pôr" *parecem* espanhol e empurram a
voz para lá. O glossário traduz, não transcreve.

## O glossário, e por que ele continua



Trocar a voz tirou o escorregão de idioma, mas não resolve pronúncia: a Francisca lê "cold process" com
sotaque de português, o que é pior de entender do que a tradução. Então o glossário continua — agora por
clareza, não por idioma.

**O que funciona: traduzir o termo antes de narrar.** Sem palavra estrangeira no texto, não há o que
pronunciar errado. O glossário abaixo é a base; ele cresce conforme o livro.

| No livro | Na narração |
|---|---|
| cold process | processo a frio |
| melt and pour | base glicerinada |
| syndet | sindete |
| SCI | isetionato de sódio |
| SLSA | lauril sulfoacetato |
| BTMS | bê-tê-eme-esse |
| leave-on | produto que fica na pele |
| rinse-off | produto que se enxágua |
| blur | desfoque |
| challenge test / PET | teste de desafio do conservante |
| patch test | teste de contato |
| superfat | gordura sobrando |
| pH | pê-agá |
| R$ 4,60 | quatro reais e sessenta |
| 5,0–5,5 | cinco vírgula zero a cinco vírgula cinco |
| 4–6 semanas | quatro a seis semanas |
| Dove | sabonete de farmácia *(quando o sentido permitir)* |

## As tabelas

O livro tem ~60 tabelas e **tabela não se ouve**. Não vira lista falada — vira **uma frase de decisão**:
o que se decide ali, e o número que importa.

Exemplo, a tabela de tetos por base:

> *"Na base glicerinada cabe 6% de aditivo no total. No sindete, a gordura somada não passa de 10%. Na
> emulsão com Olivem, a fase oleosa vai até 22%. Passar disso não hidrata mais: amolece a barra e quebra
> a emulsão."*

Quatro números, uma consequência, zero "pipe". É reescrita, não conversão.

## Como gerar

```bash
python3 web/scripts/build_audio.py 04-sabonete --so-texto   # só o roteiro, para revisar
python3 web/scripts/build_audio.py --todos                  # tudo, ~25 min
python3 web/scripts/build_books.py                          # copia os mp3 para web/public/audio
```

O pré-processador (`build_audio.py`) tira figura, link e marcação; troca cada tabela pela narração escrita
à mão em `audio/narracoes.md`; aplica o glossário; normaliza número, unidade e símbolo; corta em blocos de
1.400 caracteres; e junta com `ffmpeg` sem re-encodar.

**Chave das narrações:** `arquivo :: Tn`, contando as tabelas na ordem do arquivo. `arquivo :: RESUMO`
substitui o livro inteiro por um resumo falado — é o que se faz com os livros de consulta.

**Cuidado com a numeração:** espaço no fim de uma linha de tabela parte a tabela em duas e desalinha todas
as chaves seguintes daquele arquivo. Já aconteceu no Livro 8.

## Onde o áudio mora

`web/public/audio/*.mp3`, servido pelo app. **Fora do precache** — são ~50 MB contra 2,7 MB do app
inteiro. A tela `/livros/audio` guarda sob demanda, capítulo a capítulo ou tudo de uma vez, no Cache
Storage (`perfumista-audio`). Posição de escuta em `localStorage['perfumista:audio']`, chave separada da
leitura e do deck.

## O que fica de fora

O **catálogo dos 587 materiais** (livro 1B) não é narrado: cinco mil linhas de tabela viram lista
telefônica. Os livros de consulta 1C e 3B mantêm só a prosa e os veredictos — as tabelas de comparação
são puladas. E 3C e Apêndices entram como resumo falado.
