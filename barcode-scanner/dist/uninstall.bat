@echo off
echo ========================================
echo Desinstallation du Scanner de QR Codes
echo ========================================
echo.
echo Ce script va supprimer le service Windows.
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
    echo Veuillez exécuter PowerShell en tant qu'administrateur et exécuter:
    echo   net stop RenouvellementQRScanner
    echo   sc delete RenouvellementQRScanner
    echo.
    pause
    exit /b 1
)
echo.
echo Arrêt du service...
net stop RenouvellementQRScanner 2>nul
if %errorLevel% equ 0 (
    echo Service arrêté.
) else (
    echo Service non démarré ou déjà arrêté.
)
echo.
echo Suppression du service...
sc delete RenouvellementQRScanner
if %errorLevel% equ 0 (
    echo.
    echo ✅ Service désinstallé avec succès !
) else (
    echo.
    echo ⚠️  Le service n'existe peut-être pas ou a déjà été supprimé.
)
echo.
pause
