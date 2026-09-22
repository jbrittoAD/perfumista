# Audiolivro — decisões fechadas e o que falta

## A voz (escolhida ouvindo, em 22/09/2026)

```
voz    pt-BR-ThalitaMultilingualNeural     (Edge TTS / Microsoft)
rate   -12%
pitch  -8Hz
```

Reserva: `pt-BR-FranciscaNeural` com os mesmos parâmetros — timbre também aprovado e, por ser
**monolíngue**, imune ao problema abaixo.

Descartada: `pt-BR-AntonioNeural` (robótica) e todas as vozes do `say` do macOS.

Como gerar (sem tocar no Python do sistema, que está com o `edge_tts` quebrado por falta do `idna`):

```bash
uvx edge-tts -v pt-BR-ThalitaMultilingualNeural --rate="-12%" --pitch="-8Hz" \
  -t "texto" --write-media saida.mp3
```

## O problema do idioma, e a única solução que funciona

A Thalita é **multilíngue**: ela troca de idioma quando encontra palavra estrangeira. "cold process",
"melt and pour", "Dove", "blur" fazem a frase inteira sair com sotaque espanhol.

**Não dá para forçar por parâmetro.** Testado: `<lang xml:lang="pt-BR">` passado ao CLI é **lido em voz
alta** (4,7 KB → 32 KB no mesmo texto). O `edge-tts` só expõe rate, volume e pitch.

**Transcrição fonética piora.** "cóuld prócess", "mélti end pôr", "Dóvi" *parecem espanhol* e empurram a
voz para lá — foi o que aconteceu no primeiro teste.

**O que funciona: traduzir o termo antes de narrar.** Sem palavra estrangeira no texto, não há o que
detectar. O glossário abaixo é a base; ele cresce conforme o livro.

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

## O que já está pronto

- Voz, ritmo e tom escolhidos e testados com trecho real do livro.
- Diagnóstico do idioma fechado, com o controle gravado (`Y3` soa espanhol, `Y1` e `Y4` não).
- Amostras em `~/Desktop/Perfumista-vozes/escolha/`.

## O que falta

1. Escrever o pré-processador: glossário + números por extenso + remoção de marcação markdown.
2. Reescrever as ~60 tabelas em frase de decisão (é o trabalho pesado).
3. Gerar capítulo a capítulo, concatenar com `ffmpeg`, gravar capa e metadados.
4. Decidir onde o áudio mora: junto do livro no app (aumenta muito o tamanho) ou download separado.
