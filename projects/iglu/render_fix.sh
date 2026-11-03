#!/usr/bin/env bash
# re-renders two revised shots and splices them into render/silent.mp4 -> render/silent_fixed.mp4
set -e
cd "$(dirname "$0")"
export CHROME=${CHROME:-/opt/pw-browsers/chromium} GL=${GL:-swiftshader}
[ -f render/fix_a.mp4 ] || node render.mjs video render/fix_a.mp4 30 21.0 24.0 > render/log_fa.txt 2>&1
[ -f render/fix_b.mp4 ] || node render.mjs video render/fix_b.mp4 30 36.5 41.3666667 > render/log_fb.txt 2>&1
echo fixes rendered
