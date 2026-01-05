/**
 * Wrapper minimal pour capturer toutes les erreurs au démarrage
 */

// Écrire immédiatement dans un fichier de log de démarrage
const fs = require('fs');
const path = require('path');
const os = require('os');

const isCompiled = process.pkg !== undefined;
const logDir = isCompiled
  ? path.join(path.dirname(process.execPath), 'logs')
  : path.join(__dirname, 'logs');

// Créer le dossier logs
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
} catch (e) {
  // Ignorer
}

const startupLog = path.join(logDir, `startup-${new Date().toISOString().split('T')[0]}.log`);

function log(message) {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(startupLog, `[${timestamp}] ${message}\n`, 'utf8');
  } catch (e) {
    // Essayer le dossier temporaire
    try {
      const tempLog = path.join(os.tmpdir(), 'renouvellement-scanner-startup.log');
      fs.appendFileSync(tempLog, `${new Date().toISOString()} - ${message}\n`, 'utf8');
    } catch (err) {
      // Ignorer
    }
  }
}

log('=== Démarrage ===');
log(`Node: ${process.version}`);
log(`Platform: ${os.platform()}`);
log(`Executable: ${process.execPath}`);
log(`Working dir: ${process.cwd()}`);

// Capturer toutes les erreurs
process.on('uncaughtException', (error) => {
  log(`ERREUR FATALE: ${error.message}`);
  log(`Stack: ${error.stack}`);
  setTimeout(() => process.exit(1), 2000);
});

process.on('unhandledRejection', (reason) => {
  log(`PROMESSE REJETÉE: ${reason}`);
  if (reason && reason.stack) {
    log(`Stack: ${reason.stack}`);
  }
});

// Charger le module principal
try {
  log('Chargement du module scanner.js...');
  require('./scanner.js');
  log('Module chargé avec succès');
} catch (error) {
  log(`ERREUR chargement module: ${error.message}`);
  log(`Stack: ${error.stack}`);
  setTimeout(() => process.exit(1), 5000);
}



