@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   KURGU STUDYO - kurulum
echo   ---------------------------------------------
where python >nul 2>nul || (echo   Python bulunamadi. python.org/downloads adresinden kur ^(Add to PATH isaretli^). & pause & exit /b)
if not exist ".venv" python -m venv .venv
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip -q
echo   paketler kuruluyor...
python -m pip install -q imageio-ffmpeg numpy pillow playwright sherpa-onnx anthropic
echo   tarayici motoru kuruluyor...
python -m playwright install chromium
echo.
echo   Kurulum bitti. BASLAT_WINDOWS.bat ile calistir.
pause
