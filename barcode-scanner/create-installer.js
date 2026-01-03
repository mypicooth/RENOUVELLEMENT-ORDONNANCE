/**
 * Crée un script d'installation pour l'application compilée
 */

const fs = require('fs');
const path = require('path');

const installerScript = `@echo off
echo ========================================
echo Installation du Scanner de QR Codes
echo ========================================
echo.

REM Vérifier les privilèges administrateur
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERREUR: Cette installation nécessite les droits administrateur.
    echo Veuillez exécuter ce script en tant qu'administrateur.
    pause
    exit /b 1
)

echo [1/4] Configuration...
echo.

REM Demander l'URL de l'API
set /p API_URL="URL de l'API (ex: https://renouvellement-ordonnance.vercel.app): "
if "%API_URL%"=="" set API_URL=https://renouvellement-ordonnance.vercel.app

REM Demander le token API
set /p API_TOKEN="Token API (laisser vide si non configuré): "

REM Créer le fichier config.json
(
echo {
echo   "API_URL": "%API_URL%",
echo   "SCANNER_API_TOKEN": "%API_TOKEN%",
echo   "SCAN_INTERVAL": 100,
echo   "MIN_LENGTH": 20
echo }
) > config.json

echo.
echo [2/4] Installation du service Windows...
echo.

REM Installer le service avec NSSM (si disponible) ou node-windows
if exist "nssm.exe" (
    nssm.exe install "RenouvellementQRScanner" "%~dp0renouvellement-scanner.exe"
    nssm.exe set "RenouvellementQRScanner" AppDirectory "%~dp0"
    nssm.exe set "RenouvellementQRScanner" Description "Scanner de QR codes en arrière-plan pour les renouvellements"
    nssm.exe start "RenouvellementQRScanner"
    echo Service installé avec NSSM
) else (
    echo Installation du service avec PowerShell...
    powershell -ExecutionPolicy Bypass -File "%~dp0install-service.ps1"
)

echo.
echo [3/4] Vérification...
echo.

REM Vérifier que le service est installé
sc query "RenouvellementQRScanner" >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Service installé avec succès
) else (
    echo ⚠️  Le service n'a pas pu être installé automatiquement
    echo    Vous pouvez l'installer manuellement avec install-service.ps1
)

echo.
echo [4/4] Finalisation...
echo.
echo ✅ Installation terminée !
echo.
echo Le scanner est maintenant actif et se lancera automatiquement au démarrage.
echo.
echo Pour vérifier le statut du service :
echo   sc query RenouvellementQRScanner
echo.
echo Pour démarrer/arrêter le service :
echo   net start RenouvellementQRScanner
echo   net stop RenouvellementQRScanner
echo.
pause
`;

const uninstallerScript = `@echo off
echo ========================================
echo Désinstallation du Scanner de QR Codes
echo ========================================
echo.

REM Vérifier les privilèges administrateur
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERREUR: Cette désinstallation nécessite les droits administrateur.
    pause
    exit /b 1
)

echo Arrêt du service...
net stop "RenouvellementQRScanner" >nul 2>&1

echo Suppression du service...
if exist "nssm.exe" (
    nssm.exe remove "RenouvellementQRScanner" confirm
) else (
    sc delete "RenouvellementQRScanner"
)

echo.
echo ✅ Désinstallation terminée !
echo.
pause
`;

// Créer les scripts
fs.writeFileSync(path.join(__dirname, 'install.bat'), installerScript, 'utf8');
fs.writeFileSync(path.join(__dirname, 'uninstall.bat'), uninstallerScript, 'utf8');

console.log('✅ Scripts d\'installation créés :');
console.log('   - install.bat');
console.log('   - uninstall.bat');

