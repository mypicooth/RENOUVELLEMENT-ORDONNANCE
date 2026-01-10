@echo off
REM Lance le scanner avec icône dans le system tray

cd /d "%~dp0"

REM Vérifier que le fichier PowerShell existe
if not exist "scanner-tray.ps1" (
    echo ERREUR: scanner-tray.ps1 introuvable
    pause
    exit /b 1
)

REM Lancer le scanner avec tray icon
echo Demarrage du scanner avec icone dans la barre des taches...
powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0scanner-tray.ps1"
