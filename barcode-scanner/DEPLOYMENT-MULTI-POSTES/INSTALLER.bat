@echo off
cd /d "%~dp0"

echo ========================================================================
echo   INSTALLATION SCANNER QR - RENOUVELLEMENT ORDONNANCES
echo ========================================================================
echo.

REM Vérifier droits admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERREUR: Executez en tant qu'administrateur
    echo (Clic droit sur INSTALLER.bat ^> Executer en tant qu'administrateur)
    pause
    exit /b 1
)

REM Vérifier fichiers
if not exist "renouvellement-scanner.exe" (
    echo ERREUR: renouvellement-scanner.exe manquant
    pause
    exit /b 1
)

if not exist "keyboard-hook.ps1" (
    echo ERREUR: keyboard-hook.ps1 manquant
    pause
    exit /b 1
)

if not exist "scan-confirm.py" (
    echo ERREUR: scan-confirm.py manquant
    pause
    exit /b 1
)

REM Créer config.json si inexistant
if not exist "config.json" (
    echo.
    echo Configuration de l'API...
    set /p API_URL="URL de l'API [https://renouvellement-ordonnance.vercel.app]: "
    if "%API_URL%"=="" set API_URL=https://renouvellement-ordonnance.vercel.app
    
    set /p API_TOKEN="Token API: "
    
    (
        echo {
        echo   "API_URL": "%API_URL%",
        echo   "SCANNER_API_TOKEN": "%API_TOKEN%",
        echo   "SCAN_INTERVAL": 100,
        echo   "MIN_LENGTH": 20
        echo }
    ) > "config.json"
    echo Config creee
)

REM Supprimer ancien service si existe
sc query "RenouvellementQRScanner" >nul 2>&1
if %errorLevel% equ 0 (
    echo Suppression ancien service...
    net stop "RenouvellementQRScanner" >nul 2>&1
    sc delete "RenouvellementQRScanner" >nul 2>&1
    timeout /t 2 /nobreak >nul
)

REM Supprimer ancienne tâche si existe
schtasks /Query /TN "RenouvellementQRScanner" >nul 2>&1
if %errorLevel% equ 0 (
    echo Suppression ancienne tache...
    taskkill /IM renouvellement-scanner.exe /F >nul 2>&1
    schtasks /Delete /TN "RenouvellementQRScanner" /F >nul 2>&1
    timeout /t 2 /nobreak >nul
)

REM Créer tâche planifiée avec le wrapper tray
echo.
echo Installation de la tache planifiee...
echo (avec icone dans la barre des taches)

REM Créer un VBS pour lancer PowerShell en mode caché
set VBS_LAUNCHER=%TEMP%\launch-scanner-tray.vbs
(
    echo Set objShell = CreateObject^("WScript.Shell"^)
    echo objShell.Run "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%~dp0scanner-tray.ps1""", 0, False
) > "%VBS_LAUNCHER%"

schtasks /Create /TN "RenouvellementQRScanner" /TR "\"%VBS_LAUNCHER%\"" /SC ONLOGON /RL HIGHEST /F /IT

if %errorLevel% neq 0 (
    echo ERREUR: Impossib avec icone tray...
schtasks /Run /TN "RenouvellementQRScanner"
timeout /t 3 /nobreak >nul

echo.
echo ========================================================================
echo   INSTALLATION REUSSIE !
echo ========================================================================
echo.
echo Le scanner est actif avec une ICONE VERTE dans la barre des taches.
echo Il demarrera automatiquement a chaque connexion.
echo.
echo Menu clic droit sur l'icone:
echo   - Demarrer / Arreter / Redemarrer
echo   - Voir les logs
echo   - Quitter
echo.
echo Double-clic sur l'icone pour redemarrer le scanner.
echo.   echo Pour arreter:  taskkill /IM renouvellement-scanner.exe /F
    echo.
) else (
    echo.
    echo Tache creee mais processus non demarre
    echo Testez manuellement: Double-cliquez sur renouvellement-scanner.exe
)
echo Pour lancer manuellement: Double-cliquez sur LANCER-SCANNER.bat
echo.

echo Logs disponibles dans: %~dp0logs\
echo.
pause

