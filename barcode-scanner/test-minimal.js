const { app, BrowserWindow } = require('electron');

console.log('Test minimal Electron démarré');

app.whenReady().then(() => {
  console.log('Electron est prêt');
  
  const win = new BrowserWindow({
    width: 400,
    height: 300,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  win.loadURL('data:text/html,<h1>Test Electron</h1><p>Si vous voyez ce message, Electron fonctionne!</p>');
  
  win.once('ready-to-show', () => {
    console.log('Fenêtre prête');
    win.show();
  });
  
  console.log('Fenêtre créée');
}).catch((error) => {
  console.error('Erreur:', error);
  app.quit();
});

app.on('window-all-closed', () => {
  console.log('Toutes les fenêtres fermées');
  app.quit();
});

