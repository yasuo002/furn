#!/bin/bash
cd "$(dirname "$0")"
echo
echo "  KURGU STÜDYO — kurulum"
echo "  ---------------------------------------------"
command -v python3 >/dev/null || { echo "  Python 3 gerekli: brew install python"; exit 1; }
[ -d .venv ] || python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip -q
echo "  paketler kuruluyor..."
pip install -q imageio-ffmpeg numpy pillow playwright sherpa-onnx anthropic
echo "  tarayıcı motoru kuruluyor..."
python -m playwright install chromium
echo
echo "  Kurulum bitti. BASLAT_MAC.command ile çalıştır."
