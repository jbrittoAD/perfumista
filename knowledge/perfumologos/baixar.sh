#!/bin/bash
# Baixa metadados + transcrição automática em PT de todo o canal PerfumoLogos.
# Não baixa vídeo: só o que é texto. Frames vêm depois, e só dos que mostram tabela.
set -u
CANAL="https://www.youtube.com/@perfumologos/videos"
cd "$(dirname "$0")"
yt-dlp --no-update --flat-playlist --print "%(id)s" "$CANAL" > ids.txt 2>/dev/null
echo "$(wc -l < ids.txt) vídeos"
i=0
while read -r id; do
  i=$((i+1))
  [ -f "subs/$id.pt.srt" ] && { echo "[$i] $id já tem"; continue; }
  yt-dlp --no-update -q --skip-download \
    --write-info-json --no-write-playlist-metafiles \
    --write-auto-subs --sub-langs "pt.*,en.*" --convert-subs srt \
    -o "subs/%(id)s.%(ext)s" \
    "https://www.youtube.com/watch?v=$id" 2>&1 | grep -iE 'error|warning: no' | head -2
  echo "[$i/$(wc -l < ids.txt | tr -d ' ')] $id"
  sleep 2
done < ids.txt
