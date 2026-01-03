/**
 * Script de build pour compiler l'application en exécutable Windows
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(70));
console.log('  Build de l\'application Scanner QR Codes');
console.log('='.repeat(70));
console.log('');

// Créer le dossier dist s'il n'existe pas
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('[1/5] Compilation de l\'application...');
try {
  execSync('pkg . --targets node18-win-x64 --output dist/renouvellement-scanner.exe', {
    stdio: 'inherit',
    cwd: __dirname
  });
  console.log('✅ Compilation réussie\n');
} catch (error) {
  console.error('❌ Erreur lors de la compilation');
  process.exit(1);
}

console.log('[2/5] Copie des fichiers de configuration...');
const filesToCopy = [
  { src: 'config.json', dest: 'config.json' },
  { src: 'install-service-standalone.ps1', dest: 'install-service.ps1' },
];

// Créer aussi install.bat et uninstall.bat dans dist
const installBat = `@echo off
echo ========================================
echo Installation du Scanner de QR Codes
echo ========================================
echo.
echo Ce script va installer le scanner comme service Windows.
echo.
echo IMPORTANT: Vous devez exécuter ce script en tant qu'administrateur.
echo.
pause
echo.
echo Vérification des privilèges administrateur...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ERREUR: Ce script nécessite les droits administrateur.
    echo.
    echo Veuillez:
    echo   1. Fermer cette fenêtre
    echo   2. Clic droit sur install-service.ps1
    echo   3. Selectionner "Exécuter avec PowerShell" (en tant qu'administrateur)
    echo.
    pause
    exit /b 1
)
echo.
echo Lancement de l'installation PowerShell...
powershell -ExecutionPolicy Bypass -File "%~dp0install-service.ps1"
pause
`;

const uninstallBat = `@echo off
echo ========================================
echo Desinstallation du Scanner de QR Codes
echo ========================================
echo.
echo Ce script va supprimer le service Windows.
echo.
echo IMPORTANT: Vous devez exécuter ce script en tant qu'administrateur.
echo.
pause
echo.
echo Vérification des privilèges administrateur...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ERREUR: Ce script nécessite les droits administrateur.
    echo.
    echo Veuillez exécuter PowerShell en tant qu'administrateur et exécuter:
    echo   net stop RenouvellementQRScanner
    echo   sc delete RenouvellementQRScanner
    echo.
    pause
    exit /b 1
)
echo.
echo Arrêt du service...
net stop RenouvellementQRScanner 2>nul
if %errorLevel% equ 0 (
    echo Service arrêté.
) else (
    echo Service non démarré ou déjà arrêté.
)
echo.
echo Suppression du service...
sc delete RenouvellementQRScanner
if %errorLevel% equ 0 (
    echo.
    echo ✅ Service désinstallé avec succès !
) else (
    echo.
    echo ⚠️  Le service n'existe peut-être pas ou a déjà été supprimé.
)
echo.
pause
`;

fs.writeFileSync(path.join(distDir, 'install.bat'), installBat, 'utf8');
fs.writeFileSync(path.join(distDir, 'uninstall.bat'), uninstallBat, 'utf8');
console.log('   ✓ install.bat créé');
console.log('   ✓ uninstall.bat créé');

filesToCopy.forEach(({ src, dest }) => {
  const srcPath = path.join(__dirname, src);
  const destPath = path.join(distDir, dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`   ✓ ${dest}`);
  }
});

console.log('[3/5] Scripts d\'installation déjà créés ✓');

console.log('[4/5] Création du README d\'installation...');
const readmePath = path.join(distDir, 'README-INSTALLATION.txt');
const readmeContent = fs.readFileSync(path.join(__dirname, 'README-INSTALLATION.md'), 'utf8');
fs.writeFileSync(readmePath, readmeContent, 'utf8');
console.log('   ✓ README-INSTALLATION.txt créé');

console.log('[5/5] Finalisation...');
console.log('');

console.log('='.repeat(70));
console.log('✅ Build terminé avec succès !');
console.log('='.repeat(70));
console.log('');
console.log('Fichiers créés dans le dossier dist/ :');
console.log('  - renouvellement-scanner.exe (application compilée)');
console.log('  - config.json (configuration - à modifier sur chaque poste)');
console.log('  - install.bat (script d\'installation)');
console.log('  - install-service.ps1 (script PowerShell)');
console.log('  - README-INSTALLATION.txt (guide d\'installation)');
console.log('');
console.log('Pour distribuer sur plusieurs postes :');
console.log('  1. Copier tout le contenu du dossier dist/ sur chaque poste');
console.log('  2. Modifier config.json avec l\'URL de l\'API et le token');
console.log('  3. Exécuter install.bat en tant qu\'administrateur');
console.log('');

