@echo off
echo ========================================
echo Installation du Scanner de QR Codes
echo ========================================
echo.
echo Ce script va installer le scanner comme service Windows.
echo.
echo IMPORTANT: Vous devez exécuter ce script en tant qu'administrateur.
echo.
pause
echo.
echo Vérification des privilèges administrateur...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ERREUR: Ce script nécessite les droits administrateur.
    echo.
    echo Veuillez:
    echo   1. Fermer cette fenêtre
    echo   2. Clic droit sur install-service.ps1
    echo   3. Selectionner "Exécuter avec PowerShell" (en tant qu'administrateur)
    echo.
    pause
    exit /b 1
)
echo.
echo Lancement de l'installation PowerShell...
powershell -ExecutionPolicy Bypass -File "%~dp0install-service.ps1"
pause
