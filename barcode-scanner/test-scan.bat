@echo off
REM Script de test pour vérifier que le scanner détecte les QR codes

echo ========================================
echo Test de détection de QR code
echo ========================================
echo.
echo Ce script va copier un QR code de test dans le presse-papiers
echo et vérifier que le scanner le détecte.
echo.
echo Assurez-vous que le service est démarré ou que renouvellement-scanner.exe est en cours d'exécution.
echo.
pause

REM Créer un QR code de test (format JSON)
set TEST_QR={"renewalId":"test123456789","type":"RENEWAL"}

REM Copier dans le presse-papiers (nécessite PowerShell)
powershell -Command "Set-Clipboard -Value '%TEST_QR%'"

echo.
echo QR code de test copié dans le presse-papiers: %TEST_QR%
echo.
echo Vérifiez les logs dans le dossier logs/ pour voir si le scanner a détecté le QR code.
echo.
echo Appuyez sur une touche pour continuer...
pause


