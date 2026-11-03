#!/usr/bin/env bash
# contact sheet of stills/*.jpg (sorted by time) -> stills/sheet.jpg
cd stills; ls s_*.jpg | sort -t_ -k2 -g > /tmp/_l.txt
ffmpeg -v error -y -f concat -safe 0 -i <(while read f; do echo "file '$PWD/$f'"; echo "duration 1"; done < /tmp/_l.txt) -vf "scale=640:360,tile=3x4:padding=4" -frames:v 1 sheet.jpg
