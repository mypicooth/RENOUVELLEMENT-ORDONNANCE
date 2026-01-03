/**
 * Application Electron pour afficher la fenêtre de validation de scan
 * Cette application est lancée comme un processus séparé depuis scanner.js
 * Utilise un fichier HTML intégré au lieu de charger une URL web
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');

let scanWindow = null;

// Récupérer les arguments de la ligne de commande
const args = process.argv.slice(2);
const renewalId = args[0];
const type = args[1];
const apiUrl = args[2] || 'https://renouvellement-ordonnance.vercel.app';
const apiToken = args[3] || '';

if (!renewalId || !type) {
  console.error('Usage: electron electron-app.js <renewalId> <type> [apiUrl] [apiToken]');
  console.error(`Reçu: renewalId=${renewalId}, type=${type}`);
  process.exit(1);
}

console.log('Electron app démarré');
console.log(`  renewalId: ${renewalId}`);
console.log(`  type: ${type}`);
console.log(`  apiUrl: ${apiUrl}`);
console.log(`  apiToken: ${apiToken ? apiToken.substring(0, 10) + '...' : 'non fourni'}`);

// Gérer les erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non capturée dans Electron:');
  console.error(`   Message: ${error.message}`);
  console.error(`   Stack: ${error.stack}`);
  app.quit();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:');
  console.error(`   Raison: ${reason}`);
});

function createWindow() {
  console.log('Création de la fenêtre...');
  try {
    // Créer la fenêtre de scan
    scanWindow = new BrowserWindow({
      width: 500,
      height: 650,
      resizable: false,
      alwaysOnTop: true,
      frame: true,
      title: 'Confirmation de délivrance',
      webPreferences: {
        nodeIntegration: true, // Nécessaire pour require('electron') dans le HTML
        contextIsolation: false, // Nécessaire pour accéder à ipcRenderer depuis le HTML
        webSecurity: false, // Désactiver pour permettre les appels API CORS
      },
      show: true, // Afficher immédiatement
    });
    console.log('Fenêtre créée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la création de la fenêtre:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    app.quit();
    return;
  }

  // Afficher la fenêtre immédiatement
  scanWindow.show();
  scanWindow.focus();
  console.log('Fenêtre affichée');

  // Déterminer le chemin du fichier HTML
  const exeDir = process.pkg ? path.dirname(process.execPath) : __dirname;
  const htmlPath = path.join(exeDir, 'scan-window.html');
  
  console.log(`Chemin du dossier: ${exeDir}`);
  console.log(`Chemin HTML: ${htmlPath}`);
  console.log(`Fichier existe: ${fs.existsSync(htmlPath)}`);
  
  // Vérifier que le fichier existe
  if (!fs.existsSync(htmlPath)) {
    console.error(`❌ Fichier HTML introuvable: ${htmlPath}`);
    // Charger une page d'erreur à la place
    scanWindow.loadURL('data:text/html,<h1 style="color:red;">Erreur</h1><p>Fichier HTML introuvable:</p><p>' + htmlPath + '</p>');
    return;
  }
  
  // Convertir le chemin en URL file:// correctement (gère les espaces et caractères spéciaux)
  const fileUrlObj = pathToFileURL(htmlPath);
  const fileUrl = `${fileUrlObj.href}?renewalId=${encodeURIComponent(renewalId)}&type=${encodeURIComponent(type)}&apiUrl=${encodeURIComponent(apiUrl)}&apiToken=${encodeURIComponent(apiToken)}`;
  
  console.log(`URL complète: ${fileUrl}`);
  console.log('Chargement de l\'URL...');
  
  scanWindow.loadURL(fileUrl).then(() => {
    console.log('✅ URL chargée avec succès');
  }).catch((error) => {
    console.error('❌ Erreur lors du chargement de l\'URL:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    // Charger une page d'erreur
    scanWindow.loadURL('data:text/html,<h1 style="color:red;">Erreur de chargement</h1><p>' + error.message + '</p>');
  });

  // Gérer les erreurs de chargement
  scanWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error(`❌ Erreur chargement fenêtre: ${errorCode} - ${errorDescription}`);
    console.error(`   URL validée: ${validatedURL}`);
    console.error(`   Chemin HTML: ${htmlPath}`);
    console.error(`   URL: ${fileUrl}`);
    console.error(`   Is main frame: ${isMainFrame}`);
    
    // Essayer de charger une page d'erreur simple
    scanWindow.loadURL('data:text/html,<h1>Erreur</h1><p>Impossible de charger le fichier HTML</p><p>Chemin: ' + htmlPath + '</p>');
  });

  // Afficher la fenêtre une fois chargée
  scanWindow.once('ready-to-show', () => {
    scanWindow.show();
    scanWindow.focus();
    scanWindow.moveTop(); // S'assurer que la fenêtre est au premier plan
    scanWindow.setAlwaysOnTop(true, 'screen-saver'); // Forcer au premier plan
  });
  
  // Afficher la fenêtre même si ready-to-show ne se déclenche pas
  setTimeout(() => {
    if (scanWindow && !scanWindow.isVisible()) {
      console.log('Fenêtre non visible après 2 secondes, affichage forcé...');
      scanWindow.show();
      scanWindow.focus();
      scanWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  }, 2000);
  
  // Afficher immédiatement aussi (au cas où)
  setTimeout(() => {
    if (scanWindow) {
      scanWindow.show();
      scanWindow.focus();
    }
  }, 500);

  // Fermer la fenêtre quand elle est fermée
  scanWindow.on('closed', () => {
    scanWindow = null;
    app.quit();
  });

  // Gérer la fermeture de la fenêtre
  scanWindow.on('close', () => {
    app.quit();
  });
}

// Quand Electron est prêt
app.whenReady().then(() => {
  console.log('Electron est prêt, création de la fenêtre...');
  try {
    createWindow();
    console.log('Fenêtre créée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la création de la fenêtre:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch((error) => {
  console.error('❌ Erreur lors du démarrage d\'Electron:');
  console.error(`   Message: ${error.message}`);
  console.error(`   Stack: ${error.stack}`);
  app.quit();
});

// Quitter quand toutes les fenêtres sont fermées
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


