# One-time setup (no admin needed): register the link baacpsc://start for this Windows user.
# The exam site opens that link when it needs the Product Catalog image helper,
# which then starts hidden (pythonw) and closes itself after 10 idle minutes.
# Remove: delete HKCU:\Software\Classes\baacpsc
$py = (Get-Command pythonw -ErrorAction SilentlyContinue | Where-Object { $_.Source -notlike '*WindowsApps*' } | Select-Object -First 1).Source
if (-not $py) { $py = (Get-Command pyw -ErrorAction SilentlyContinue | Select-Object -First 1).Source }
if (-not $py) { Write-Host 'Python (pythonw.exe) not found. Install Python first.'; exit 1 }
$script = Join-Path $PSScriptRoot 'psc-img-helper.py'
$key = 'HKCU:\Software\Classes\baacpsc'
New-Item -Path "$key\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path $key -Name '(default)' -Value 'URL:Baac Exam Product Catalog helper'
Set-ItemProperty -Path $key -Name 'URL Protocol' -Value ''
Set-ItemProperty -Path "$key\shell\open\command" -Name '(default)' -Value "`"$py`" `"$script`" --auto"
Write-Host "Installed baacpsc:// -> $py $script --auto"
