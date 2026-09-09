#!/usr/bin/env bash
# overlay.html'in kullandigi fontlari Google Fonts'tan motion/fonts/ altina indirir.
# Fontlar SIL Open Font License ile dagitilir; repoda tutulmuyor.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p fonts

fetch() { # fetch <aile> <agirliklar-virgullu>
  local fam="$1" weights="$2" css
  css=$(curl -fsSL "https://fonts.googleapis.com/css2?family=${fam}:wght@${weights//,/;}&display=swap")
  local urls ws i=0
  mapfile -t urls < <(grep -o 'https://[^)]*\.ttf' <<<"$css")
  mapfile -t ws   < <(sed -n 's/.*font-weight: \([0-9]*\);/\1/p' <<<"$css")
  for u in "${urls[@]}"; do
    curl -fsSL -o "fonts/${fam}-${ws[$i]}.ttf" "$u"
    echo "  fonts/${fam}-${ws[$i]}.ttf"
    i=$((i+1))
  done
}

echo "fontlar indiriliyor..."
fetch Montserrat 700,800,900
fetch Inter 400,600,800,900
echo "tamam."
