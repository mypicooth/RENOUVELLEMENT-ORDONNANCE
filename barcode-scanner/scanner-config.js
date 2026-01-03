/**
 * Gestion de la configuration pour l'application compilée
 * Permet de modifier la configuration sans recompiler
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Chemin du fichier de configuration
// En mode compilé, utiliser le même dossier que l'exe
// En mode développement, utiliser le dossier du projet
const isCompiled = process.pkg !== undefined;
const configPath = isCompiled
  ? path.join(path.dirname(process.execPath), 'config.json')
  : path.join(__dirname, 'config.json');

/**
 * Charge la configuration depuis le fichier ou les variables d'environnement
 */
function loadConfig() {
  let config = {
    API_URL: process.env.API_URL || 'http://localhost:3000',
    SCANNER_API_TOKEN: process.env.SCANNER_API_TOKEN || '',
    SCAN_INTERVAL: parseInt(process.env.SCAN_INTERVAL) || 100,
    MIN_LENGTH: parseInt(process.env.MIN_LENGTH) || 20,
  };

  // Essayer de charger depuis le fichier config.json
  try {
    if (fs.existsSync(configPath)) {
      const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      config = { ...config, ...fileConfig };
    }
  } catch (error) {
    console.error('⚠️  Erreur lecture config.json, utilisation des valeurs par défaut');
  }

  return config;
}

/**
 * Sauvegarde la configuration dans le fichier
 */
function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('⚠️  Erreur sauvegarde config.json:', error.message);
    return false;
  }
}

module.exports = {
  loadConfig,
  saveConfig,
  configPath,
};

