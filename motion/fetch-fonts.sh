#!/usr/bin/env bash
# overlay.html'in kullandigi fontlari Google Fonts'tan motion/fonts/ altina indirir.
# Fontlar SIL Open Font License ile dagitilir; repoda tutulmuyor.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p fonts

# fetch <dosya-oneki> <css2-family-sorgusu>
fetch() {
  local prefix="$1" query="$2" css urls ws i=0
  css=$(curl -fsSL -H 'User-Agent: Mozilla/5.0' "https://fonts.googleapis.com/css2?family=${query}&display=swap")
  mapfile -t urls < <(grep -o 'https://[^)]*\.ttf' <<<"$css")
  mapfile -t ws   < <(sed -n 's/.*font-weight: \([0-9]*\);/\1/p' <<<"$css")
  [ "${#urls[@]}" -gt 0 ] || { echo "font alinamadi: $query"; exit 1; }
  for u in "${urls[@]}"; do
    curl -fsSL -o "fonts/${prefix}-${ws[$i]}.ttf" "$u"
    echo "  fonts/${prefix}-${ws[$i]}.ttf"
    i=$((i+1))
  done
}

echo "fontlar indiriliyor..."
fetch Montserrat  'Montserrat:wght@700;800;900'
fetch Inter       'Inter:wght@400;600;800;900'
fetch PlayfairIt  'Playfair+Display:ital,wght@1,400;1,500;1,600'   # italik serif wordmark
fetch Poppins     'Poppins:wght@500;600;700;800'                   # yuvarlak geometrik sans
fetch GreatVibes  'Great+Vibes'                                    # altin kaligrafik vurgu
fetch Bebas       'Bebas+Neue'                                     # sikisik display
fetch Grotesk     'Space+Grotesk:wght@500;700'                     # etiket / panel
fetch Mono        'JetBrains+Mono:wght@500;700'                    # bolum etiketi
echo "tamam."
