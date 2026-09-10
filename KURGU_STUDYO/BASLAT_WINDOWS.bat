@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".venv" (echo Once KUR_WINDOWS.bat calistir. & pause & exit /b)
call .venv\Scripts\activate.bat
python app.py
pause
