/**
 * Script pour installer le scanner comme service Windows
 * Nécessite node-windows installé globalement
 * 
 * Usage: node install-service.js
 */

const Service = require('node-windows').Service;
const path = require('path');
const fs = require('fs');

// Lire la configuration depuis .env si disponible
let apiUrl = process.env.API_URL || 'http://localhost:3000';
let apiToken = process.env.SCANNER_API_TOKEN || '';

// Essayer de lire depuis .env
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();
        if (key === 'API_URL') {
          apiUrl = value;
        } else if (key === 'SCANNER_API_TOKEN') {
          apiToken = value;
        }
      }
    });
  }
} catch (error) {
  console.log('Note: Fichier .env non trouvé, utilisation des valeurs par défaut');
}

console.log('='.repeat(70));
console.log('  Installation du service Windows pour le scanner QR');
console.log('='.repeat(70));
console.log(`  API URL: ${apiUrl}`);
if (apiToken) {
  console.log(`  Token API: ${apiToken.substring(0, 10)}... (configuré)`);
} else {
  console.log('  ⚠️  Token API non configuré');
}
console.log('='.repeat(70));
console.log('');

// Créer un objet Service
const svc = new Service({
  name: 'Renouvellement QR Scanner',
  description: 'Scanner de QR codes en arrière-plan pour les renouvellements d\'ordonnance',
  script: path.join(__dirname, 'scanner.js'),
  nodeOptions: [
    '--max_old_space_size=4096'
  ],
  env: [
    {
      name: "API_URL",
      value: apiUrl
    },
    {
      name: "SCANNER_API_TOKEN",
      value: apiToken
    }
  ]
});

// Écouter les événements
svc.on('install', function() {
  console.log('✅ Service installé avec succès !');
  console.log('Démarrage du service...');
  svc.start();
});

svc.on('start', function() {
  console.log('✅ Service démarré !');
  console.log('');
  console.log('Le scanner est maintenant actif en arrière-plan.');
  console.log('Il démarrera automatiquement au démarrage de Windows.');
  console.log('');
  console.log('Pour gérer le service :');
  console.log('  - Ouvrir "Services" (services.msc)');
  console.log('  - Chercher "Renouvellement QR Scanner"');
  console.log('  - Démarrer/Arrêter/Redémarrer selon besoin');
  console.log('');
});

svc.on('error', function(err) {
  console.error('❌ Erreur:', err.message);
  if (err.message.includes('permission')) {
    console.error('');
    console.error('⚠️  Erreur de permissions !');
    console.error('   Le script doit être exécuté en tant qu\'administrateur.');
    console.error('   Clic droit sur PowerShell > Exécuter en tant qu\'administrateur');
  }
});

svc.on('alreadyinstalled', function() {
  console.log('⚠️  Le service est déjà installé.');
  console.log('Voulez-vous le réinstaller ? (y/n)');
  // Pour réinstaller, il faut d'abord désinstaller
  process.stdin.once('data', function(data) {
    const answer = data.toString().trim().toLowerCase();
    if (answer === 'y' || answer === 'yes' || answer === 'o' || answer === 'oui') {
      console.log('Désinstallation de l\'ancien service...');
      svc.uninstall();
      setTimeout(() => {
        console.log('Réinstallation...');
        svc.install();
      }, 2000);
    } else {
      console.log('Installation annulée.');
      process.exit(0);
    }
  });
});

// Installer le service
console.log('Installation du service...');
console.log('(Cela peut prendre quelques secondes)');
console.log('');
svc.install();

