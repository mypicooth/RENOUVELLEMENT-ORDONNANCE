/**
 * Application en arrière-plan pour scanner les QR codes
 * Écoute les scans de code-barres même quand l'application web n'est pas au premier plan
 * 
 * Fonctionnement :
 * - Écoute les frappes clavier (mode HID) pour détecter les scans
 * - Détecte quand un QR code JSON est scanné
 * - Ouvre automatiquement une fenêtre Electron pour confirmer la délivrance
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
let axios, os, loadConfig, child_process, readline;
try {
  if (startupLogger) startupLogger.writeStartupLog('Chargement des modules...');
  axios = require('axios');
  if (startupLogger) startupLogger.writeStartupLog('  ✓ axios chargé');
  os = require('os');
  if (startupLogger) startupLogger.writeStartupLog('  ✓ os chargé');
  child_process = require('child_process');
  if (startupLogger) startupLogger.writeStartupLog('  ✓ child_process chargé');
  readline = require('readline');
  if (startupLogger) startupLogger.writeStartupLog('  ✓ readline chargé');
  // Note: Electron sera lancé comme un processus séparé, pas chargé comme module
  path = require('path');
  fs = require('fs');
  if (startupLogger) startupLogger.writeStartupLog('  ✓ path et fs chargés');
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

let isProcessing = false;
let scanCount = 0;

/**
 * Parse le contenu du QR code (format JSON)
 */
function parseQRCode(content) {
  try {
    if (!content || content.length === 0) {
      logger.warn(`Contenu vide pour le parsing JSON`);
      return null;
    }
    
    // Nettoyer le contenu (enlever les espaces, retours à la ligne, mais garder la structure JSON)
    let cleaned = content.trim();
    // Enlever les retours à la ligne mais garder la structure JSON
    cleaned = cleaned.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ');
    // Enlever les espaces multiples sauf dans les strings JSON
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    logger.info(`Tentative de parsing JSON (${cleaned.length} caractères): ${cleaned.substring(0, 150)}...`);
    
    const data = JSON.parse(cleaned);
    
    logger.info(`QR code parsé avec succès: renewalId=${data.renewalId ? data.renewalId.substring(0, 20) + '...' : 'absent'}, type=${data.type || 'absent'}`);
    
    if (data.renewalId && data.type && ['RENEWAL', 'RENEWAL_END'].includes(data.type)) {
      logger.info(`✅ Structure JSON valide: renewalId présent, type=${data.type}`);
      return data;
    } else {
      logger.warn(`QR code invalide: renewalId=${data.renewalId ? 'présent (' + data.renewalId.substring(0, 20) + '...)' : 'absent'}, type=${data.type || 'absent'}`);
      if (data.type && !['RENEWAL', 'RENEWAL_END'].includes(data.type)) {
        logger.warn(`   Type invalide: "${data.type}" (attendu: RENEWAL ou RENEWAL_END)`);
      }
    }
    return null;
  } catch (error) {
    logger.warn(`❌ Erreur parsing QR code: ${error.message}`);
    logger.warn(`   Contenu reçu (${content.length} caractères): ${content.substring(0, 300)}`);
    if (error.message.includes('JSON')) {
      logger.warn(`   Position probable de l'erreur: caractère ${error.message.match(/\d+/)?.[0] || 'inconnu'}`);
    }
    return null;
  }
}

/**
 * Ouvre la page de scan dans une fenêtre native Electron ou le navigateur
 */
