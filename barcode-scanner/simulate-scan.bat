@echo off
REM Script pour simuler un scan de QR code
REM Usage: simulate-scan.bat <renewalId> <type>

cd /d "%~dp0"

if "%~1"=="" (
    echo Usage: simulate-scan.bat ^<renewalId^> ^<type^>
    echo.
    echo Exemples:
    echo   simulate-scan.bat cmjsk4p1q0003ghqlh7i9t8m9 RENEWAL
    echo   simulate-scan.bat cmjsk4p1q0003ghqlh7i9t8m9 RENEWAL_END
    pause
    exit /b 1
)

if "%~2"=="" (
    echo Erreur: Type manquant
    echo Usage: simulate-scan.bat ^<renewalId^> ^<type^>
    pause
    exit /b 1
)

echo ========================================
echo   Simulation de scan QR code
echo ========================================
echo.
echo RenewalId: %~1
echo Type: %~2
echo.

REM Charger le token depuis config.json si disponible
set API_TOKEN=
if exist "config.json" (
    for /f "tokens=2 delims=:," %%a in ('findstr /C:"SCANNER_API_TOKEN" config.json') do (
        set API_TOKEN=%%a
        set API_TOKEN=!API_TOKEN:"=!
        set API_TOKEN=!API_TOKEN: =!
    )
)

REM Essayer d'abord Python (plus simple et rapide)
if exist "scan-confirm.py" (
    python --version >nul 2>&1
    if %errorLevel% equ 0 (
        echo Lancement de la fenêtre Python...
        python scan-confirm.py "%~1" "%~2" "https://renouvellement-ordonnance.vercel.app" "%API_TOKEN%"
        exit /b %errorLevel%
    )
)

REM Fallback: Electron
if exist "node_modules\electron\dist\electron.exe" (
    if exist "electron-app.js" (
        echo Lancement d'Electron...
        "node_modules\electron\dist\electron.exe" "electron-app.js" "%~1" "%~2" "https://renouvellement-ordonnance.vercel.app" "%API_TOKEN%"
        exit /b %errorLevel%
    )
)

echo Erreur: Aucun système de fenêtre disponible
echo Veuillez installer Python ou Electron
pause
exit /b 1
