/**
 * Scanner QR avec System Tray Icon intégré
 * Lance automatiquement le hook PowerShell et affiche une icône dans le tray
 */

const SysTray = require('systray2').default;
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Variables globales
let powerShellProcess = null;
let scannerLogger = null;

// Initialiser le logger
try {
  scannerLogger = require('./scanner-logger');
} catch (e) {
  scannerLogger = {
    info: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.log
  };
}

// Icône verte en base64 (PNG 16x16)
const ICON_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAD4SURBVDiNpZOxSsNQFIa/e2/SpKWxFKeCUwcHBx8gCIJDx059AEfxAVxcnBydXFzc3BwcHR0EBwcHQUFBKIJQaJqk93py00gTm+KFH869P+d/OPeYCxGRM+C8bkAQBCilMMYgIojIj9d1A0opRATnHM45RKTW67qBMQYRwVqLtRYRqfW6bgAgImitEZFar+sGxhhE5J+AiNR6XTcYDAaIyI8AETH3t25wdXWF1prpdEqSJMxmM7TWzGYzptMpSZKQJAlZlrHf7wFYr9colUopttvtx/d6vWY8HiMiKKVYLBac+P+/AXB3d8d4PMZai7UWpRSr1YokSUiShCzL2O12H23TNJnP50RR9HnA/2oFQghYJO8QsQAAAABJRU5ErkJggg==';

// Menu du system tray
const menu = {
  icon: ICON_BASE64,
  title: 'Scanner QR',
  tooltip: 'Scanner QR - Renouvellements',
  items: [
    {
      title: 'Statut: En cours...',
      tooltip: 'Statut du scanner',
      checked: false,
      enabled: false
    },
    {
      title: '',
      tooltip: '',
      checked: false,
      enabled: false
    },
    {
      title: 'Redémarrer',
      tooltip: 'Redémarrer le scanner',
      checked: false,
      enabled: true
    },
    {
      title: 'Voir les logs',
      tooltip: 'Ouvrir le dossier des logs',
      checked: false,
      enabled: true
    },
    {
      title: '',
      tooltip: '',
      checked: false,
      enabled: false
    },
    {
      title: 'Quitter',
      tooltip: 'Quitter le scanner',
      checked: false,
      enabled: true
    }
  ]
};

let systray = null;

// Démarrer le hook PowerShell
function startPowerShellHook() {
  if (powerShellProcess) {
    try {
      powerShellProcess.kill();
    } catch (e) {
      scannerLogger.warn(`Erreur arrêt ancien processus: ${e.message}`);
    }
  }

  const psScriptPath = path.join(__dirname, 'keyboard-hook.ps1');
  
  if (!fs.existsSync(psScriptPath)) {
    scannerLogger.error(`keyboard-hook.ps1 introuvable: ${psScriptPath}`);
    return false;
  }

  try {
    scannerLogger.info('Démarrage du hook PowerShell...');
    
    powerShellProcess = spawn('powershell.exe', [
      '-ExecutionPolicy', 'Bypass',
      '-NoProfile',
      '-WindowStyle', 'Hidden',
      '-File', psScriptPath
    ], {
      cwd: __dirname,
      windowsHide: true
    });

    powerShellProcess.stdout.on('data', (data) => {
      scannerLogger.debug(`PS: ${data}`);
    });

    powerShellProcess.stderr.on('data', (data) => {
      scannerLogger.error(`PS Error: ${data}`);
    });

    powerShellProcess.on('exit', (code) => {
      scannerLogger.warn(`Hook PowerShell terminé (code: ${code})`);
      // Redémarrer automatiquement après 3 secondes
      setTimeout(() => {
        scannerLogger.info('Redémarrage automatique du hook...');
        startPowerShellHook();
      }, 3000);
    });

    scannerLogger.info('✅ Hook PowerShell démarré');
    return true;
  } catch (error) {
    scannerLogger.error(`Erreur démarrage hook: ${error.message}`);
    return false;
  }
}

// Ouvrir le dossier des logs
function openLogsFolder() {
  const logsPath = path.join(__dirname, 'logs');
  if (fs.existsSync(logsPath)) {
    require('child_process').exec(`explorer "${logsPath}"`);
  } else {
    scannerLogger.warn('Dossier logs introuvable');
  }
}

// Redémarrer le scanner
function restart() {
  scannerLogger.info('Redémarrage du scanner...');
  if (powerShellProcess) {
    powerShellProcess.kill();
  }
  setTimeout(() => {
    startPowerShellHook();
  }, 1000);
}

// Quitter proprement
function quit() {
  scannerLogger.info('Arrêt du scanner...');
  if (powerShellProcess) {
    powerShellProcess.kill();
  }
  if (systray) {
    systray.kill();
  }
  process.exit(0);
}

// Initialiser le system tray
function initSystemTray() {
  try {
    systray = new SysTray({
      menu: menu,
      debug: false,
      copyDir: false
    });

    systray.onClick(action => {
      if (action.seq_id === 0) {
        // Statut - ne rien faire
      } else if (action.seq_id === 2) {
        // Redémarrer
        restart();
      } else if (action.seq_id === 3) {
        // Voir les logs
        openLogsFolder();
      } else if (action.seq_id === 5) {
        // Quitter
        quit();
      }
    });

    scannerLogger.info('✅ System tray initialisé');
  } catch (error) {
    scannerLogger.error(`Erreur création system tray: ${error.message}`);
  }
}

// Démarrage principal
function main() {
  scannerLogger.info('='.repeat(60));
  scannerLogger.info('Démarrage du Scanner QR avec System Tray');
  scannerLogger.info('='.repeat(60));

  // Initialiser le system tray
  initSystemTray();

  // Démarrer le hook PowerShell
  const hookStarted = startPowerShellHook();
  
  if (hookStarted) {
    scannerLogger.info('🚀 Scanner QR actif avec icône dans le tray');
  } else {
    scannerLogger.error('❌ Échec du démarrage du hook');
  }

  // Démarrer le scanner principal
  require('./scanner');

  // Gérer les signaux de fermeture
  process.on('SIGINT', quit);
  process.on('SIGTERM', quit);
}

// Lancer
main();
