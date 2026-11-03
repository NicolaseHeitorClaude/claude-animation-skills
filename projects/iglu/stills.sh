#!/usr/bin/env bash
# stills.sh "t1,t2,..." out.jpg  -> renders stills and tiles them (labels = time)
set -e
cd "$(dirname "$0")"
OUT=${2:-stills/sheet.jpg}; D=stills/tmp; rm -rf $D; mkdir -p $D
CHROME=${CHROME:-/opt/pw-browsers/chromium} GL=${GL:-swiftshader} node render.mjs stills "$1" $D | grep -v "^still" || true
N=$(ls $D/*.png | wc -l); COLS=${COLS:-5}
ffmpeg -v error -y -pattern_type glob -i "$D/t_*.png" -vf "scale=432:768,tile=${COLS}x$(( (N+COLS-1)/COLS ))" -frames:v 1 "$OUT"
