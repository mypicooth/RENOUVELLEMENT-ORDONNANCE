# Installation du Scanner de QR Codes - Application Compilée

## Vue d'ensemble

Cette application permet de scanner les QR codes de renouvellement depuis n'importe quel poste Windows. L'application fonctionne en arrière-plan et se lance automatiquement au démarrage.

## Distribution sur plusieurs postes

### Étape 1 : Compiler l'application (une seule fois)

Sur votre machine de développement :

```bash
cd barcode-scanner
npm install
npm run build
```

Cela créera un dossier `dist` contenant :
- `renouvellement-scanner.exe` - L'application compilée
- `config.json` - Fichier de configuration (à modifier sur chaque poste)
- `install.bat` - Script d'installation
- `uninstall.bat` - Script de désinstallation
- `install-service-standalone.ps1` - Script PowerShell pour installer le service

### Étape 2 : Distribuer sur chaque poste

1. Copier le contenu du dossier `dist` sur chaque poste (par exemple dans `C:\Program Files\RenouvellementScanner\`)
2. Sur chaque poste, modifier le fichier `config.json` avec :
   - L'URL de votre API (ex: `https://renouvellement-ordonnance.vercel.app`)
   - Le token API (si configuré)

### Étape 3 : Installer sur chaque poste

**Option A : Installation automatique (Recommandé)**

1. Ouvrir PowerShell **en tant qu'administrateur**
2. Naviguer vers le dossier de l'application
3. Exécuter :
   ```powershell
   .\install.bat
   ```
   
   Ou directement :
   ```powershell
   .\install-service-standalone.ps1
   ```

**Option B : Installation manuelle**

1. Ouvrir PowerShell **en tant qu'administrateur**
2. Exécuter :
   ```powershell
   New-Service -Name "RenouvellementQRScanner" `
     -DisplayName "Scanner de QR Codes - Renouvellements" `
     -Description "Scanner de QR codes en arrière-plan" `
     -BinaryPathName "C:\Program Files\RenouvellementScanner\renouvellement-scanner.exe" `
     -StartupType Automatic
   
   Start-Service RenouvellementQRScanner
   ```

## Configuration

### Fichier config.json

Modifier le fichier `config.json` sur chaque poste :

```json
{
  "API_URL": "https://renouvellement-ordonnance.vercel.app",
  "SCANNER_API_TOKEN": "votre-token-securise",
  "SCAN_INTERVAL": 100,
  "MIN_LENGTH": 20
}
```

**Important** : Après modification de `config.json`, redémarrer le service :
```powershell
net stop RenouvellementQRScanner
net start RenouvellementQRScanner
```

## Vérification

### Vérifier que le service fonctionne

```powershell
sc query RenouvellementQRScanner
```

### Voir les logs

Les logs sont dans l'Observateur d'événements Windows :
1. Ouvrir l'Observateur d'événements
2. Applications et services journaux > RenouvellementQRScanner

Ou vérifier les fichiers de log dans le dossier `daemon` si configuré.

## Désinstallation

Exécuter `uninstall.bat` en tant qu'administrateur, ou :

```powershell
net stop RenouvellementQRScanner
sc delete RenouvellementQRScanner
```

## Dépannage

### Le service ne démarre pas

1. Vérifier les logs dans l'Observateur d'événements
2. Vérifier que `config.json` est valide (JSON correct)
3. Vérifier que l'URL de l'API est accessible depuis le poste
4. Vérifier que le token API est correct (si configuré)

### Le scanner ne détecte pas les scans

1. Vérifier que votre scanner de code-barres copie bien dans le presse-papiers
2. Tester en copiant manuellement un QR code JSON dans le presse-papiers
3. Vérifier les logs du service

### Erreur "Token API invalide"

- Vérifier que le token dans `config.json` correspond à `SCANNER_API_TOKEN` dans votre application web
- Redémarrer le service après modification de `config.json`

## Commandes utiles

```powershell
# Démarrer le service
net start RenouvellementQRScanner

# Arrêter le service
net stop RenouvellementQRScanner

# Vérifier le statut
sc query RenouvellementQRScanner

# Voir les propriétés
sc qc RenouvellementQRScanner
```



