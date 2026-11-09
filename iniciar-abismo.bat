@echo off
rem Abismo Live - Palhaco do Abismo + Serpente das Trevas
setlocal
cd /d "%~dp0"
title Abismo Live - deixe esta janela aberta durante a live
where node >nul 2>&1 || (echo O Node.js nao esta instalado. Rode o INSTALAR.bat primeiro. & pause & exit /b 1)
set "CFG=%USERPROFILE%\.tiktok-snake-user"
if not exist "%CFG%" (
  set /p U=Digite seu usuario do TikTok sem o @ e aperte Enter: 
  call echo %%U:@=%%> "%CFG%"
)
set /p U=<"%CFG%"
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%p >nul 2>&1
if not exist node_modules call npm install --silent
set MODO=abismo
echo.
echo  ABISMO LIVE
echo  No TikTok LIVE Studio, fonte Link:  http://localtest.me:3000/abismo.html
echo  Testar no navegador:               http://localhost:3000/abismo.html?demo=1
echo  TikTok: @%U%
echo  Deixe esta janela aberta durante a live.
echo.
node server.js %U%
pause
