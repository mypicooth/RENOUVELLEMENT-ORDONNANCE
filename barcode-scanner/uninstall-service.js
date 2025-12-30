/**
 * Script pour désinstaller le service Windows
 * Usage: node uninstall-service.js
 */

const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'Renouvellement QR Scanner',
  script: path.join(__dirname, 'scanner.js'),
});

svc.on('uninstall', function() {
  console.log('✅ Service désinstallé avec succès !');
});

svc.on('error', function(err) {
  console.error('❌ Erreur:', err.message);
});

console.log('Désinstallation du service...');
svc.uninstall();

