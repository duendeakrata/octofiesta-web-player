@echo off
rem OctoFiesta Web Player - launcher
rem Double-click this file to open the player.
title OctoFiesta Web Player
cd /d "%~dp0"

rem If the server is already running on port 3000, just open the browser.
netstat -ano 2>nul | findstr /c:":3000 " | findstr /c:"LISTENING" >nul
if not errorlevel 1 goto open

rem If node is missing, open index.html directly (works via file://).
where node >nul 2>nul
if errorlevel 1 goto openfile

rem Start the local server hidden, wait a moment, then open the browser.
start "" wscript.exe "%~dp0_launcher.vbs" "%~dp0"
timeout /t 2 /nobreak >nul

:open
start "" "http://localhost:3000"
exit /b

:openfile
start "" "%~dp0index.html"
exit /b
