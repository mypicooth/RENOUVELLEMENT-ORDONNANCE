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

// Créer le dossier logs s'il n'existe pas (nécessaire pour pkg)
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('   ✓ Dossier logs créé');
}

console.log('[1/5] Compilation de l\'application...');

// Arrêter le service et les instances en cours avant compilation
try {
  console.log('Vérification des instances en cours...');
  execSync('net stop RenouvellementQRScanner', { stdio: 'ignore', cwd: __dirname });
  execSync('timeout /t 2 /nobreak', { stdio: 'ignore', cwd: __dirname });
} catch (e) {
  // Ignorer si le service n'existe pas ou n'est pas démarré
}

try {
  execSync('taskkill /F /IM renouvellement-scanner.exe', { stdio: 'ignore', cwd: __dirname });
  execSync('timeout /t 1 /nobreak', { stdio: 'ignore', cwd: __dirname });
} catch (e) {
  // Ignorer si aucune instance n'est en cours
}

try {
  execSync('pkg . --targets node18-win-x64 --output dist/renouvellement-scanner.exe', {
    stdio: 'inherit',
    cwd: __dirname
  });
  console.log('✅ Compilation réussie\n');
} catch (error) {
  console.error('❌ Erreur lors de la compilation');
  console.error('💡 Astuce: Assurez-vous que le service est arrêté et qu\'aucune instance de renouvellement-scanner.exe n\'est en cours d\'exécution');
  process.exit(1);
}

console.log('[2/5] Copie des fichiers de configuration...');

// Copier electron-app.js, scan-window.html et scan-confirm.py dans dist
try {
  fs.copyFileSync(
    path.join(__dirname, 'electron-app.js'),
    path.join(distDir, 'electron-app.js')
  );
  console.log('   ✓ electron-app.js copié');
} catch (error) {
  console.warn(`   ⚠️  Erreur copie electron-app.js: ${error.message}`);
}

try {
  fs.copyFileSync(
    path.join(__dirname, 'scan-window.html'),
    path.join(distDir, 'scan-window.html')
  );
  console.log('   ✓ scan-window.html copié');
} catch (error) {
  console.warn(`   ⚠️  Erreur copie scan-window.html: ${error.message}`);
}

try {
  fs.copyFileSync(
    path.join(__dirname, 'scan-confirm.py'),
    path.join(distDir, 'scan-confirm.py')
  );
  console.log('   ✓ scan-confirm.py copié');
} catch (error) {
  console.warn(`   ⚠️  Erreur copie scan-confirm.py: ${error.message}`);
}

// Copier Electron dans dist (nécessaire pour la fenêtre native)
console.log('[2b/5] Copie d\'Electron pour la fenêtre native...');
try {
  const electronSource = path.join(__dirname, 'node_modules', 'electron');
  const electronDest = path.join(distDir, 'node_modules', 'electron');
  
  if (fs.existsSync(electronSource)) {
    // Créer le dossier de destination
    const electronDestDir = path.dirname(electronDest);
    if (!fs.existsSync(electronDestDir)) {
      fs.mkdirSync(electronDestDir, { recursive: true });
    }
    
    // Copier récursivement le dossier Electron
    const copyRecursiveSync = (src, dest) => {
      const exists = fs.existsSync(src);
      const stats = exists && fs.statSync(src);
      const isDirectory = exists && stats.isDirectory();
      if (isDirectory) {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest);
        }
        fs.readdirSync(src).forEach(childItemName => {
          copyRecursiveSync(
            path.join(src, childItemName),
            path.join(dest, childItemName)
          );
        });
      } else {
        fs.copyFileSync(src, dest);
      }
    };
    
    if (fs.existsSync(electronDest)) {
      // Supprimer l'ancien dossier s'il existe
      fs.rmSync(electronDest, { recursive: true, force: true });
    }
    
    copyRecursiveSync(electronSource, electronDest);
    console.log('   ✓ Electron copié dans dist/node_modules/');
  } else {
    console.warn(`   ⚠️  Electron non trouvé dans ${electronSource}`);
    console.warn(`   Veuillez exécuter: npm install`);
  }
} catch (error) {
  console.warn(`   ⚠️  Erreur copie Electron: ${error.message}`);
  console.warn(`   La fenêtre native ne fonctionnera pas, fallback vers le navigateur`);
}


const filesToCopy = [
  { src: 'config.json', dest: 'config.json' },
  { src: 'install-service-standalone.ps1', dest: 'install-service.ps1' },
  { src: 'install-service.bat', dest: 'install-service.bat' },
  { src: 'install.bat', dest: 'install.bat' },
  { src: 'check-service.bat', dest: 'check-service.bat' },
  { src: 'restart-service.bat', dest: 'restart-service.bat' },
  { src: 'test-service.bat', dest: 'test-service.bat' },
  { src: 'diagnostic-service.bat', dest: 'diagnostic-service.bat' },
  { src: 'test-exe.bat', dest: 'test-exe.bat' },
  { src: 'test-scan.bat', dest: 'test-scan.bat' },
  { src: 'install-startup.bat', dest: 'install-startup.bat' },
  { src: 'stop-and-rebuild.bat', dest: 'stop-and-rebuild.bat' },
  { src: 'simulate-scan.js', dest: 'simulate-scan.js' },
  { src: 'simulate-scan.bat', dest: 'simulate-scan.bat' },
  { src: 'scan-confirm.py', dest: 'scan-confirm.py' },
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
    echo   2. Clic droit sur install-service.bat
    echo   3. Selectionner "Exécuter en tant qu'administrateur"
    echo.
    pause
    exit /b 1
)
echo.
echo Lancement de l'installation...
call "%~dp0install-service.bat"
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

