#!/bin/bash
cd "$(dirname "$0")"
[ -d .venv ] || { echo "Önce KUR_MAC.command çalıştır."; exit 1; }
source .venv/bin/activate
python app.py
