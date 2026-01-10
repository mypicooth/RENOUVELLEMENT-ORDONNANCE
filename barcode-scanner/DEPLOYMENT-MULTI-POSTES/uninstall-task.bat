@echo off
REM Désinstallation de la tâche planifiée du scanner

cd /d "%~dp0"

echo ========================================
echo Desinstallation du Scanner de QR Codes
echo ========================================
echo.

REM Vérifier les privilèges administrateur
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERREUR: Ce script necessite les droits administrateur.
    echo.
    echo Veuillez:
    echo   1. Fermer cette fenetre
    echo   2. Clic droit sur uninstall-task.bat
    echo   3. Selectionner "Executer en tant qu'administrateur"
    echo.
    pause
    exit /b 1
)

set TASK_NAME=RenouvellementQRScanner

REM Arrêter le processus s'il tourne
echo Arret du processus...
taskkill /IM renouvellement-scanner.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul

REM Supprimer la tâche planifiée
echo Suppression de la tache planifiee...
schtasks /Delete /TN "%TASK_NAME%" /F >nul 2>&1

if %errorLevel% equ 0 (
    echo Tache supprimee
) else (
    echo Aucune tache a supprimer
)

REM Supprimer le service s'il existe
echo Suppression du service (si existant)...
sc query "%TASK_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    net stop "%TASK_NAME%" >nul 2>&1
    sc delete "%TASK_NAME%" >nul 2>&1
    echo Service supprime
)

echo.
echo ========================================
echo   Desinstallation terminee
echo ========================================
echo.
echo Le scanner a ete desinstalle.
echo Les fichiers et la configuration restent dans ce dossier.
echo.
pause
