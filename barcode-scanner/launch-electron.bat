@echo off
REM Script pour lancer Electron avec les arguments corrects

set ELECTRON_PATH=%~dp0node_modules\electron\cli.js
set APP_PATH=%~dp0electron-app.js

if not exist "%ELECTRON_PATH%" (
    echo Erreur: Electron non trouve dans node_modules
    echo Veuillez executer: npm install
    pause
    exit /b 1
)

node "%ELECTRON_PATH%" "%APP_PATH" %*




