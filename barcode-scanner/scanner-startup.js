/**
 * Script de démarrage avec gestion d'erreurs complète
 * Ce fichier est chargé en premier pour capturer toutes les erreurs
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Créer un log de démarrage immédiatement
const isCompiled = process.pkg !== undefined;
const startupLogDir = isCompiled
  ? path.join(path.dirname(process.execPath), 'logs')
  : path.join(__dirname, 'logs');

const startupLogFile = path.join(
  startupLogDir,
  `startup-${new Date().toISOString().split('T')[0]}.log`
);

// Fonction pour écrire dans le log de démarrage
function writeStartupLog(message) {
  try {
    // Créer le dossier si nécessaire
    if (!fs.existsSync(startupLogDir)) {
      fs.mkdirSync(startupLogDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(startupLogFile, logMessage, 'utf8');
  } catch (error) {
    // Si on ne peut pas écrire dans le dossier logs, essayer le dossier de l'exe
    try {
      const exeDir = isCompiled ? path.dirname(process.execPath) : __dirname;
      const fallbackLog = path.join(exeDir, 'startup-error.log');
      const timestamp = new Date().toISOString();
      fs.appendFileSync(fallbackLog, `[${timestamp}] ${message}\n`, 'utf8');
    } catch (e) {
      // Dernier recours : dossier temporaire
      try {
        const tempLog = path.join(os.tmpdir(), 'renouvellement-scanner-startup.log');
        const timestamp = new Date().toISOString();
        fs.appendFileSync(tempLog, `[${timestamp}] ${message}\n`, 'utf8');
      } catch (err) {
        // Ignorer
      }
    }
  }
}

// Capturer toutes les erreurs non gérées AVANT le chargement des autres modules
process.on('uncaughtException', (error) => {
  writeStartupLog(`ERREUR FATALE: ${error.message}`);
  writeStartupLog(`Stack: ${error.stack}`);
  // Attendre un peu pour que le log soit écrit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  writeStartupLog(`PROMESSE REJETÉE: ${reason}`);
  if (reason && reason.stack) {
    writeStartupLog(`Stack: ${reason.stack}`);
  }
});

// Écrire le début du démarrage
writeStartupLog('=== Démarrage de l\'application ===');
writeStartupLog(`Node version: ${process.version}`);
writeStartupLog(`Platform: ${os.platform()}`);
writeStartupLog(`Architecture: ${os.arch()}`);
writeStartupLog(`Executable path: ${process.execPath}`);
writeStartupLog(`Working directory: ${process.cwd()}`);

// Exporter la fonction pour qu'elle soit utilisable ailleurs
module.exports = { writeStartupLog, startupLogFile };


