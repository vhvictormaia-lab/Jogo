# Baile do Abismo - instalacao no Windows (roda a partir desta pasta, nao baixa nada do GitHub)
$ErrorActionPreference = 'Stop'
function Refresh-Path { $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User') }
function Need($cmd) { -not (Get-Command $cmd -ErrorAction SilentlyContinue) }
$dir = $PSScriptRoot
Write-Host "== Baile do Abismo - instalacao ==" -ForegroundColor Cyan
if (Need node) {
  if (Need winget) { Write-Host "Nao achei o winget. Instale o Node.js LTS em https://nodejs.org e rode de novo." -ForegroundColor Red; return }
  Write-Host "Instalando o Node.js..."
  winget install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements
  Refresh-Path
}
Push-Location $dir; Write-Host "Instalando as dependencias (precisa de internet)..."; npm install --silent; Pop-Location
$cfg = Join-Path $env:USERPROFILE '.tiktok-snake-user'
if (-not (Test-Path $cfg)) { $u = (Read-Host 'Seu usuario do TikTok (sem o @)').TrimStart('@'); Set-Content -Path $cfg -Value $u -NoNewline -Encoding ascii }
$desktop = [Environment]::GetFolderPath('Desktop')
# atalhos dos jogos antigos saem da Area de Trabalho
foreach ($n in 'Cobrinha da Live.lnk','Abismo Live.lnk','Quiz do Abismo.lnk') { $p = Join-Path $desktop $n; if (Test-Path $p) { Remove-Item $p -Force } }
$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut((Join-Path $desktop 'Baile do Abismo.lnk'))
$lnk.TargetPath = Join-Path $dir 'iniciar.bat'; $lnk.WorkingDirectory = $dir; $lnk.Save()
Write-Host ""
Write-Host "Pronto! O atalho Baile do Abismo esta na sua Area de Trabalho." -ForegroundColor Green
Write-Host "Abrindo o jogo agora..."
Start-Process -FilePath (Join-Path $dir 'iniciar.bat') -WorkingDirectory $dir
