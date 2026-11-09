@echo off
rem Product Catalog image helper - keep this window open while updating, then close it.
cd /d "%~dp0"
where py >nul 2>nul && (py -3 psc-img-helper.py & goto :end)
python psc-img-helper.py
:end
pause