function openScanPage(renewalId, type) {
  try {
    scanCount++;
    const timestamp = new Date().toLocaleTimeString();
    logger.info(`Scan #${scanCount} détecté: ${type} pour ${renewalId.substring(0, 20)}...`);
    
    // Construire l'URL de la page de scan
    const scanUrl = `${CONFIG.API_URL}/scan?renewalId=${encodeURIComponent(renewalId)}&type=${encodeURIComponent(type)}`;
    
    logger.info(`Ouverture de la page de scan: ${scanUrl}`);
    
    // Essayer d'abord Python (plus léger et rapide), puis Electron en fallback
    try {
      // En mode compilé (pkg), utiliser le dossier de l'exécutable
      const exeDir = process.pkg ? path.dirname(process.execPath) : __dirname;
      
      logger.info(`Recherche des outils de fenêtre dans: ${exeDir}`);
      
      // Essayer d'abord Python (plus léger et rapide)
      const pythonScript = path.join(exeDir, 'scan-confirm.py');
      
      if (fs.existsSync(pythonScript)) {
        try {
          logger.info(`Utilisation de Python pour la fenêtre de confirmation`);
          logger.info(`  Script: ${pythonScript}`);
          
          const pythonProcess = child_process.spawn('python', [pythonScript, renewalId, type, CONFIG.API_URL, API_TOKEN || ''], {
            detached: true,
            stdio: 'ignore',
            cwd: exeDir,
            windowsHide: false,
            shell: false
          });
          
          pythonProcess.on('error', (error) => {
            logger.warn(`⚠️  Erreur lancement Python: ${error.message}`);
            logger.warn(`   Fallback vers Electron...`);
          });
          
          pythonProcess.unref();
          logger.info('✅ Fenêtre Python lancée');
          return { success: true, message: 'Fenêtre Python ouverte' };
        } catch (pythonError) {
          logger.warn(`⚠️  Erreur lancement Python: ${pythonError.message}`);
          logger.warn(`   Fallback vers Electron...`);
        }
      } else {
        logger.info(`  scan-confirm.py introuvable, recherche d'Electron...`);
      }
      
      // Fallback: utiliser Electron
      const electronAppPath = path.join(exeDir, 'electron-app.js');
      const electronCliPath = path.join(exeDir, 'node_modules', 'electron', 'cli.js');
      const htmlPath = path.join(exeDir, 'scan-window.html');
      
      logger.info(`  electron-app.js: ${electronAppPath} (${fs.existsSync(electronAppPath) ? 'existe' : 'introuvable'})`);
      logger.info(`  scan-window.html: ${htmlPath} (${fs.existsSync(htmlPath) ? 'existe' : 'introuvable'})`);
      logger.info(`  electron CLI: ${electronCliPath} (${fs.existsSync(electronCliPath) ? 'existe' : 'introuvable'})`);
      
      // Vérifier si Electron est disponible
      if (fs.existsSync(electronAppPath) && fs.existsSync(electronCliPath) && fs.existsSync(htmlPath)) {
        
        // Fallback: utiliser Electron
        const electronExe = path.join(exeDir, 'node_modules', 'electron', 'dist', 'electron.exe');
        
        let electronProcess;
        
        if (fs.existsSync(electronExe)) {
          // Lancer Electron directement avec l'application
          logger.info(`Utilisation de l'exécutable Electron: ${electronExe}`);
          electronProcess = child_process.spawn(electronExe, [electronAppPath, renewalId, type, CONFIG.API_URL, API_TOKEN || ''], {
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe'], // Capturer stdout et stderr pour debug
            cwd: exeDir,
            windowsHide: false,
            shell: false
          });
        } else {
          // Fallback: utiliser node avec le CLI
          logger.warn(`Electron.exe introuvable à ${electronExe}, utilisation du CLI via node`);
          electronProcess = child_process.spawn('node', electronArgs, {
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe'],
            cwd: exeDir,
            windowsHide: false,
            shell: false
          });
        }
        
        // Logger les erreurs Electron si elles se produisent
        electronProcess.stdout.on('data', (data) => {
          const output = data.toString();
          if (output.trim()) {
            logger.debug(`Electron stdout: ${output.trim()}`);
          }
        });
        
        electronProcess.stderr.on('data', (data) => {
          const error = data.toString();
          if (error.trim()) {
            logger.warn(`Electron stderr: ${error.trim()}`);
          }
        });
        
        electronProcess.on('error', (error) => {
          logger.error(`Erreur lancement Electron: ${error.message}`);
          logger.error(`   Stack: ${error.stack}`);
        });
        
        electronProcess.on('exit', (code, signal) => {
          if (code !== 0 && code !== null) {
            logger.warn(`Electron s'est terminé avec le code ${code}`);
          }
        });
        
        // Donner un peu de temps au processus de démarrer avant de le détacher
        setTimeout(() => {
          electronProcess.unref(); // Permettre au processus parent de continuer
        }, 100);
        
        logger.info('✅ Fenêtre native Electron lancée');
        return { success: true, message: 'Fenêtre native ouverte' };
      } else {
        if (!fs.existsSync(electronAppPath)) {
          logger.warn(`⚠️  electron-app.js introuvable à ${electronAppPath}`);
        }
        if (!fs.existsSync(htmlPath)) {
          logger.warn(`⚠️  scan-window.html introuvable à ${htmlPath}`);
        }
        if (!fs.existsSync(electronCliPath)) {
          logger.warn(`⚠️  Electron CLI introuvable à ${electronCliPath}`);
          logger.warn(`   Veuillez vous assurer que Electron est copié dans dist/node_modules/`);
        }
        logger.warn(`   Fallback vers le navigateur...`);
      }
    } catch (electronError) {
      logger.warn(`⚠️  Erreur lancement Electron: ${electronError.message}`);
      logger.warn(`   Stack: ${electronError.stack}`);
      logger.warn(`   Fallback vers le navigateur...`);
    }
    
    // Fallback: ouvrir le navigateur par défaut
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
 * Écoute les frappes clavier pour détecter un scan (mode HID keyboard)
 */
let keyboardBuffer = '';
let keyboardTimeout = null;
const KEYBOARD_TIMEOUT = 100; // 100ms de pause = fin du scan

/**
 * Traite le contenu capturé depuis le clavier
 */
function processKeyboardInput(content) {
  if (!content || content.length < CONFIG.MIN_LENGTH) {
    return;
  }
  
  logger.info(`⌨️  Contenu capturé depuis le clavier (${content.length} caractères): ${content}`);
  
  // Chercher renewalId dans le contenu
  const trimmedContent = content.trim();
  const lowerContent = trimmedContent.toLowerCase();
  const hasRenewalId = lowerContent.includes('renewalid') || trimmedContent.includes('renewalId') || trimmedContent.includes('"renewalId"');
  const hasType = lowerContent.includes('"type"') || lowerContent.includes('"renewal"') || lowerContent.includes('"renewal_end"');
  const hasJsonStart = trimmedContent.includes('{');
  
  if (hasRenewalId || (hasJsonStart && hasType)) {
    logger.info(`📋 Contenu JSON potentiel détecté depuis le clavier, parsing...`);
    
    // Extraire le JSON
    let jsonContent = trimmedContent;
    const jsonStart = trimmedContent.indexOf('{');
    const jsonEnd = trimmedContent.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonContent = trimmedContent.substring(jsonStart, jsonEnd + 1);
      logger.info(`   JSON extrait: ${jsonContent}`);
    }
    
    const qrData = parseQRCode(jsonContent);
    
    if (qrData) {
      logger.info(`✅ QR code valide détecté depuis le clavier: renewalId=${qrData.renewalId.substring(0, 20)}..., type=${qrData.type}`);
      isProcessing = true;
      
      // Ouvrir la page de scan dans le navigateur
      openScanPage(qrData.renewalId, qrData.type);
      
      // Réinitialiser après un délai
      setTimeout(() => {
        isProcessing = false;
        keyboardBuffer = '';
        logger.info(`🔄 Prêt pour le prochain scan`);
      }, 2000);
    } else {
      logger.warn(`❌ Contenu JSON détecté mais invalide ou format incorrect`);
    }
  } else {
    logger.debug(`Contenu clavier ne contient pas de JSON valide, ignoré`);
  }
}

/**
 * Initialise l'écoute du clavier (mode HID)
 * Note: Nécessite que l'application ait le focus pour fonctionner
 * Les scanners HID envoient les données comme un clavier, donc l'application doit être active
 */
function setupKeyboardListener() {
  try {
    let stdinConfigured = false;
    
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        stdinConfigured = true;
        logger.info(`⌨️  Écoute du clavier activée (mode HID - TTY)`);
        logger.info(`   ⚠️  Important: L'application doit avoir le focus pour détecter les scans`);
      } catch (e) {
        logger.warn(`⚠️  Impossible de configurer stdin en mode raw: ${e.message}`);
      }
    } else {
      // Même si ce n'est pas un TTY, essayer de configurer stdin
      try {
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        stdinConfigured = true;
        logger.info(`⌨️  Écoute du clavier activée (mode HID - non-TTY)`);
        logger.info(`   ⚠️  Important: L'application doit avoir le focus pour détecter les scans`);
      } catch (e) {
        logger.warn(`⚠️  Impossible de configurer stdin: ${e.message}`);
      }
    }
    
    if (stdinConfigured) {
      process.stdin.on('data', (chunk) => {
        const char = chunk.toString();
        
        // Ignorer les caractères de contrôle (sauf Enter)
        if (char === '\r' || char === '\n') {
          // Fin de ligne = fin du scan
          if (keyboardBuffer.length > 0) {
            processKeyboardInput(keyboardBuffer);
            keyboardBuffer = '';
            if (keyboardTimeout) {
              clearTimeout(keyboardTimeout);
              keyboardTimeout = null;
            }
          }
          return;
        }
        
        // Ajouter le caractère au buffer
        keyboardBuffer += char;
        
        // Réinitialiser le timeout
        if (keyboardTimeout) {
          clearTimeout(keyboardTimeout);
        }
        
        // Si pas de frappe pendant KEYBOARD_TIMEOUT ms, traiter le buffer
        keyboardTimeout = setTimeout(() => {
          if (keyboardBuffer.length > 0) {
            processKeyboardInput(keyboardBuffer);
            keyboardBuffer = '';
          }
          keyboardTimeout = null;
        }, KEYBOARD_TIMEOUT);
      });
      
      // Gérer les erreurs de stdin pour éviter que le processus ne plante
      process.stdin.on('error', (error) => {
        logger.warn(`⚠️  Erreur stdin: ${error.message}`);
      });
      
      logger.info(`✅ Écoute du clavier configurée`);
    } else {
      logger.warn(`⚠️  Écoute du clavier désactivée (stdin n'est pas disponible)`);
      logger.error(`❌ Le scanner ne peut pas fonctionner sans accès au clavier`);
      logger.error(`   Veuillez exécuter le scanner dans un environnement avec accès stdin`);
    }
  } catch (error) {
    logger.error(`❌ Erreur configuration écoute clavier: ${error.message}`);
    logger.error(`   Stack: ${error.stack}`);
    logger.error(`   Le scanner ne peut pas fonctionner sans écoute du clavier`);
  }
}

