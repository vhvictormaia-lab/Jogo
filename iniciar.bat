@echo off
rem Cobrinha da Live - clique duas vezes para abrir o jogo durante a live
setlocal
cd /d "%~dp0"
title Cobrinha da Live - deixe esta janela aberta durante a live
where node >nul 2>&1 || (echo O Node.js nao esta instalado. Rode o INSTALAR.bat primeiro. & pause & exit /b 1)
set "CFG=%USERPROFILE%\.tiktok-snake-user"
if not exist "%CFG%" (
  set /p U=Digite seu usuario do TikTok sem o @ e aperte Enter: 
  call echo %%U:@=%%> "%CFG%"
)
set /p U=<"%CFG%"
rem fecha o que ja estiver usando a porta do jogo
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%p >nul 2>&1
if not exist node_modules call npm install --silent
echo.
echo  Jogo:   http://localtest.me:3000   (adicione como fonte Link no TikTok LIVE Studio)
echo  TikTok: @%U%
echo  Para trocar o usuario, apague o arquivo %CFG%
echo  Deixe esta janela aberta durante a live.
echo.
node server.js %U%
pause
