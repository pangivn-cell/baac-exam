# Start this PC as the exam site's file-processing host:
#   1) make sure the Ollama server is running (with the settings the site needs)
#   2) open the site so its tab can pick up queued files
# Installed to run at login by tools/install-llm-host.ps1
$ErrorActionPreference = 'SilentlyContinue'
$env:OLLAMA_ORIGINS = [Environment]::GetEnvironmentVariable('OLLAMA_ORIGINS', 'User')
$env:OLLAMA_CONTEXT_LENGTH = [Environment]::GetEnvironmentVariable('OLLAMA_CONTEXT_LENGTH', 'User')
$ollama = Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama.exe'

function Test-Ollama { try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 'http://127.0.0.1:11434/api/version' | Out-Null; $true } catch { $false } }

# the Ollama tray app may already be starting its own server; give it a moment
for ($i = 0; $i -lt 10 -and -not (Test-Ollama); $i++) { Start-Sleep -Seconds 3 }
if (-not (Test-Ollama) -and (Test-Path $ollama)) {
  Start-Process -FilePath $ollama -ArgumentList 'serve' -WindowStyle Hidden
}
Start-Process 'https://pangivn-cell.github.io/baac-exam/'
