#!/usr/bin/env bash
# renders the silent video in N parallel chunks, then joins them: ./render_par.sh [N]
set -e
cd "$(dirname "$0")"
N=${1:-4}; DUR=$(node -e "import('./src/captions.js').then(m=>console.log(m.DURATION))")
export CHROME=${CHROME:-/opt/pw-browsers/chromium} GL=${GL:-swiftshader}
rm -f render/part_*.mp4 render/list.txt
for i in $(seq 0 $((N-1))); do
  A=$(python3 -c "print(round($DUR*$i/$N*30)/30)"); B=$(python3 -c "print(round($DUR*($i+1)/$N*30)/30)")
  node render.mjs video render/part_$i.mp4 30 $A $B > render/log_$i.txt 2>&1 &
done
wait
for i in $(seq 0 $((N-1))); do echo "file 'part_$i.mp4'" >> render/list.txt; done
ffmpeg -v error -y -f concat -safe 0 -i render/list.txt -c copy render/silent.mp4
echo done
