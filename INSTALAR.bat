@echo off
rem Baile do Abismo - clique duas vezes para instalar
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar.ps1"
pause
