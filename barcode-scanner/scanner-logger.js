/**
 * Système de logging pour le service Windows
 * Écrit les logs dans un fichier et dans la console si disponible
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Chemin du fichier de log
const isCompiled = process.pkg !== undefined;
const logDir = isCompiled
  ? path.join(path.dirname(process.execPath), 'logs')
  : path.join(__dirname, 'logs');

const logFile = path.join(logDir, `scanner-${new Date().toISOString().split('T')[0]}.log`);

// Créer le dossier logs s'il n'existe pas
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
} catch (error) {
  // Si on ne peut pas créer le dossier, utiliser le dossier temporaire
  try {
    const tempLogDir = path.join(os.tmpdir(), 'renouvellement-scanner-logs');
    if (!fs.existsSync(tempLogDir)) {
      fs.mkdirSync(tempLogDir, { recursive: true });
    }
    logDir = tempLogDir;
    logFile = path.join(logDir, `scanner-${new Date().toISOString().split('T')[0]}.log`);
  } catch (err) {
    // Dernier recours : utiliser le dossier de l'exe
    try {
      const exeDir = isCompiled ? path.dirname(process.execPath) : __dirname;
      logFile = path.join(exeDir, `scanner-${new Date().toISOString().split('T')[0]}.log`);
    } catch (e) {
      // Ignorer complètement si on ne peut rien faire
    }
  }
}

/**
 * Écrit un message dans le log
 */
function writeLog(level, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  
  // Écrire dans la console si disponible (mode développement ou exécution manuelle)
  try {
    if (process.stdout && !process.stdout.destroyed) {
      console.log(logMessage.trim());
    }
  } catch (error) {
    // Ignorer si pas de console
  }
  
  // Écrire dans le fichier de log
  try {
    if (logFile) {
      fs.appendFileSync(logFile, logMessage, 'utf8');
    }
  } catch (error) {
    // Si on ne peut pas écrire dans le fichier, essayer d'écrire dans un fichier temporaire
    try {
      const tempLog = path.join(os.tmpdir(), 'renouvellement-scanner.log');
      fs.appendFileSync(tempLog, logMessage, 'utf8');
    } catch (err) {
      // Dernier recours : essayer le dossier de l'exe
      try {
        const exeDir = isCompiled ? path.dirname(process.execPath) : __dirname;
        const fallbackLog = path.join(exeDir, 'scanner-error.log');
        fs.appendFileSync(fallbackLog, logMessage, 'utf8');
      } catch (e) {
        // Ignorer complètement si on ne peut rien faire
      }
    }
  }
}

const logger = {
  info: (message) => writeLog('INFO', message),
  error: (message) => writeLog('ERROR', message),
  warn: (message) => writeLog('WARN', message),
  debug: (message) => writeLog('DEBUG', message),
};

module.exports = logger;

