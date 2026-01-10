const { app, BrowserWindow } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');

console.log('=== Electron Simple Test ===');
console.log('Arguments:', process.argv);

const args = process.argv.slice(2);
const renewalId = args[0] || 'test123';
const type = args[1] || 'RENEWAL';

console.log(`renewalId: ${renewalId}`);
console.log(`type: ${type}`);

app.whenReady().then(() => {
  console.log('Electron est prêt');
  
  const win = new BrowserWindow({
    width: 500,
    height: 650,
    show: true, // Afficher immédiatement
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });
  
  const htmlPath = path.join(__dirname, 'scan-window.html');
  console.log(`Chemin HTML: ${htmlPath}`);
  console.log(`Fichier existe: ${fs.existsSync(htmlPath)}`);
  
  if (fs.existsSync(htmlPath)) {
    const fileUrl = pathToFileURL(htmlPath);
    const url = `${fileUrl.href}?renewalId=${encodeURIComponent(renewalId)}&type=${encodeURIComponent(type)}`;
    console.log(`Chargement: ${url}`);
    win.loadURL(url);
  } else {
    win.loadURL('data:text/html,<h1>Test</h1><p>Fichier HTML introuvable</p>');
  }
  
  win.once('ready-to-show', () => {
    console.log('Fenêtre prête');
    win.show();
  });
  
  console.log('Fenêtre créée');
});

app.on('window-all-closed', () => {
  console.log('Toutes les fenêtres fermées');
  app.quit();
});



