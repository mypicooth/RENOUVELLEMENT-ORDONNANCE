@echo off
REM Script pour redémarrer le service

set SERVICE_NAME=RenouvellementQRScanner

echo ========================================
echo Redémarrage du Service Scanner QR
echo ========================================
echo.

REM Vérifier les privilèges administrateur
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERREUR: Ce script nécessite les droits administrateur.
    echo Clic droit ^> Exécuter en tant qu'administrateur
    pause
    exit /b 1
)

echo Arrêt du service...
net stop "%SERVICE_NAME%"
timeout /t 2 /nobreak >nul

echo Démarrage du service...
net start "%SERVICE_NAME%"

if %errorLevel% equ 0 (
    echo.
    echo ✅ Service redémarré avec succès !
) else (
    echo.
    echo ❌ Erreur lors du redémarrage
    echo Vérifiez les logs dans l'Observateur d'événements Windows
)

echo.
pause



