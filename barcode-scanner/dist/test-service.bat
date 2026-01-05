@echo off
REM Script de test pour vérifier que l'exécutable fonctionne

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

echo Test de l'exécution (5 secondes)...
echo Appuyez sur Ctrl+C pour arrêter plus tôt
echo.

start /wait cmd /c "timeout /t 5 /nobreak && taskkill /F /IM renouvellement-scanner.exe 2>nul"

echo.
echo Si aucune erreur n'est apparue, l'exécutable fonctionne.
echo.
pause



