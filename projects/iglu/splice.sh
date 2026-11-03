#!/usr/bin/env bash
# splice the re-rendered shots (frames 630-719 and 1095-1240) into the full silent render
set -e
cd "$(dirname "$0")/render"
ffmpeg -v error -y -i silent.mp4 -i fix_a.mp4 -i fix_b.mp4 -filter_complex \
"[0:v]trim=start_frame=0:end_frame=630,setpts=PTS-STARTPTS[a];\
[1:v]setpts=PTS-STARTPTS[b];\
[0:v]trim=start_frame=720:end_frame=1095,setpts=PTS-STARTPTS[c];\
[2:v]setpts=PTS-STARTPTS[d];\
[0:v]trim=start_frame=1241,setpts=PTS-STARTPTS[e];\
[a][b][c][d][e]concat=n=5:v=1:a=0,fps=30[v]" -map "[v]" -c:v libx264 -preset medium -crf 15 -pix_fmt yuv420p silent_fixed.mp4
ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 silent_fixed.mp4
