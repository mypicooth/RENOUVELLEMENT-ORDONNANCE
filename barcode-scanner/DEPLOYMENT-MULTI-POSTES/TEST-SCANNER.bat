@echo off
REM ============================================================================
REM  Test Rapide du Scanner
REM ============================================================================

REM Se placer dans le dossier du script
cd /d "%~dp0"

echo.
echo ========================================================================
echo   Test du Scanner de QR Codes
echo ========================================================================
echo.

echo Ce script va lancer le scanner en mode test.
echo.
echo Instructions:
echo   1. Scannez un QR code de test
echo   2. Verifiez que la fenetre de confirmation s'ouvre
echo   3. Appuyez sur Ctrl+C pour arreter le test
echo.
echo ========================================================================
echo.

pause

echo Lancement du scanner...
renouvellement-scanner.exe

echo.
echo Test termine.
pause
