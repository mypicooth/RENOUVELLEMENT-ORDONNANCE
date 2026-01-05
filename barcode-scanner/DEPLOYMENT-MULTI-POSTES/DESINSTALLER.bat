@echo off
REM ============================================================================
REM  Désinstallation du Service Scanner de QR Codes
REM ============================================================================

echo.
echo ========================================================================
echo   Desinstallation du Scanner de Renouvellement d'Ordonnances
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

powershell -ExecutionPolicy Bypass -File "%~dp0DESINSTALLER.ps1"
