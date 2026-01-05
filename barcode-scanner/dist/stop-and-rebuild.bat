@echo off
REM Script pour arrêter le service et recompiler l'application

echo ========================================
echo Arrêt du service et recompilation
echo ========================================
echo.

REM Arrêter le service si il existe
echo [1/3] Arrêt du service...
sc query "RenouvellementQRScanner" >nul 2>&1
if %errorLevel% equ 0 (
    echo Service trouvé, arrêt en cours...
    net stop "RenouvellementQRScanner" >nul 2>&1
    timeout /t 2 /nobreak >nul
    echo Service arrêté.
) else (
    echo Service non trouvé ou déjà arrêté.
)
echo.

REM Arrêter toute instance de l'exécutable
echo [2/3] Arrêt des instances de renouvellement-scanner.exe...
taskkill /F /IM renouvellement-scanner.exe >nul 2>&1
if %errorLevel% equ 0 (
    echo Instance(s) arrêtée(s).
    timeout /t 1 /nobreak >nul
) else (
    echo Aucune instance en cours d'exécution.
)
echo.

REM Recompiler depuis le dossier parent
echo [3/3] Recompilation de l'application...
cd /d "%~dp0.."
if exist "package.json" (
    call npm run build
    if %errorLevel% equ 0 (
        echo.
        echo ✅ Recompilation réussie !
        echo.
        echo L'application a été compilée dans le dossier dist/
        echo Vous pouvez maintenant réinstaller le service ou utiliser install-startup.bat
    ) else (
        echo.
        echo ❌ Erreur lors de la recompilation
    )
) else (
    echo ❌ Erreur: package.json introuvable. Assurez-vous d'être dans le bon dossier.
)
echo.
pause



