#!/usr/bin/env bash
# "Kurucu shortu" kurgusu — 70 sn tek plan talking head.
#   - kaynak temiz (yanmis altyazi yok), silme adimi gerekmiyor
#   - framing.py tek plani sanal kesmelere boler (genis / orta / yakin)
#   - katman siyah gomlek uzerine oturur, plaka gerekmez
#   - katman 61.3'te cekilir; kaynagin kendi markali outro'suna dokunulmaz
#   - SES EFEKTI YOK: kurgu tamamen gorsel, kaynak sesi oldugu gibi gecer
#
#   ./motion/founder-short/build.sh <girdi.mp4> [cikti.mp4]
set -euo pipefail
ORIG="$PWD"; cd "$(dirname "$0")"
abspath() { case "$1" in /*) printf '%s\n' "$1";; *) printf '%s\n' "$ORIG/$1";; esac; }

IN="$(abspath "${1:?kullanim: build.sh <girdi.mp4> [cikti.mp4]}")"
OUT="${2:+$(abspath "$2")}"; OUT="${OUT:-$PWD/out/founder.mp4}"
FPS="${FPS:-30}"; DUR="${DUR:-69.87}"

[ -f "$IN" ]    || { echo "girdi bulunamadi: $IN"; exit 1; }
[ -d ../fonts ] || { echo "fonts/ yok -> ./motion/fetch-fonts.sh"; exit 1; }

echo "1/3  kadraj cizelgesi"
eval "$(python3 framing.py "$DUR")"          # Z, XO, YO ifadelerini tanimlar
echo "2/3  overlay render"
rm -rf frames && mkdir -p frames "$(dirname "$OUT")"
node ../render.mjs frames --html overlay.html --fps "$FPS" --dur "$DUR"
echo "3/3  birlestirme"
ffmpeg -hide_banner -loglevel error -stats \
  -i "$IN" -framerate "$FPS" -i "frames/%05d.png" \
  -filter_complex "\
[0:v]scale=w='trunc(720*($Z)/2)*2':h='trunc(1280*($Z)/2)*2':eval=frame:flags=lanczos,\
crop=720:1280:'(in_w-720)/2+($XO)':'(in_h-1280)/2+($YO)',setsar=1,\
unsharp=5:5:0.30,eq=contrast=1.03:saturation=1.04[bg];\
[bg][1:v]overlay=0:0:format=auto,format=yuv420p[v]" \
  -map "[v]" -map 0:a \
  -c:v libx264 -preset slow -crf 19 -profile:v high -level 4.1 -r "$FPS" \
  -c:a aac -b:a 160k -ar 48000 -movflags +faststart -y "$OUT"
echo "hazir: $OUT"
