@echo off
rem Baile do Abismo - clique duas vezes para abrir o jogo durante a live
setlocal
cd /d "%~dp0"
title Baile do Abismo - deixe esta janela aberta durante a live
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
echo  BAILE DO ABISMO
echo  No TikTok LIVE Studio, fonte Link:  http://localtest.me:3000/baile.html
echo  TikTok: @%U%
echo  Deixe esta janela aberta durante a live.
echo.
echo  Painel de controle:  http://localhost:3000/painel.html
echo.
rem abre o painel no navegador uns segundos depois de o jogo ligar
start "" /b cmd /c "timeout /t 4 /nobreak >nul & start "" http://localhost:3000/painel.html"
:inicio
node server.js %U%
rem codigo 42 = o painel atualizou o sistema: liga de novo
if "%errorlevel%"=="42" goto inicio
pause
