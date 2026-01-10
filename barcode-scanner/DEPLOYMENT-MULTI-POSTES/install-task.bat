@echo off
REM Installation du scanner comme tâche planifiée (au lieu d'un service)
REM Cela permet l'accès au presse-papiers et l'ouverture des fenêtres Python

cd /d "%~dp0"

echo ========================================
echo Installation du Scanner de QR Codes
echo (Tache planifiee - Demarrage automatique)
echo ========================================
echo.

REM Vérifier les privilèges administrateur
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERREUR: Ce script necessite les droits administrateur.
    echo.
    echo Veuillez:
    echo   1. Fermer cette fenetre
    echo   2. Clic droit sur install-task.bat
    echo   3. Selectionner "Executer en tant qu'administrateur"
    echo.
    pause
    exit /b 1
)

set TASK_NAME=RenouvellementQRScanner
set EXE_PATH=%~dp0renouvellement-scanner.exe
set WORK_DIR=%~dp0

REM Vérifier que l'exe existe
if not exist "%EXE_PATH%" (
    echo ERREUR: renouvellement-scanner.exe introuvable dans %~dp0
    pause
    exit /b 1
)

REM Vérifier que config.json existe
if not exist "%~dp0config.json" (
    echo.
    echo Fichier config.json introuvable
    echo Creation d'un fichier config.json par defaut...
    echo.
    set /p API_URL="Entrez l'URL de l'API (ex: https://renouvellement-ordonnance.vercel.app): "
    if "%API_URL%"=="" set API_URL=https://renouvellement-ordonnance.vercel.app
    
    set /p API_TOKEN="Entrez le token API (ou laissez vide): "
    
    (
        echo {
        echo   "API_URL": "%API_URL%",
        echo   "SCANNER_API_TOKEN": "%API_TOKEN%",
        echo   "SCAN_INTERVAL": 100,
        echo   "MIN_LENGTH": 20
        echo }
    ) > "%~dp0config.json"
    
    echo Config cree
    echo.
)

REM Supprimer la tâche si elle existe
echo Verification de la tache existante...
schtasks /Query /TN "%TASK_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    echo Suppression de l'ancienne tache...
    schtasks /Delete /TN "%TASK_NAME%" /F >nul 2>&1
)

REM Supprimer l'ancien service s'il existe
echo Verification du service existant...
sc query "%TASK_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    echo Suppression de l'ancien service...
    net stop "%TASK_NAME%" >nul 2>&1
    timeout /t 2 /nobreak >nul
    sc delete "%TASK_NAME%" >nul 2>&1
    timeout /t 2 /nobreak >nul
    echo Ancien service supprime
)

REM Créer la tâche planifiée
echo.
echo Creation de la tache planifiee...
echo Chemin: %EXE_PATH%
echo Dossier de travail: %WORK_DIR%
echo.

schtasks /Create /TN "%TASK_NAME%" /TR "\"%EXE_PATH%\"" /SC ONLOGON /RL HIGHEST /F /RU "%USERNAME%" /IT

if %errorLevel% neq 0 (
    echo.
    echo ERREUR lors de la creation de la tache
    echo Verifiez que vous avez les droits administrateur.
    pause
    exit /b 1
)

echo Tache creee avec succes

REM Modifier la tâche pour définir le dossier de travail
echo Configuration du dossier de travail...
schtasks /Change /TN "%TASK_NAME%" /TR "\"%EXE_PATH%\"" /IT >nul 2>&1

REM Démarrer la tâche maintenant
echo.
echo Demarrage du scanner...
schtasks /Run /TN "%TASK_NAME%"

if %errorLevel% neq 0 (
    echo.
    echo ERREUR lors du demarrage
    echo Essayez de le demarrer manuellement:
    echo   schtasks /Run /TN %TASK_NAME%
    echo.
    pause
    exit /b 1
)

REM Attendre que le processus démarre
echo Attente du demarrage (5 secondes)...
timeout /t 5 /nobreak >nul

REM Vérifier si le processus tourne
tasklist /FI "IMAGENAME eq renouvellement-scanner.exe" 2>NUL | find /I /N "renouvellement-scanner.exe">NUL
if %errorLevel% equ 0 (
    echo.
    echo ========================================
    echo   Installation terminee avec succes !
    echo ========================================
    echo.
    echo Le scanner est maintenant actif et se lancera
    echo automatiquement a chaque connexion.
    echo.
    echo Le processus tourne en arriere-plan.
) else (
    echo.
    echo Tache creee mais le processus ne semble pas demarrer.
    echo.
    echo Verifications:
    echo   1. Double-cliquez sur renouvellement-scanner.exe pour tester
    echo   2. Verifiez les logs dans le dossier logs\
    echo   3. Verifiez que config.json est correct
    echo.
    echo Pour demarrer: schtasks /Run /TN %TASK_NAME%
)

echo.
echo ========================================
echo Commandes utiles:
echo   Demarrer:   schtasks /Run /TN %TASK_NAME%
echo   Arreter:    taskkill /IM renouvellement-scanner.exe /F
echo   Statut:     tasklist ^| find "renouvellement-scanner"
echo   Supprimer:  schtasks /Delete /TN %TASK_NAME% /F
echo ========================================
echo.
pause
