#!/bin/bash
# Segunda passada: só metadados. O --write-info-json junto com a legenda falhou
# na maioria (2 de 22), e a DATA é essencial — a regra do dono é que, em
# conflito, vale o vídeo mais recente.
cd "$(dirname "$0")"
while pgrep -f 'baixar.sh' >/dev/null; do sleep 20; done
i=0; n=$(wc -l < ids.txt | tr -d ' ')
while read -r id; do
  i=$((i+1))
  [ -f "subs/$id.info.json" ] && continue
  yt-dlp --no-update -q --skip-download --dump-json \
    "https://www.youtube.com/watch?v=$id" > "subs/$id.info.json" 2>/dev/null
  [ -s "subs/$id.info.json" ] || rm -f "subs/$id.info.json"
  echo "[$i/$n] $id"
  sleep 1
done < ids.txt
echo "=== METADADOS PRONTOS ==="
