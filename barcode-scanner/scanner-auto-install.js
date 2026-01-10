/**
 * Wrapper d'auto-installation
 * Détecte le premier lancement et installe automatiquement la tâche planifiée
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Chemins
const exePath = process.execPath;
const exeDir = path.dirname(exePath);
const configPath = path.join(exeDir, 'config.json');
const logDir = path.join(exeDir, 'logs');
const taskName = 'RenouvellementQRScanner';

// Logger simple
function log(msg) {
  const timestamp = new Date().toISOString();
  const logFile = path.join(logDir, `install-${new Date().toISOString().split('T')[0]}.log`);
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`);
    console.log(`[${timestamp}] ${msg}`);
  } catch (e) {
    console.log(`[${timestamp}] ${msg}`);
  }
}

// Vérifier si la tâche existe
function isInstalled() {
  try {
    execSync(`schtasks /Query /TN "${taskName}"`, { stdio: 'pipe' });
    return true;
  } catch (e) {
    return false;
  }
}

// Créer config.json par défaut
function createDefaultConfig() {
  if (fs.existsSync(configPath)) {
    log('Config déjà existant');
    return true;
  }

  const defaultConfig = {
    "API_URL": "https://renouvellement-ordonnance.vercel.app",
    "SCANNER_API_TOKEN": "pyc5qTraes0SuNHEuFGZNL0fCOtA3XbK",
    "SCAN_INTERVAL": 100,
    "MIN_LENGTH": 20
  };

  try {
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    log('✅ Config créé : ' + configPath);
    return true;
  } catch (e) {
    log('❌ Erreur création config: ' + e.message);
    return false;
  }
}

// Installer la tâche planifiée
function installTask() {
  try {
    log('Installation de la tâche planifiée...');
    
    // Créer la tâche
    const cmd = `schtasks /Create /TN "${taskName}" /TR "\\"${exePath}\\"" /SC ONLOGON /RL HIGHEST /F /IT`;
    execSync(cmd, { stdio: 'pipe' });
    
    log('✅ Tâche planifiée créée');
    return true;
  } catch (e) {
    log('❌ Erreur installation tâche: ' + e.message);
    return false;
  }
}

// Auto-installation
function autoInstall() {
  log('='.repeat(70));
  log('SCANNER QR - AUTO-INSTALLATION');
  log('='.repeat(70));
  
  // Créer config par défaut
  if (!createDefaultConfig()) {
    log('⚠️ Impossible de créer le config, mais on continue...');
  }

  // Vérifier si déjà installé
  if (isInstalled()) {
    log('✅ Déjà installé - Lancement du scanner');
    return true;
  }

  log('Premier lancement détecté - Installation automatique...');

  // Installer
  if (installTask()) {
    log('✅ Installation réussie !');
    log('   Le scanner démarrera automatiquement à chaque connexion');
    return true;
  } else {
    log('❌ Installation échouée');
    log('   Le scanner fonctionnera mais ne démarrera pas automatiquement');
    return false;
  }
}

// Point d'entrée
try {
  // Auto-installation
  autoInstall();
  
  // Lancer le scanner principal
  log('Démarrage du scanner...');
  require('./scanner');
  
} catch (error) {
  log('ERREUR FATALE: ' + error.message);
  log('Stack: ' + error.stack);
  process.exit(1);
}
