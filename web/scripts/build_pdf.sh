#!/usr/bin/env bash
# build_pdf.sh — gera o ebook em PDF (leitura em tablet e impressão).
# pandoc junta os .md → HTML com sumário; o Chrome imprime em A4.
set -euo pipefail
cd "$(dirname "$0")/../../knowledge/ebook"
OUT="${1:-Do-quimico-aromatico-ao-produto.pdf}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

pandoc -f gfm -t html5 --standalone --toc --toc-depth=2 \
  --metadata title="Do químico aromático ao produto" \
  --metadata subtitle="Perfumaria e cosmética, do isolado ao produto que se vende" \
  --metadata author="Perfumista · João" \
  --metadata date="$(date +%d/%m/%Y)" \
  --metadata lang=pt-BR \
  --embed-resources \
  --css=pdf.css \
  -o /tmp/ebook-perfumista.html \
  00-INDICE.md 01-cheiro-e-materia-prima.md 01b-catalogo-por-familia.md \
  01c-similares-e-substitutos.md 01d-natural-vs-sintetico.md 02-bancada-e-criacao.md \
  02b-bancada-de-cosmetica.md \
  03-quimica.md 03b-similares-cosmetica.md 03c-dicionario-insumos.md 04-sabonete.md \
  05-cabelo-barba-anidros.md 06-emulsoes-e-ativos.md 07-perfumar-o-produto.md \
  08-qualidade.md 09-negocio.md 10-apendices.md

# --mute-audio: já aconteceu de um Chrome meu ficar tocando som no Mac do Britto.
"$CHROME" --headless=new --disable-gpu --mute-audio --no-pdf-header-footer \
  --print-to-pdf="$OUT" "file:///tmp/ebook-perfumista.html" 2>/dev/null

echo "→ $(pwd)/$OUT"
