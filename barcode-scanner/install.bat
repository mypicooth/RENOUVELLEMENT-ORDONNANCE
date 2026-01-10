@echo off
echo ========================================
echo Installation du Scanner de QR Codes
echo ========================================
echo.
echo Ce script va installer le scanner comme service Windows.
echo.
echo IMPORTANT: Vous devez exécuter ce script en tant qu'administrateur.
echo.
echo Si vous voyez ce message, vous devez:
echo   1. Fermer cette fenêtre
echo   2. Clic droit sur install.bat
echo   3. Selectionner "Exécuter en tant qu'administrateur"
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
    echo   2. Clic droit sur install.bat
    echo   3. Selectionner "Exécuter en tant qu'administrateur"
    echo.
    pause
    exit /b 1
)
echo.
echo ✅ Droits administrateur confirmés
echo.
echo Lancement de l'installation...
echo.
call "%~dp0install-service.bat"
if %errorLevel% equ 0 (
    echo.
    echo ✅ Installation terminée avec succès !
) else (
    echo.
    echo ❌ Erreur lors de l'installation
    echo Vérifiez les messages ci-dessus pour plus de détails.
)
echo.
pause




