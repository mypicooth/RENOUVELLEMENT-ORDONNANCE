/**
 * Script pour simuler un scan de QR code
 * Usage: node simulate-scan.js <renewalId> <type>
 * Exemple: node simulate-scan.js cmjsk4p1q0003ghqlh7i9t8m9 RENEWAL
 */

const path = require('path');
const fs = require('fs');
const child_process = require('child_process');

// Récupérer les arguments
const args = process.argv.slice(2);
const renewalId = args[0];
const type = args[1];

if (!renewalId || !type) {
  console.error('Usage: node simulate-scan.js <renewalId> <type>');
  console.error('');
  console.error('Exemples:');
  console.error('  node simulate-scan.js cmjsk4p1q0003ghqlh7i9t8m9 RENEWAL');
  console.error('  node simulate-scan.js cmjsk4p1q0003ghqlh7i9t8m9 RENEWAL_END');
  process.exit(1);
}

if (!['RENEWAL', 'RENEWAL_END'].includes(type)) {
  console.error(`Erreur: Type invalide "${type}". Doit être RENEWAL ou RENEWAL_END`);
  process.exit(1);
}

// Charger la configuration
let CONFIG, API_TOKEN;
try {
  const scannerConfig = require('./scanner-config');
  CONFIG = scannerConfig.loadConfig();
  API_TOKEN = CONFIG.SCANNER_API_TOKEN || '';
} catch (error) {
  console.error(`Erreur chargement configuration: ${error.message}`);
  process.exit(1);
}

console.log('='.repeat(70));
console.log('  🧪 SIMULATION DE SCAN');
console.log('='.repeat(70));
console.log(`  RenewalId: ${renewalId}`);
console.log(`  Type: ${type}`);
console.log(`  API URL: ${CONFIG.API_URL}`);
console.log('='.repeat(70));
console.log('');

// Utiliser la même logique que dans scanner.js pour ouvrir Electron
const exeDir = __dirname;
const electronAppPath = path.join(exeDir, 'electron-app.js');
const electronExe = path.join(exeDir, 'node_modules', 'electron', 'dist', 'electron.exe');
const electronCliPath = path.join(exeDir, 'node_modules', 'electron', 'cli.js');

let electronProcess;

// Vérifier que les fichiers nécessaires existent
const htmlPath = path.join(exeDir, 'scan-window.html');
console.log('Vérification des fichiers...');
console.log(`  electron-app.js: ${electronAppPath} (${fs.existsSync(electronAppPath) ? '✓' : '✗'})`);
console.log(`  scan-window.html: ${htmlPath} (${fs.existsSync(htmlPath) ? '✓' : '✗'})`);
console.log(`  electron.exe: ${electronExe} (${fs.existsSync(electronExe) ? '✓' : '✗'})`);
console.log('');

if (!fs.existsSync(electronAppPath)) {
  console.error(`❌ electron-app.js introuvable à: ${electronAppPath}`);
  process.exit(1);
}

if (!fs.existsSync(htmlPath)) {
  console.error(`❌ scan-window.html introuvable à: ${htmlPath}`);
  process.exit(1);
}

if (fs.existsSync(electronExe)) {
  console.log('✅ Ouverture de la fenêtre Electron...');
  console.log(`   Commande: ${electronExe} ${electronAppPath} ${renewalId} ${type} ${CONFIG.API_URL}`);
  console.log('');
  
  electronProcess = child_process.spawn(electronExe, [electronAppPath, renewalId, type, CONFIG.API_URL, API_TOKEN || ''], {
    detached: false, // Ne pas détacher pour capturer toutes les erreurs
    stdio: 'inherit', // Afficher directement dans la console
    cwd: exeDir,
    windowsHide: false,
    shell: false
  });
  
  // Capturer les erreurs de lancement
  electronProcess.on('error', (error) => {
    console.error(`❌ Erreur lancement Electron: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    console.error(`   Stack: ${error.stack}`);
    process.exit(1);
  });
  
  electronProcess.on('error', (error) => {
    console.error(`❌ Erreur lancement Electron: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    process.exit(1);
  });
  
  electronProcess.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(`❌ Electron s'est terminé avec le code ${code}`);
      console.error(`   Signal: ${signal}`);
      console.error('');
      console.error('Causes possibles:');
      console.error('   - Erreur dans electron-app.js');
      console.error('   - Fichier scan-window.html introuvable ou invalide');
      console.error('   - Problème de permissions');
      process.exit(code);
    } else {
      console.log('✅ Fenêtre Electron fermée normalement');
    }
  });
  
  console.log('✅ Processus Electron lancé');
  console.log('   La fenêtre devrait s\'ouvrir maintenant...');
  console.log('');
  console.log('Appuyez sur Ctrl+C pour quitter');
  console.log('');
  
} else if (fs.existsSync(electronCliPath)) {
  console.log('⚠️  Electron.exe introuvable, utilisation du CLI via node...');
  const electronArgs = [
    electronCliPath,
    electronAppPath,
    renewalId,
    type,
    CONFIG.API_URL,
    API_TOKEN || ''
  ];
  
  electronProcess = child_process.spawn('node', electronArgs, {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: exeDir,
    windowsHide: false,
    shell: false
  });
  
  electronProcess.unref();
  console.log('✅ Fenêtre Electron lancée');
} else {
  console.error('❌ Electron introuvable');
  console.error(`   Cherché à: ${electronExe}`);
  console.error(`   Ou à: ${electronCliPath}`);
  console.error('');
  console.error('Veuillez exécuter: npm install');
  process.exit(1);
}

