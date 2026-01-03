@echo off
REM Script d'installation du service Windows pour le scanner QR
REM Ce script contourne les restrictions PowerShell en utilisant directement sc.exe

echo ========================================
echo Installation du Scanner de QR Codes
echo ========================================
echo.

REM Vérifier les privilèges administrateur
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERREUR: Ce script nécessite les droits administrateur.
    echo.
    echo Veuillez:
    echo   1. Fermer cette fenêtre
    echo   2. Clic droit sur install-service.bat
    echo   3. Selectionner "Exécuter en tant qu'administrateur"
    echo.
    pause
    exit /b 1
)

set SERVICE_NAME=RenouvellementQRScanner
set SERVICE_DISPLAY_NAME=Scanner de QR Codes - Renouvellements
set SERVICE_DESCRIPTION=Scanner de QR codes en arrière-plan pour les renouvellements d'ordonnances
set EXE_PATH=%~dp0renouvellement-scanner.exe

REM Vérifier que l'exe existe
if not exist "%EXE_PATH%" (
    echo ERREUR: renouvellement-scanner.exe introuvable dans %~dp0
    echo Assurez-vous que vous êtes dans le bon dossier.
    pause
    exit /b 1
)

REM Vérifier que config.json existe
if not exist "%~dp0config.json" (
    echo.
    echo ⚠️  Fichier config.json introuvable
    echo Création d'un fichier config.json par défaut...
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
    
    echo ✅ Fichier config.json créé
    echo.
)

REM Arrêter le service s'il existe déjà
echo Vérification du service existant...
sc query "%SERVICE_NAME%" >nul 2>&1
if %errorLevel% equ 0 (
    echo Arrêt du service existant...
    net stop "%SERVICE_NAME%" >nul 2>&1
    timeout /t 2 /nobreak >nul
    echo Suppression de l'ancien service...
    sc delete "%SERVICE_NAME%" >nul 2>&1
    timeout /t 2 /nobreak >nul
)

REM Créer le service avec le chemin complet entre guillemets
echo.
echo Installation du service Windows...
echo Chemin de l'exécutable: %EXE_PATH%
sc create "%SERVICE_NAME%" binPath= "\"%EXE_PATH%\"" DisplayName= "%SERVICE_DISPLAY_NAME%" start= auto

if %errorLevel% neq 0 (
    echo.
    echo ❌ Erreur lors de la création du service
    echo Vérifiez que vous avez les droits administrateur.
    echo.
    echo Le chemin utilisé était: %EXE_PATH%
    pause
    exit /b 1
)

echo ✅ Service créé avec succès

REM Configurer la description
sc description "%SERVICE_NAME%" "%SERVICE_DESCRIPTION%"

REM Configurer le service pour qu'il redémarre automatiquement en cas d'erreur
sc failure "%SERVICE_NAME%" reset= 86400 actions= restart/5000/restart/10000/restart/20000

REM Configurer le type de démarrage automatique
sc config "%SERVICE_NAME%" start= auto

REM IMPORTANT: Configurer le service pour permettre l'interaction avec le bureau
REM Cela est nécessaire pour accéder au presse-papiers de l'utilisateur
echo Configuration de l'interaction avec le bureau...
sc config "%SERVICE_NAME%" type= interact type= own
if %errorLevel% neq 0 (
    echo ⚠️  Attention: Impossible de configurer l'interaction avec le bureau
    echo    Le service pourrait ne pas pouvoir accéder au presse-papiers
    echo    Solution alternative: Exécuter l'application en mode démarrage automatique
    echo    au lieu d'un service Windows
)

REM Vérifier que le chemin de l'exe est correct
echo Vérification de la configuration...
sc qc "%SERVICE_NAME%" | find "%EXE_PATH%" >nul
if %errorLevel% neq 0 (
    echo ⚠️  Attention: Le chemin du service pourrait être incorrect
)

REM Vérifier que le fichier exe est accessible
echo Vérification de l'accès au fichier exe...
if not exist "%EXE_PATH%" (
    echo ❌ ERREUR: Le fichier %EXE_PATH% n'existe pas !
    pause
    exit /b 1
)

REM Tester si le fichier peut être exécuté (test rapide)
echo Test de l'exécutable...
"%EXE_PATH%" --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ⚠️  L'exécutable ne répond pas aux commandes standard
    echo    Cela peut être normal pour un service Windows
)

REM Vérifier que config.json est valide
echo Vérification de config.json...
if exist "%~dp0config.json" (
    findstr /C:"API_URL" "%~dp0config.json" >nul 2>&1
    if %errorLevel% neq 0 (
        echo ⚠️  Attention: config.json pourrait être invalide
    )
) else (
    echo ⚠️  Attention: config.json n'existe pas
)

REM Démarrer le service avec plusieurs tentatives
echo.
echo Démarrage du service...
net start "%SERVICE_NAME%"

if %errorLevel% neq 0 (
    echo.
    echo ⚠️  Première tentative de démarrage échouée
    echo Attente de 3 secondes avant nouvelle tentative...
    timeout /t 3 /nobreak >nul
    
    echo Nouvelle tentative de démarrage...
    net start "%SERVICE_NAME%"
    
    if %errorLevel% neq 0 (
        echo.
        echo ❌ Erreur lors du démarrage du service
        echo.
        echo Diagnostic:
        echo   1. Vérifiez que le fichier existe: %EXE_PATH%
        echo   2. Vérifiez que config.json est valide
        echo   3. Vérifiez les logs dans l'Observateur d'événements Windows
        echo.
        echo Configuration du service:
        sc qc "%SERVICE_NAME%"
        echo.
        echo Pour démarrer manuellement plus tard:
        echo   net start %SERVICE_NAME%
        echo.
        echo Pour voir les erreurs détaillées:
        echo   1. Ouvrir l'Observateur d'événements (eventvwr.msc)
        echo   2. Applications et services journaux ^> %SERVICE_NAME%
        echo   3. Ou: Journaux Windows ^> Application
        echo.
        echo Le service est installé mais non démarré.
        echo Vous pouvez essayer de le démarrer manuellement plus tard.
        echo.
        pause
        exit /b 1
    )
)

REM Attendre un peu pour que le service démarre
timeout /t 3 /nobreak >nul

REM Vérifier le statut
sc query "%SERVICE_NAME%" | find "RUNNING" >nul
if %errorLevel% equ 0 (
    echo.
    echo ✅ Service installé et démarré avec succès !
    echo.
    echo Le scanner est maintenant actif et se lancera automatiquement au démarrage.
) else (
    echo.
    echo ⚠️  Service installé mais le statut est incertain.
    echo Vérifiez avec: sc query %SERVICE_NAME%
    echo.
    echo Pour démarrer manuellement: net start %SERVICE_NAME%
)

echo.
echo ========================================
echo Commandes utiles:
echo   Démarrer:   net start %SERVICE_NAME%
echo   Arrêter:    net stop %SERVICE_NAME%
echo   Statut:     sc query %SERVICE_NAME%
echo ========================================
echo.
pause

