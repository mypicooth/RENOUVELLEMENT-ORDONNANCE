/**
 * Application en arrière-plan pour scanner les QR codes
 * Écoute les scans de code-barres même quand l'application web n'est pas au premier plan
 * 
 * Fonctionnement :
 * - Surveille le presse-papiers (clipboard) en continu
 * - Détecte quand un QR code JSON est copié
 * - Envoie automatiquement le scan à l'API
 */

const axios = require('axios');
const clipboardy = require('clipboardy');
const os = require('os');
const { loadConfig } = require('./scanner-config');

// Charger la configuration
const CONFIG = loadConfig();
const API_TOKEN = CONFIG.SCANNER_API_TOKEN || '';

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
 * Envoie le scan à l'API
 */
async function sendScanToAPI(renewalId, type) {
  try {
    scanCount++;
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] Scan #${scanCount} détecté: ${type} pour ${renewalId.substring(0, 20)}...`);
    
    // Utiliser l'endpoint public avec token API si disponible
    const endpoint = API_TOKEN 
      ? `${CONFIG.API_URL}/api/renewals/scan-public`
      : `${CONFIG.API_URL}/api/renewals/scan`;
    
    const payload = API_TOKEN
      ? { renewalId, type, apiToken: API_TOKEN }
      : { renewalId, type };
    
    const response = await axios.post(endpoint, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    if (response.data.success) {
      console.log(`✅ ${response.data.message}`);
      return { success: true, message: response.data.message };
    } else {
      console.error(`❌ Erreur: ${response.data.error || 'Erreur inconnue'}`);
      return { success: false, error: response.data.error };
    }
  } catch (error) {
    if (error.response) {
      const errorMsg = error.response.data?.error || error.message;
      console.error(`❌ Erreur API (${error.response.status}): ${errorMsg}`);
      return { success: false, error: errorMsg };
    } else if (error.request) {
      console.error(`❌ Pas de réponse du serveur. Vérifiez que l'application web est démarrée sur ${CONFIG.API_URL}`);
      return { success: false, error: 'Serveur inaccessible' };
    } else {
      console.error(`❌ Erreur: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Vérifie le clipboard pour détecter un nouveau scan
 */
async function checkClipboard() {
  if (isProcessing) return;

  try {
    const currentContent = clipboardy.readSync();
    
    // Détecter un changement significatif (nouveau scan)
    if (currentContent !== lastClipboardContent && 
        currentContent.length >= CONFIG.MIN_LENGTH &&
        currentContent.trim().startsWith('{')) {
      
      const qrData = parseQRCode(currentContent);
      
      if (qrData) {
        isProcessing = true;
        lastClipboardContent = currentContent;
        
        const result = await sendScanToAPI(qrData.renewalId, qrData.type);
        
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
    if (!error.message.includes('clipboard') && !error.message.includes('EBUSY')) {
      console.error('Erreur lecture clipboard:', error.message);
    }
  }
}

/**
 * Fonction principale
 */
function start() {
  console.log('='.repeat(70));
  console.log('  Scanner de QR codes en arrière-plan');
  console.log('='.repeat(70));
  console.log(`  API URL: ${CONFIG.API_URL}`);
  console.log(`  Intervalle de vérification: ${CONFIG.SCAN_INTERVAL}ms`);
  if (API_TOKEN) {
    console.log(`  Token API: ${API_TOKEN.substring(0, 10)}... (configuré)`);
    console.log(`  Mode: Authentifié (scan-public)`);
  } else {
    console.log('  ⚠️  Token API non configuré');
    console.log(`  Mode: Session web requise (scan)`);
    console.log(`  💡 Configurez le token dans config.json`);
  }
  console.log('');
  console.log('  En écoute... (Appuyez sur Ctrl+C pour arrêter)');
  console.log('='.repeat(70));
  console.log('');

  // Vérifier le clipboard périodiquement
  const interval = setInterval(checkClipboard, CONFIG.SCAN_INTERVAL);

  // Vérifier immédiatement
  checkClipboard();

  // Gestion de l'arrêt propre
  process.on('SIGINT', () => {
    console.log('\n');
    console.log('='.repeat(70));
    console.log(`  Arrêt du scanner (${scanCount} scan(s) traité(s))`);
    console.log('='.repeat(70));
    clearInterval(interval);
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    clearInterval(interval);
    process.exit(0);
  });
}

// Vérifier que nous sommes sur Windows
if (os.platform() !== 'win32') {
  console.error('⚠️  Cette application est conçue pour Windows uniquement.');
  console.error('   Le scanner de clipboard fonctionne mieux sur Windows.');
  process.exit(1);
}

// Démarrer
start();


