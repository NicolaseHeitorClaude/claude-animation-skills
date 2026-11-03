#!/usr/bin/env bash
# Build the video: mix -> picture (parallel) -> H.264/AAC MP4.
#   bash build.sh                 full video  -> estacionamento-inteligente.mp4
#   T0=44 T1=65 bash build.sh     test clip   -> teste_44-65.mp4
set -euo pipefail
cd "$(dirname "$0")"
PY=../../kit/.venv/bin/python; WORKERS=${WORKERS:-4}
"$PY" tools/timeline.py > /dev/null
"$PY" audio.py
TOTAL=$(node tools/render.js frames | tail -1)
F0=$(python3 -c "print(round(${T0:-0}*30))"); F1=$(python3 -c "print(min($TOTAL, round(${T1:-999}*30)))")
NAME=${T0:+teste_${T0}-${T1}}; NAME=${NAME:-${OUT:-estacionamento-inteligente}}
rm -rf seg; mkdir -p seg
STEP=$(( (F1 - F0 + WORKERS - 1) / WORKERS )); pids=()
for ((w = 0; w < WORKERS; w++)); do
  a=$((F0 + w * STEP)); b=$((a + STEP)); [ $b -gt $F1 ] && b=$F1; [ $a -ge $b ] && continue
  node tools/render.js range $a $b seg/part_$w.mp4 > seg/log$w.txt 2>&1 & pids+=($!)
done
for p in "${pids[@]}"; do wait "$p"; done
grep -h "\[err\]" seg/log*.txt && { echo "page errors"; exit 1; } || true
for f in seg/part_*.mp4; do echo "file '$PWD/$f'"; done > seg/list.txt
ffmpeg -v error -y -f concat -safe 0 -i seg/list.txt -c copy seg/silent.mp4
S0=$(python3 -c "print($F0/30)"); D=$(python3 -c "print(($F1-$F0)/30)")
ffmpeg -v error -y -i seg/silent.mp4 -ss "$S0" -t "$D" -i audio/mix.wav -map 0:v -map 1:a -c:v copy \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$NAME.part.mp4"
mv "$NAME.part.mp4" "$NAME.mp4"; echo "done: $PWD/$NAME.mp4"
