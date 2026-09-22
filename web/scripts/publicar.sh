#!/usr/bin/env bash
# publicar.sh — do markdown ao ar, em um comando.
#
# A ordem importa e é fácil errar de cabeça:
#   1. bumpar o CACHE_VERSION ANTES do build (o sw.js é copiado de public/ para out/)
#   2. build_books.py: markdown → books.json e mp3 → public/audio
#   3. next build com basePath=/perfumista (o Pages serve em subpasta)
#   4. precache_assets.py: injeta os /_next/static hasheados no sw.js de out/
#   5. push na gh-pages, com .nojekyll (sem ele o Pages ignora _next/)
#
#   ./web/scripts/publicar.sh "mensagem do commit"
set -euo pipefail
export PATH="/opt/homebrew/bin:$PATH"
cd "$(dirname "$0")/../.."
MSG="${1:-atualiza o app}"

echo "→ 1/5  bump do cache do service worker"
python3 - <<'PY'
import re
from pathlib import Path
p = Path("web/public/sw.js"); t = p.read_text()
m = re.search(r'const CACHE_VERSION = "perfumista-deck-v(\d+)"', t)
novo = int(m.group(1)) + 1
p.write_text(t[:m.start(1)] + str(novo) + t[m.end(1):])
print(f"   v{m.group(1)} → v{novo}")
PY

echo "→ 2/5  livros e áudio"
python3 web/scripts/build_books.py

echo "→ 3/5  build estático"
# O basePath vale para o build E para o precache: o script procura os assets
# pelo caminho que o HTML referencia. Com a variável só no build, ele não acha
# nada e o app vai ao ar sem precache.
export NEXT_PUBLIC_BASE_PATH=/perfumista
(cd web && npm run build >/dev/null)

echo "→ 4/5  precache dos assets hasheados"
python3 web/scripts/precache_assets.py

echo "→ 5/5  publicando na gh-pages"
gh auth switch --user jbrittoAD >/dev/null 2>&1 || true
TMP=$(mktemp -d)
git clone -q --branch gh-pages --single-branch https://github.com/jbrittoAD/perfumista.git "$TMP/site"
find "$TMP/site" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R web/out/. "$TMP/site"/
touch "$TMP/site/.nojekyll"
git -C "$TMP/site" add -A
git -C "$TMP/site" commit -q -m "$MSG" && git -C "$TMP/site" push -q origin gh-pages
rm -rf "$TMP"
echo
echo "no ar: https://jbrittoad.github.io/perfumista/  (o Pages leva ~2 min pra propagar)"
