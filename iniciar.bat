@echo off
title Nicole
cd /d "%~dp0"
echo Iniciando Nicole...
python main.py
if %errorlevel% neq 0 (
    echo.
    echo Error al iniciar. Verifica que las dependencias esten instaladas:
    echo   pip install eel pywebview
    echo.
    pause
)
