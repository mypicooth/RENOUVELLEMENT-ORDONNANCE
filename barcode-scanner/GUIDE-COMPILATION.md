# Guide de Compilation et Distribution

## Compiler l'application (une seule fois)

### Prérequis

- Node.js installé sur votre machine de développement
- Accès à internet pour télécharger les dépendances

### Étapes de compilation

1. **Installer les dépendances** :
   ```bash
   cd barcode-scanner
   npm install
   ```

2. **Compiler l'application** :
   ```bash
   npm run build
   ```

   Cela va :
   - Compiler `scanner.js` en `renouvellement-scanner.exe`
   - Créer les scripts d'installation
   - Copier les fichiers nécessaires dans le dossier `dist/`

3. **Vérifier le résultat** :
   
   Le dossier `dist/` contient maintenant :
   - `renouvellement-scanner.exe` - L'application compilée (autonome, ne nécessite pas Node.js)
   - `config.json` - Fichier de configuration
   - `install.bat` - Script d'installation Windows
   - `install-service.ps1` - Script PowerShell d'installation
   - `README-INSTALLATION.txt` - Guide d'installation

## Distribuer sur plusieurs postes

### Étape 1 : Préparer le package

1. Copier tout le contenu du dossier `dist/` sur une clé USB ou un partage réseau

### Étape 2 : Installer sur chaque poste

1. **Copier les fichiers** sur chaque poste (par exemple dans `C:\Program Files\RenouvellementScanner\`)

2. **Configurer l'application** :
   
   Modifier le fichier `config.json` avec un éditeur de texte :
   ```json
   {
     "API_URL": "https://renouvellement-ordonnance.vercel.app",
     "SCANNER_API_TOKEN": "votre-token-securise",
     "SCAN_INTERVAL": 100,
     "MIN_LENGTH": 20
   }
   ```
   
   **Important** : 
   - Remplacer `API_URL` par l'URL de votre application web
   - Remplacer `SCANNER_API_TOKEN` par le token configuré dans votre `.env.local` Next.js
   - Le même token doit être utilisé partout

3. **Installer le service Windows** :
   
   - Ouvrir PowerShell **en tant qu'administrateur** (clic droit > Exécuter en tant qu'administrateur)
   - Naviguer vers le dossier de l'application
   - Exécuter :
     ```powershell
     .\install.bat
     ```
   
   Ou directement :
     ```powershell
     .\install-service.ps1
     ```

### Étape 3 : Vérifier l'installation

```powershell
# Vérifier le statut du service
sc query RenouvellementQRScanner

# Démarrer le service (si nécessaire)
net start RenouvellementQRScanner
```

## Configuration après installation

Si vous devez modifier la configuration après installation :

1. Modifier le fichier `config.json`
2. Redémarrer le service :
   ```powershell
   net stop RenouvellementQRScanner
   net start RenouvellementQRScanner
   ```

## Désinstallation

Sur chaque poste, exécuter `uninstall.bat` en tant qu'administrateur, ou :

```powershell
net stop RenouvellementQRScanner
sc delete RenouvellementQRScanner
```

## Avantages de l'application compilée

✅ **Autonome** : Ne nécessite pas Node.js installé sur les postes clients
✅ **Léger** : Un seul fichier .exe à distribuer
✅ **Sécurisé** : Configuration via fichier JSON, pas de code source visible
✅ **Service Windows** : Se lance automatiquement au démarrage
✅ **Multi-postes** : Facile à déployer sur plusieurs machines

## Notes importantes

- L'application compilée fonctionne uniquement sur Windows (x64)
- Le fichier `config.json` doit être dans le même dossier que l'exe
- Après modification de `config.json`, redémarrer le service
- Les logs sont dans l'Observateur d'événements Windows


