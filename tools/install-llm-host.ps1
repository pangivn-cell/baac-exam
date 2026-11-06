# One-time setup: run start-llm-host.ps1 at every login (Startup folder shortcut).
# Remove: delete "Exam LLM host.lnk" from shell:startup
$script = Join-Path $PSScriptRoot 'start-llm-host.ps1'
$lnk = Join-Path ([Environment]::GetFolderPath('Startup')) 'Exam LLM host.lnk'
$sh = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)
$sh.TargetPath = 'powershell.exe'
$sh.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$sh.WindowStyle = 7
$sh.Save()
"Installed: $lnk"
