# Déploiement sur Plusieurs Postes

## Vue d'ensemble

Cette application peut être compilée en un exécutable Windows autonome qui peut être installé sur plusieurs postes. L'application fonctionne en arrière-plan et se lance automatiquement au démarrage de Windows.

## Étape 1 : Compiler l'application (une seule fois)

### Sur votre machine de développement

1. **Installer les dépendances** :
   ```bash
   cd barcode-scanner
   npm install
   ```

2. **Compiler l'application** :
   ```bash
   npm run build
   ```

3. **Vérifier le résultat** :
   
   Le dossier `dist/` contient maintenant :
   - `renouvellement-scanner.exe` - Application compilée (autonome)
   - `config.json` - Fichier de configuration
   - `install.bat` - Script d'installation Windows
   - `install-service.ps1` - Script PowerShell d'installation
   - `uninstall.bat` - Script de désinstallation
   - `README-INSTALLATION.txt` - Guide d'installation

## Étape 2 : Préparer le package de distribution

1. **Créer un dossier de distribution** (ex: `ScannerQR-Distribution/`)
2. **Copier tout le contenu du dossier `dist/`** dans ce dossier
3. **Modifier le fichier `config.json`** avec les valeurs par défaut :
   ```json
   {
     "API_URL": "https://renouvellement-ordonnance.vercel.app",
     "SCANNER_API_TOKEN": "votre-token-securise",
     "SCAN_INTERVAL": 100,
     "MIN_LENGTH": 20
   }
   ```

4. **Créer un fichier ZIP** du dossier de distribution pour faciliter le déploiement

## Étape 3 : Installer sur chaque poste

### Méthode 1 : Installation automatique (Recommandée)

1. **Extraire le ZIP** sur chaque poste (par exemple dans `C:\Program Files\RenouvellementScanner\`)

2. **Modifier la configuration** (si nécessaire) :
   - Ouvrir `config.json` avec un éditeur de texte
   - Vérifier que `API_URL` pointe vers votre application web
   - Vérifier que `SCANNER_API_TOKEN` correspond au token configuré dans votre `.env.local` Next.js

3. **Installer le service Windows** :
   - Ouvrir PowerShell **en tant qu'administrateur** (clic droit > Exécuter en tant qu'administrateur)
   - Naviguer vers le dossier de l'application :
     ```powershell
     cd "C:\Program Files\RenouvellementScanner"
     ```
   - Exécuter le script d'installation :
     ```powershell
     .\install-service.ps1
     ```

### Méthode 2 : Installation manuelle

1. **Copier les fichiers** sur le poste

2. **Créer le service Windows manuellement** :
   ```powershell
   # Ouvrir PowerShell en tant qu'administrateur
   New-Service -Name "RenouvellementQRScanner" `
     -DisplayName "Scanner de QR Codes - Renouvellements" `
     -Description "Scanner de QR codes en arrière-plan pour les renouvellements d'ordonnances" `
     -BinaryPathName "C:\Program Files\RenouvellementScanner\renouvellement-scanner.exe" `
     -StartupType Automatic
   
   # Démarrer le service
   Start-Service RenouvellementQRScanner
   ```

## Étape 4 : Vérifier l'installation

Sur chaque poste, vérifier que le service fonctionne :

```powershell
# Vérifier le statut
sc query RenouvellementQRScanner

# Voir les détails
sc qc RenouvellementQRScanner
```

Le service doit être en état "RUNNING".

## Configuration après installation

Si vous devez modifier la configuration :

1. **Modifier `config.json`** sur le poste
2. **Redémarrer le service** :
   ```powershell
   net stop RenouvellementQRScanner
   net start RenouvellementQRScanner
   ```

## Test du scanner

1. **Vérifier que le scanner de code-barres copie dans le presse-papiers** :
   - Scanner un code-barres quelconque
   - Coller (Ctrl+V) dans un éditeur de texte
   - Si le contenu apparaît, le scanner est bien configuré

2. **Tester avec un QR code de renouvellement** :
   - Scanner un QR code imprimé
   - Le scanner devrait automatiquement envoyer le scan à l'API
   - Vérifier dans l'application web que la date de délivrance a été enregistrée

## Dépannage

Si le service ne démarre pas ou ne répond pas :

1. **Vérifier le statut** :
   - Double-cliquez sur `check-service.bat`
   - Ou exécutez : `sc query RenouvellementQRScanner`

2. **Redémarrer le service** :
   - Double-cliquez sur `restart-service.bat` (en tant qu'administrateur)
   - Ou exécutez : `net stop RenouvellementQRScanner && net start RenouvellementQRScanner`

3. **Vérifier les logs** :
   - Ouvrir l'Observateur d'événements Windows
   - Applications et services journaux > RenouvellementQRScanner

4. **Vérifier la configuration** :
   - Vérifier que `config.json` est valide
   - Vérifier que l'URL de l'API est accessible

Pour plus de détails, consultez `DEPANNAGE.md`.

## Désinstallation

Sur chaque poste :

1. **Arrêter le service** :
   ```cmd
   net stop RenouvellementQRScanner
   ```

2. **Supprimer le service** :
   ```cmd
   sc delete RenouvellementQRScanner
   ```

3. **Supprimer les fichiers** du dossier d'installation

Ou simplement exécuter `uninstall.bat` en tant qu'administrateur.

## Avantages de cette solution

✅ **Autonome** : Ne nécessite pas Node.js sur les postes clients
✅ **Léger** : Un seul fichier .exe (~50-60 MB)
✅ **Sécurisé** : Configuration via fichier JSON, pas de code source
✅ **Service Windows** : Se lance automatiquement au démarrage
✅ **Multi-postes** : Facile à déployer sur plusieurs machines
✅ **Configuration simple** : Un seul fichier `config.json` à modifier

## Notes importantes

- L'application fonctionne uniquement sur Windows (x64)
- Le fichier `config.json` doit être dans le même dossier que l'exe
- Après modification de `config.json`, redémarrer le service
- Les logs sont dans l'Observateur d'événements Windows
- Le même token API doit être utilisé partout (dans Next.js et sur tous les postes)

