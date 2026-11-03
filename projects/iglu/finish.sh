#!/usr/bin/env bash
# silent render + narration (unchanged speed) + effects -> iglu.mp4 (1080x1920, 30 fps)
set -e
cd "$(dirname "$0")"
ffmpeg -v error -y -i render/silent.mp4 -i audio/vo.wav -i audio/sfx.wav \
  -filter_complex "[1:a]apad[v];[2:a]volume=0.32[s];[v][s]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
  -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart iglu.mp4
ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate:format=duration -of compact iglu.mp4