/**
 * Simule un scan (utile pour tester sans scanner physique)
 * @param {string} renewalId - ID du renouvellement
 * @param {string} type - Type de scan (RENEWAL ou RENEWAL_END)
 */
function simulateScan(renewalId, type) {
  if (!renewalId || !type) {
    logger.error('❌ Paramètres manquants pour la simulation');
    logger.error('   Usage: simulateScan(renewalId, type)');
    logger.error('   Exemple: simulateScan("cmjsk4p1q0003ghqlh7i9t8m9", "RENEWAL")');
    return;
  }
  
  if (!['RENEWAL', 'RENEWAL_END'].includes(type)) {
    logger.error(`❌ Type invalide: ${type}. Doit être RENEWAL ou RENEWAL_END`);
    return;
  }
  
  logger.info('='.repeat(70));
  logger.info('  🧪 SIMULATION DE SCAN');
  logger.info('='.repeat(70));
  logger.info(`  RenewalId: ${renewalId}`);
  logger.info(`  Type: ${type}`);
  logger.info('='.repeat(70));
  logger.info('');
  
  // Traiter le scan comme s'il venait du clavier
  const qrData = {
    renewalId: renewalId,
    type: type
  };
  
  logger.info(`✅ Scan simulé détecté: renewalId=${qrData.renewalId.substring(0, 20)}..., type=${qrData.type}`);
  isProcessing = true;
  
  // Ouvrir la page de scan
  const result = openScanPage(qrData.renewalId, qrData.type);
  
  // Réinitialiser après un délai
  setTimeout(() => {
    isProcessing = false;
    logger.info(`🔄 Prêt pour le prochain scan`);
  }, 2000);
  
  return result;
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

  logger.info(`✅ Scanner démarré - Mode HID (simulation clavier)`);
  logger.info(`⌨️  Écoute du clavier activée`);

  // Configurer l'écoute du clavier (mode HID)
  setupKeyboardListener();

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
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info(`Arrêt du scanner (${scanCount} scan(s) traité(s))`);
    process.exit(0);
  });
}

// Vérifier que nous sommes sur Windows
if (os.platform() !== 'win32') {
  logger.error('⚠️  Cette application est conçue pour Windows uniquement.');
  logger.error('   Le scanner HID fonctionne mieux sur Windows.');
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


