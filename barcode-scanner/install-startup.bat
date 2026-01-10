@echo off
REM Script pour installer l'application en mode démarrage automatique
REM au lieu d'un service Windows (solution alternative si le service ne peut pas accéder au clipboard)

set APP_NAME=RenouvellementQRScanner
set EXE_PATH=%~dp0renouvellement-scanner.exe

echo ========================================
echo Installation en mode démarrage automatique
echo ========================================
echo.
echo Ce script va ajouter l'application au démarrage automatique de Windows.
echo Cette méthode permet d'accéder au presse-papiers contrairement aux services Windows.
echo.
echo IMPORTANT: L'application s'exécutera dans la session de l'utilisateur.
echo.
pause

REM Créer un raccourci dans le dossier de démarrage
set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_PATH=%STARTUP_FOLDER%\%APP_NAME%.lnk

echo.
echo Création du raccourci de démarrage...
echo Chemin: %SHORTCUT_PATH%
echo.

REM Utiliser PowerShell pour créer le raccourci
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%'); $Shortcut.TargetPath = '%EXE_PATH%'; $Shortcut.WorkingDirectory = '%~dp0'; $Shortcut.Description = 'Scanner QR Codes Renouvellement Ordonnance'; $Shortcut.Save()"

if %errorLevel% equ 0 (
    echo.
    echo ✅ Installation réussie !
    echo.
    echo L'application démarrera automatiquement à la prochaine connexion.
    echo Pour tester maintenant, exécutez: "%EXE_PATH%"
    echo.
) else (
    echo.
    echo ❌ Erreur lors de la création du raccourci
    echo.
    pause
    exit /b 1
)

pause




