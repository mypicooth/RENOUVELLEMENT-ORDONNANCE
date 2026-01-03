/**
 * Application en arrière-plan pour scanner les QR codes
 * Écoute les scans de code-barres même quand l'application web n'est pas au premier plan
 * 
 * Fonctionnement :
 * - Surveille le presse-papiers (clipboard) en continu
 * - Détecte quand un QR code JSON est copié
 * - Envoie automatiquement le scan à l'API
 */

// Charger le système de logging de démarrage en premier
let startupLogger;
try {
  startupLogger = require('./scanner-startup');
  startupLogger.writeStartupLog('Chargement du module principal...');
} catch (error) {
  // Si on ne peut pas charger le startup logger, essayer d'écrire directement
  try {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const logFile = path.join(os.tmpdir(), 'renouvellement-scanner-startup-error.log');
    fs.appendFileSync(logFile, `${new Date().toISOString()} - Erreur chargement startup logger: ${error.message}\n`, 'utf8');
  } catch (e) {
    // Ignorer
  }
}

// Charger le logger en premier pour capturer toutes les erreurs
let logger;
try {
  logger = require('./scanner-logger');
} catch (error) {
  // Logger de secours si le module ne peut pas être chargé
  logger = {
    info: (msg) => { try { console.log(msg); } catch(e) {} },
    error: (msg) => { try { console.error(msg); } catch(e) {} },
    warn: (msg) => { try { console.warn(msg); } catch(e) {} },
    debug: (msg) => { try { console.log(msg); } catch(e) {} },
  };
  // Écrire dans un fichier de secours
  try {
    const fs = require('fs');
    const path = require('path');
    const logFile = path.join(process.cwd(), 'scanner-error.log');
    const writeError = (msg) => {
      try {
        fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`, 'utf8');
      } catch(e) {}
    };
    writeError(`Erreur chargement logger: ${error.message}`);
  } catch(e) {}
}

// Charger les autres modules avec gestion d'erreurs
let axios, clipboardy, os, loadConfig, child_process;
try {
  if (startupLogger) startupLogger.writeStartupLog('Chargement des modules...');
  axios = require('axios');
  if (startupLogger) startupLogger.writeStartupLog('  ✓ axios chargé');
  clipboardy = require('clipboardy');
  if (startupLogger) startupLogger.writeStartupLog('  ✓ clipboardy chargé');
  os = require('os');
  if (startupLogger) startupLogger.writeStartupLog('  ✓ os chargé');
  child_process = require('child_process');
  if (startupLogger) startupLogger.writeStartupLog('  ✓ child_process chargé');
  const scannerConfig = require('./scanner-config');
  loadConfig = scannerConfig.loadConfig;
  if (startupLogger) startupLogger.writeStartupLog('  ✓ scanner-config chargé');
  logger.info('Modules chargés avec succès');
  if (startupLogger) startupLogger.writeStartupLog('Tous les modules chargés avec succès');
} catch (error) {
  const errorMsg = `Erreur chargement modules: ${error.message}`;
  const stackMsg = `Stack: ${error.stack}`;
  if (startupLogger) {
    startupLogger.writeStartupLog(`ERREUR: ${errorMsg}`);
    startupLogger.writeStartupLog(stackMsg);
  }
  logger.error(errorMsg);
  logger.error(stackMsg);
  // Attendre 5 secondes pour que l'utilisateur voie l'erreur
  setTimeout(() => {
    process.exit(1);
  }, 5000);
  throw error;
}

// Charger la configuration avec gestion d'erreurs
let CONFIG, API_TOKEN;
try {
  logger.info('Chargement de la configuration...');
  CONFIG = loadConfig();
  API_TOKEN = CONFIG.SCANNER_API_TOKEN || '';
  logger.info('Configuration chargée avec succès');
} catch (error) {
  logger.error(`Erreur chargement configuration: ${error.message}`);
  logger.error(`Stack: ${error.stack}`);
  // Utiliser des valeurs par défaut
  CONFIG = {
    API_URL: process.env.API_URL || 'http://localhost:3000',
    SCANNER_API_TOKEN: '',
    SCAN_INTERVAL: 100,
    MIN_LENGTH: 20,
  };
  API_TOKEN = '';
  logger.warn('Utilisation des valeurs par défaut');
}

let lastClipboardContent = '';
let isProcessing = false;
let scanCount = 0;

/**
 * Parse le contenu du QR code (format JSON)
 */
function parseQRCode(content) {
  try {
    // Nettoyer le contenu (enlever les espaces, retours à la ligne)
    const cleaned = content.trim().replace(/\s+/g, '');
    const data = JSON.parse(cleaned);
    
    if (data.renewalId && data.type && ['RENEWAL', 'RENEWAL_END'].includes(data.type)) {
      return data;
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Ouvre la page de scan dans le navigateur
 */
function openScanPage(renewalId, type) {
  try {
    scanCount++;
    const timestamp = new Date().toLocaleTimeString();
    logger.info(`Scan #${scanCount} détecté: ${type} pour ${renewalId.substring(0, 20)}...`);
    
    // Construire l'URL de la page de scan
    const scanUrl = `${CONFIG.API_URL}/scan?renewalId=${encodeURIComponent(renewalId)}&type=${encodeURIComponent(type)}`;
    
    logger.info(`Ouverture de la page de scan: ${scanUrl}`);
    
    // Ouvrir le navigateur par défaut
    const platform = os.platform();
    let command;
    
    if (platform === 'win32') {
      // Windows
      command = `start "" "${scanUrl}"`;
      child_process.exec(command, (error) => {
        if (error) {
          logger.error(`Erreur ouverture navigateur: ${error.message}`);
        } else {
          logger.info('✅ Page de scan ouverte dans le navigateur');
        }
      });
    } else if (platform === 'darwin') {
      // macOS
      command = `open "${scanUrl}"`;
      child_process.exec(command, (error) => {
        if (error) {
          logger.error(`Erreur ouverture navigateur: ${error.message}`);
        } else {
          logger.info('✅ Page de scan ouverte dans le navigateur');
        }
      });
    } else {
      // Linux et autres
      command = `xdg-open "${scanUrl}"`;
      child_process.exec(command, (error) => {
        if (error) {
          logger.error(`Erreur ouverture navigateur: ${error.message}`);
        } else {
          logger.info('✅ Page de scan ouverte dans le navigateur');
        }
      });
    }
    
    return { success: true, message: 'Page de scan ouverte' };
  } catch (error) {
    logger.error(`❌ Erreur ouverture page de scan: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Vérifie le clipboard pour détecter un nouveau scan
 */
async function checkClipboard() {
  if (isProcessing) return;

  try {
    // Essayer de lire le clipboard avec un timeout
    let currentContent;
    try {
      currentContent = clipboardy.readSync();
    } catch (clipboardError) {
      // Si le clipboard n'est pas accessible (normal en mode service au démarrage)
      // Attendre un peu et réessayer
      if (clipboardError.message && (
        clipboardError.message.includes('clipboard') || 
        clipboardError.message.includes('EBUSY') ||
        clipboardError.message.includes('access')
      )) {
        // Erreur normale, ignorer
        return;
      }
      throw clipboardError;
    }
    
    // Détecter un changement significatif (nouveau scan)
    if (currentContent !== lastClipboardContent && 
        currentContent.length >= CONFIG.MIN_LENGTH &&
        currentContent.trim().startsWith('{')) {
      
      const qrData = parseQRCode(currentContent);
      
      if (qrData) {
        isProcessing = true;
        lastClipboardContent = currentContent;
        
        // Ouvrir la page de scan dans le navigateur
        const result = openScanPage(qrData.renewalId, qrData.type);
        
        // Réinitialiser après un délai pour éviter les scans multiples
        setTimeout(() => {
          isProcessing = false;
          // Réinitialiser le clipboard après traitement pour détecter le prochain scan
          lastClipboardContent = '';
        }, 2000);
      }
    }
  } catch (error) {
    // Ignorer les erreurs de lecture du clipboard (fichier verrouillé, etc.)
    if (error.message && (
      error.message.includes('clipboard') || 
      error.message.includes('EBUSY') ||
      error.message.includes('access')
    )) {
      // Erreur normale, ignorer silencieusement
      return;
    }
    logger.error(`Erreur lecture clipboard: ${error.message}`);
  }
}

/**
 * Fonction principale
 */
function start() {
  try {
    logger.info('='.repeat(70));
    logger.info('  Scanner de QR codes en arrière-plan');
    logger.info('='.repeat(70));
    logger.info(`  API URL: ${CONFIG.API_URL}`);
    logger.info(`  Intervalle de vérification: ${CONFIG.SCAN_INTERVAL}ms`);
    if (API_TOKEN) {
      logger.info(`  Token API: ${API_TOKEN.substring(0, 10)}... (configuré)`);
      logger.info(`  Mode: Authentifié (scan-public)`);
    } else {
      logger.warn('  Token API non configuré');
      logger.info(`  Mode: Session web requise (scan)`);
      logger.info(`  💡 Configurez le token dans config.json`);
    }
    logger.info('');
    logger.info('  En écoute... (Appuyez sur Ctrl+C pour arrêter)');
    logger.info('='.repeat(70));
    logger.info('');
  } catch (error) {
    logger.error(`Erreur lors de l'initialisation: ${error.message}`);
    throw error;
  }

  // Vérifier le clipboard périodiquement
  const interval = setInterval(() => {
    try {
      checkClipboard();
    } catch (error) {
      console.error('Erreur dans checkClipboard:', error.message);
      // Continuer à fonctionner même en cas d'erreur
    }
  }, CONFIG.SCAN_INTERVAL);

  // Vérifier immédiatement
  try {
    checkClipboard();
  } catch (error) {
    console.error('Erreur lors de la vérification initiale:', error.message);
  }

  // Gestion des erreurs non capturées pour éviter que le service ne plante
  process.on('uncaughtException', (error) => {
    logger.error(`Erreur non capturée: ${error.message}`);
    logger.error(`Stack: ${error.stack}`);
    // Ne pas quitter, continuer à fonctionner
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Promesse rejetée non gérée: ${reason}`);
    // Ne pas quitter, continuer à fonctionner
  });

  // Gestion de l'arrêt propre
  process.on('SIGINT', () => {
    logger.info('\n');
    logger.info('='.repeat(70));
    logger.info(`  Arrêt du scanner (${scanCount} scan(s) traité(s))`);
    logger.info('='.repeat(70));
    clearInterval(interval);
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info(`Arrêt du scanner (${scanCount} scan(s) traité(s))`);
    clearInterval(interval);
    process.exit(0);
  });
}

// Vérifier que nous sommes sur Windows
if (os.platform() !== 'win32') {
  logger.error('⚠️  Cette application est conçue pour Windows uniquement.');
  logger.error('   Le scanner de clipboard fonctionne mieux sur Windows.');
  process.exit(1);
}

// Gestion des erreurs de démarrage pour le service Windows
try {
  if (startupLogger) startupLogger.writeStartupLog('Appel de la fonction start()...');
  logger.info('Démarrage de l\'application...');
  // Démarrer
  start();
  logger.info('Application démarrée avec succès');
  if (startupLogger) startupLogger.writeStartupLog('Application démarrée avec succès');
} catch (error) {
  const errorMsg = `❌ Erreur fatale au démarrage: ${error.message}`;
  const stackMsg = `Stack: ${error.stack}`;
  if (startupLogger) {
    startupLogger.writeStartupLog(`ERREUR FATALE: ${errorMsg}`);
    startupLogger.writeStartupLog(stackMsg);
  }
  logger.error(errorMsg);
  logger.error(stackMsg);
  
  // Si on est en mode console (pas service), attendre pour voir l'erreur
  const isService = !process.stdin || process.stdin.isTTY === false;
  const waitTime = isService ? 2000 : 10000; // Attendre plus longtemps en mode console
  
  // Attendre avant de quitter pour que les logs soient écrits
  setTimeout(() => {
    if (startupLogger) startupLogger.writeStartupLog('Arrêt de l\'application suite à une erreur');
    process.exit(1);
  }, waitTime);
}


