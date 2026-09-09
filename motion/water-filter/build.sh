#!/usr/bin/env bash
# "Musluk filtresi" kurgusu: overlay'i kaynak videonun uzerine bindirir.
#
#   ./motion/water-filter/build.sh <girdi.mp4> [cikti.mp4]
#
# Once: ../fetch-fonts.sh  ve  ./make-stills.sh <girdi.mp4>
set -euo pipefail
ORIG="$PWD"; cd "$(dirname "$0")"
abspath() { case "$1" in /*) printf '%s\n' "$1";; *) printf '%s\n' "$ORIG/$1";; esac; }

IN="$(abspath "${1:?kullanim: build.sh <girdi.mp4> [cikti.mp4]}")"
OUT="${2:+$(abspath "$2")}"; OUT="${OUT:-$PWD/out/overlay.mp4}"
FPS="${FPS:-30}"

[ -f "$IN" ]     || { echo "girdi bulunamadi: $IN"; exit 1; }
[ -d ../fonts ]  || { echo "fonts/ yok -> ./motion/fetch-fonts.sh"; exit 1; }
[ -d img ]       || { echo "img/ yok  -> ./motion/water-filter/make-stills.sh \"$IN\""; exit 1; }

if command -v ffprobe >/dev/null 2>&1; then
  DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
else
  DUR=$( { ffmpeg -hide_banner -i "$IN" 2>&1 || true; } \
         | sed -n 's/.*Duration: \([0-9:.]*\),.*/\1/p' \
         | awk -F: '{print $1*3600+$2*60+$3; exit}' )
fi
echo "kaynak: $IN  (${DUR}s @ ${FPS}fps)"

rm -rf frames && mkdir -p frames "$(dirname "$OUT")"
node ../render.mjs frames --html overlay.html --fps "$FPS" --dur "$DUR"

ffmpeg -hide_banner -loglevel error -stats \
  -i "$IN" -framerate "$FPS" -i "frames/%05d.png" \
  -filter_complex "[0:v]eq=contrast=1.04:saturation=1.06[bg];\
[bg][1:v]overlay=0:0:format=auto,format=yuv420p[v]" \
  -map "[v]" -map 0:a \
  -c:v libx264 -preset slow -crf 18 -profile:v high -level 4.1 -r "$FPS" \
  -c:a aac -b:a 128k -ar 44100 -movflags +faststart -y "$OUT"

echo "hazir: $OUT"
