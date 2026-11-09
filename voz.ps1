# Cobrinha da Live - transforma texto em audio com a voz do Windows (usado pelo voz.js)
# Recebe linhas "arquivo|texto_em_base64" e responde "OK arquivo" quando o .wav fica pronto.
$ErrorActionPreference = "Stop"
try {
  Add-Type -AssemblyName System.Speech
  $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
} catch { [Console]::Out.WriteLine("SEMVOZ"); exit }
$voz = $s.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -like "pt-BR" } | Select-Object -First 1
if (-not $voz) { $voz = $s.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -like "pt*" } | Select-Object -First 1 }
if (-not $voz) { [Console]::Out.WriteLine("SEMVOZ"); exit }
$s.SelectVoice($voz.VoiceInfo.Name)
$s.Rate = 1
$s.Volume = 100
[Console]::Out.WriteLine("VOZ " + $voz.VoiceInfo.Name)
[Console]::Out.Flush()
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($line -eq $null) { break }
  $i = $line.IndexOf("|")
  if ($i -lt 1) { continue }
  $file = $line.Substring(0, $i)
  try {
    $txt = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($line.Substring($i + 1)))
    $s.SetOutputToWaveFile($file)
    $s.Speak($txt)
    $s.SetOutputToNull()
    [Console]::Out.WriteLine("OK " + $file)
  } catch {
    try { $s.SetOutputToNull() } catch {}
    [Console]::Out.WriteLine("ERR " + $file)
  }
  [Console]::Out.Flush()
}
