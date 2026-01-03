@echo off
echo Test direct d'Electron...
echo.

cd /d "%~dp0"

echo Chemin actuel: %CD%
echo.

echo Test 1: Vérification des fichiers...
if exist "electron-app.js" (
    echo   electron-app.js: OK
) else (
    echo   electron-app.js: MANQUANT
    pause
    exit /b 1
)

if exist "scan-window.html" (
    echo   scan-window.html: OK
) else (
    echo   scan-window.html: MANQUANT
    pause
    exit /b 1
)

if exist "node_modules\electron\dist\electron.exe" (
    echo   electron.exe: OK
) else (
    echo   electron.exe: MANQUANT
    pause
    exit /b 1
)

echo.
echo Test 2: Lancement d'Electron...
echo.

"node_modules\electron\dist\electron.exe" electron-app.js test123 RENEWAL https://renouvellement-ordonnance.vercel.app testtoken

echo.
echo Electron s'est terminé avec le code: %ERRORLEVEL%
pause

