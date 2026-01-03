@echo off
REM Script de diagnostic pour le service

set SERVICE_NAME=RenouvellementQRScanner
set EXE_PATH=%~dp0renouvellement-scanner.exe

echo ========================================
echo Diagnostic du Service Scanner QR
echo ========================================
echo.

echo [1] Vérification du fichier exécutable...
if exist "%EXE_PATH%" (
    echo ✅ Fichier trouvé: %EXE_PATH%
    dir "%EXE_PATH%" | find "%EXE_PATH%"
) else (
    echo ❌ Fichier introuvable: %EXE_PATH%
    echo.
    pause
    exit /b 1
)

echo.
echo [2] Vérification de config.json...
if exist "%~dp0config.json" (
    echo ✅ Fichier config.json trouvé
    echo Contenu:
    type "%~dp0config.json"
    echo.
) else (
    echo ❌ Fichier config.json introuvable
    echo.
)

echo [3] Vérification du service Windows...
sc query "%SERVICE_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Service existe
    echo.
    echo Configuration du service:
    sc qc "%SERVICE_NAME%"
    echo.
    echo Statut du service:
    sc query "%SERVICE_NAME%"
    echo.
) else (
    echo ❌ Service n'existe pas
    echo.
)

echo [4] Test d'exécution manuelle (5 secondes)...
echo ATTENTION: Cela va lancer l'application en mode console
echo Appuyez sur Ctrl+C pour arrêter
echo.
pause
echo.
echo Lancement de l'application...
start "Test Scanner QR" "%EXE_PATH%"
timeout /t 5 /nobreak >nul
taskkill /F /FI "WINDOWTITLE eq Test Scanner QR*" >nul 2>&1
echo.
echo Si aucune erreur n'est apparue dans la fenêtre, l'application fonctionne.
echo.

echo [5] Vérification des logs Windows...
echo.
echo Pour voir les logs détaillés:
echo   1. Ouvrir l'Observateur d'événements (eventvwr.msc)
echo   2. Journaux Windows ^> Application
echo   3. Chercher les erreurs récentes liées à "renouvellement-scanner"
echo.

pause

