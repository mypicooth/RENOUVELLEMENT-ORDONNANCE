@echo off
REM Script de vérification et maintenance du service

set SERVICE_NAME=RenouvellementQRScanner

echo ========================================
echo Vérification du Service Scanner QR
echo ========================================
echo.

REM Vérifier si le service existe
sc query "%SERVICE_NAME%" >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ Le service %SERVICE_NAME% n'existe pas.
    echo.
    echo Pour l'installer:
    echo   1. Clic droit sur install.bat
    echo   2. Selectionner "Exécuter en tant qu'administrateur"
    echo.
    echo OU
    echo.
    echo   1. Clic droit sur install-service.bat
    echo   2. Selectionner "Exécuter en tant qu'administrateur"
    echo.
    set /p INSTALL_NOW="Voulez-vous installer le service maintenant? (O/N): "
    if /i "%INSTALL_NOW%"=="O" (
        echo.
        echo Lancement de l'installation...
        call "%~dp0install-service.bat"
    ) else (
        echo.
        echo Installation annulée.
    )
    pause
    exit /b 1
)

echo ✅ Le service existe
echo.

REM Afficher le statut du service
echo Statut du service:
sc query "%SERVICE_NAME%"
echo.

REM Vérifier si le service est en cours d'exécution
sc query "%SERVICE_NAME%" | find "RUNNING" >nul
if %errorLevel% equ 0 (
    echo ✅ Le service est en cours d'exécution
) else (
    echo ⚠️  Le service n'est pas en cours d'exécution
    echo.
    echo Tentative de démarrage...
    net start "%SERVICE_NAME%"
    if %errorLevel% equ 0 (
        echo ✅ Service démarré avec succès
    ) else (
        echo ❌ Erreur lors du démarrage du service
        echo.
        echo Vérifiez les logs dans l'Observateur d'événements Windows:
        echo   - Ouvrir l'Observateur d'événements
        echo   - Applications et services journaux ^> %SERVICE_NAME%
        echo.
    )
)

echo.
echo ========================================
echo Commandes utiles:
echo   Démarrer:   net start %SERVICE_NAME%
echo   Arrêter:    net stop %SERVICE_NAME%
echo   Redémarrer: net stop %SERVICE_NAME% ^&^& net start %SERVICE_NAME%
echo   Statut:     sc query %SERVICE_NAME%
echo ========================================
echo.
pause

