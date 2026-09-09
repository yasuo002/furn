#!/usr/bin/env bash
# "Araba yorumu" kurgusu. Kaynak 360x640 ve uzerinde yanmis altyazi var; bu script:
#   1. eski altyaziyi delogo + yerel blur ile siler
#   2. 720x1280'e yukseltir ve vurgu anlarinda zoom punch uygular
#   3. istif listesi aninda goruntuyu blurlar
#   4. kinetik altyazi/grafik katmanini bindirir
#   5. sifirdan sentezlenen SFX parcasini sesin uzerine miksler
#
#   ./motion/car-review/build.sh <girdi.mp4> [cikti.mp4]
set -euo pipefail
ORIG="$PWD"; cd "$(dirname "$0")"
abspath() { case "$1" in /*) printf '%s\n' "$1";; *) printf '%s\n' "$ORIG/$1";; esac; }

IN="$(abspath "${1:?kullanim: build.sh <girdi.mp4> [cikti.mp4]}")"
OUT="${2:+$(abspath "$2")}"; OUT="${OUT:-$PWD/out/car.mp4}"
FPS="${FPS:-30000/1001}"          # kaynak 29.97
DUR="${DUR:-17.71}"

[ -f "$IN" ]    || { echo "girdi bulunamadi: $IN"; exit 1; }
[ -d ../fonts ] || { echo "fonts/ yok -> ./motion/fetch-fonts.sh"; exit 1; }

# --- zoom punch: vurgu anlarinda kisa bir yaklasma ---
# crop bu ffmpeg derlemesinde eval=frame desteklemedigi icin
# scale=...:eval=frame + sabit merkez crop kullaniliyor.
Z="1.02"
for p in 0.86 2.53 4.78 5.62 6.34 9.81 12.94 15.06 16.30; do
  Z="$Z+0.075*exp(-((t-$p)/0.22)*((t-$p)/0.22))"
done

echo "1/3  SFX sentezleniyor"
python3 sfx.py sfx.wav "$DUR"

echo "2/3  overlay render ediliyor"
rm -rf frames && mkdir -p frames "$(dirname "$OUT")"
node ../render.mjs frames --html overlay.html --fps 29.97 --dur "$DUR"

echo "3/3  birlestiriliyor"
ffmpeg -hide_banner -loglevel error -stats \
  -i "$IN" -framerate "$FPS" -i "frames/%05d.png" -i sfx.wav \
  -filter_complex "\
[0:v]delogo=x=27:y=334:w=307:h=82,split[a][b];\
[b]crop=311:86:25:332,gblur=sigma=7[bl];\
[a][bl]overlay=25:332,\
scale=w='trunc(720*($Z)/2)*2':h='trunc(1280*($Z)/2)*2':eval=frame:flags=lanczos,\
crop=720:1280:'(in_w-720)/2':'(in_h-1280)/2',setsar=1,\
unsharp=5:5:0.55,\
gblur=sigma=10:enable='between(t,12.94,15.04)',\
eq=contrast=1.06:saturation=1.08[bg];\
[bg][1:v]overlay=0:0:format=auto,format=yuv420p[v];\
[0:a]volume=0.94[a0];[2:a]volume=1.0[a1];\
[a0][a1]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.82:level=disabled[aout]" \
  -map "[v]" -map "[aout]" \
  -c:v libx264 -preset slow -crf 18 -profile:v high -level 4.1 -r "$FPS" \
  -c:a aac -b:a 160k -ar 48000 -movflags +faststart -y "$OUT"

echo "hazir: $OUT"
