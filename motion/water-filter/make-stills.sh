#!/usr/bin/env bash
# Tasarim sahnelerindeki kartlarin icine giren durag~an kareleri kaynak videodan cikarir.
# Sahneler bu dosyalari 'img/' altinda bekler (overlay.html icindeki <img src="img/...">).
#
#   ./motion/make-stills.sh <girdi.mp4>
#
# Zaman damgalari kaynak videoya ozeldir; baska bir klip icin asagidaki TS degerlerini
# ve kirpma pencerelerini yeni akisa gore guncelle.
set -euo pipefail
ORIG="$PWD"; cd "$(dirname "$0")"
case "${1:?kullanim: make-stills.sh <girdi.mp4>}" in /*) IN="$1";; *) IN="$ORIG/$1";; esac
[ -f "$IN" ] || { echo "girdi bulunamadi: $IN"; exit 1; }
mkdir -p img

grab() { # grab <cikti> <saniye> <crop filtresi>
  ffmpeg -hide_banner -loglevel error -ss "$2" -i "$IN" -frames:v 1 -vf "$3" -q:v 2 -y "img/$1"
  echo "  img/$1"
}
grab dirty.jpg  13.75 "crop=640:820:40:180,scale=480:615"   # filtrede kalan tortu
grab clear.jpg  25.30 "crop=640:820:40:260,scale=480:615"   # berrak su bardagi
grab faucet.jpg  7.10 "crop=640:820:40:120,scale=480:615"   # musluga takili filtre
grab pip.jpg     0.55 "crop=340:430:15:95,scale=340:430"    # kose PIP portresi
echo "tamam."
