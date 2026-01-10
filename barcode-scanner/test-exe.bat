@echo off
REM Script pour tester l'exécutable et voir les erreurs

set EXE_PATH=%~dp0renouvellement-scanner.exe

echo ========================================
echo Test de l'exécutable Scanner QR
echo ========================================
echo.

if not exist "%EXE_PATH%" (
    echo ❌ ERREUR: renouvellement-scanner.exe introuvable dans %~dp0
    pause
    exit /b 1
)

echo ✅ Fichier trouvé: %EXE_PATH%
echo.
echo Lancement de l'application en mode console...
echo Les erreurs s'afficheront ci-dessous.
echo Appuyez sur Ctrl+C pour arrêter.
echo.
echo ========================================
echo.

REM Lancer l'application et capturer la sortie
"%EXE_PATH%"

echo.
echo ========================================
echo L'application s'est arrêtée.
echo.

REM Vérifier les logs créés
if exist "%~dp0logs" (
    echo Logs trouvés dans le dossier logs/
    dir /b "%~dp0logs\*.log" 2>nul
) else (
    echo Aucun dossier logs trouvé
)

if exist "%~dp0scanner-error.log" (
    echo.
    echo Fichier scanner-error.log trouvé:
    type "%~dp0scanner-error.log"
)

if exist "%TEMP%\renouvellement-scanner-startup.log" (
    echo.
    echo Fichier de log temporaire trouvé:
    type "%TEMP%\renouvellement-scanner-startup.log"
)

echo.
pause




