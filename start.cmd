@echo off
rem Opens the dashboard. The backend normally auto-starts at logon; this also starts it if it isn't running.
cd /d "%~dp0"
wscript "%~dp0launch-hidden.vbs"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:17777/"
