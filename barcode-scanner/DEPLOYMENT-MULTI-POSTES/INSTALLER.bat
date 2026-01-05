@echo off
REM ============================================================================
REM  Installation du Scanner de QR Codes - Configuration Automatique
REM ============================================================================

echo.
echo ========================================================================
echo   Installation du Scanner de Renouvellement d'Ordonnances
echo ========================================================================
echo.

REM Vérifier les droits administrateur
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERREUR] Ce script doit etre execute en tant qu'administrateur
    echo.
    echo Faites un clic-droit sur le fichier et selectionnez
    echo "Executer en tant qu'administrateur"
    echo.
    pause
    exit /b 1
)

echo [OK] Droits administrateur detectes
echo.

REM Afficher le répertoire d'installation
echo Repertoire d'installation: %cd%
echo.

REM 1. Vérifier la présence des fichiers nécessaires
echo [Etape 1/4] Verification des fichiers...
if not exist "renouvellement-scanner.exe" (
    echo [ERREUR] Fichier manquant: renouvellement-scanner.exe
    pause
    exit /b 1
)
if not exist "keyboard-hook.ps1" (
    echo [ERREUR] Fichier manquant: keyboard-hook.ps1
    pause
    exit /b 1
)
if not exist "config.json" (
    echo [ERREUR] Fichier manquant: config.json
    pause
    exit /b 1
)
echo [OK] Tous les fichiers necessaires sont presents
echo.

REM 2. Créer le dossier logs s'il n'existe pas
echo [Etape 2/4] Creation du dossier logs...
if not exist "logs" mkdir logs
echo [OK] Dossier logs cree
echo.

REM 3. Configurer la politique d'exécution PowerShell pour ce processus
echo [Etape 3/4] Configuration PowerShell...
powershell -Command "Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force"
echo [OK] PowerShell configure
echo.

REM 4. Installer le service Windows
echo [Etape 4/4] Installation du service Windows...
if exist "install-service.bat" (
    call install-service.bat
) else (
    echo [ERREUR] Fichier install-service.bat introuvable
    pause
    exit /b 1
)

echo.
echo ========================================================================
echo   Installation terminee avec succes !
echo ========================================================================
echo.
echo Le scanner est maintenant installe en tant que service Windows.
echo Il demarrera automatiquement a chaque demarrage de l'ordinateur.
echo.
echo Pour verifier l'etat du service:
echo   Get-Service -Name "RenouvellementsScanner"
echo.
echo Pour consulter les logs:
echo   Ouvrir le dossier: %cd%\logs
echo.
echo Vous pouvez maintenant scanner un QR code pour tester !
echo.
pause
