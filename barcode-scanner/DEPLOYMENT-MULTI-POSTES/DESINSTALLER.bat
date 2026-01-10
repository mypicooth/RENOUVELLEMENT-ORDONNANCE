@echo off
cd /d "%~dp0"

echo ========================================================================
echo   DESINSTALLATION SCANNER QR
echo ========================================================================
echo.

REM Vérifier droits admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERREUR: Executez en tant qu'administrateur
    pause
    exit /b 1
)

REM Arrêter processus
echo Arret du processus...
taskkill /IM renouvellement-scanner.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul

REM Supprimer tâche planifiée
echo Suppression de la tache...
schtasks /Delete /TN "RenouvellementQRScanner" /F >nul 2>&1

REM Supprimer service (au cas où)
sc query "RenouvellementQRScanner" >nul 2>&1
if %errorLevel% equ 0 (
    net stop "RenouvellementQRScanner" >nul 2>&1
    sc delete "RenouvellementQRScanner" >nul 2>&1
)

echo.
echo ========================================================================
echo   DESINSTALLATION TERMINEE
echo ========================================================================
echo.
echo Le scanner a ete desinstalle.
echo Les fichiers restent dans ce dossier.
echo.
pause
    exit /b 1
)

echo [OK] Droits administrateur detectes
echo.

REM Se placer dans le dossier du script
cd /d "%~dp0"

set SERVICE_NAME=RenouvellementQRScanner

REM Vérifier si le service existe
sc query "%SERVICE_NAME%" >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Le service '%SERVICE_NAME%' n'est pas installe
    echo.
    pause
    exit /b 0
)

echo [Etape 1/3] Arret du service...
sc stop "%SERVICE_NAME%" >nul 2>&1
timeout /t 2 /nobreak >nul
echo [OK] Service arrete
echo.

echo [Etape 2/3] Suppression du service...
sc delete "%SERVICE_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Service supprime
) else (
    echo [ERREUR] Impossible de supprimer le service
    pause
    exit /b 1
)
echo.

echo [Etape 3/3] Nettoyage...
timeout /t 2 /nobreak >nul
echo [OK] Nettoyage termine
echo.

echo ========================================================================
echo   Desinstallation terminee
echo ========================================================================
echo.
echo Le service '%SERVICE_NAME%' a ete desinstalle.
echo Les fichiers de l'application sont toujours presents.
echo Vous pouvez les supprimer manuellement si necessaire.
echo.
pause
