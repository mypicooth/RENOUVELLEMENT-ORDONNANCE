# Guide de Dépannage - Service Scanner QR

## Problème : Le service ne démarre pas automatiquement

### Solution 1 : Vérifier le statut du service

Exécutez `check-service.bat` (double-clic) pour vérifier l'état du service.

Ou manuellement :
```cmd
sc query RenouvellementQRScanner
```

### Solution 2 : Démarrer le service manuellement

**Option A : Utiliser le script**
- Double-cliquez sur `restart-service.bat` (en tant qu'administrateur)

**Option B : Commande manuelle**
```cmd
net start RenouvellementQRScanner
```

### Solution 3 : Vérifier la configuration du service

```cmd
sc qc RenouvellementQRScanner
```

Vérifiez que :
- `START_TYPE` est sur `AUTO_START`
- Le `BINARY_PATH_NAME` pointe vers le bon fichier `.exe`

### Solution 4 : Réinstaller le service

1. Arrêter le service :
```cmd
net stop RenouvellementQRScanner
```

2. Supprimer le service :
```cmd
sc delete RenouvellementQRScanner
```

3. Réinstaller :
- Double-cliquez sur `install-service.bat` (en tant qu'administrateur)

## Problème : Le service démarre puis s'arrête

### Vérifier les logs

1. Ouvrir l'**Observateur d'événements Windows** :
   - Appuyez sur `Win + R`
   - Tapez `eventvwr.msc` et appuyez sur Entrée

2. Naviguer vers :
   - **Journaux Windows** > **Application**
   - Ou **Applications et services journaux** > **RenouvellementQRScanner**

3. Chercher les erreurs récentes

### Causes courantes

#### 1. Fichier `config.json` invalide

**Symptôme** : Le service démarre puis s'arrête immédiatement

**Solution** :
- Vérifier que `config.json` est un JSON valide
- Vérifier qu'il est dans le même dossier que `renouvellement-scanner.exe`
- Format attendu :
```json
{
  "API_URL": "https://renouvellement-ordonnance.vercel.app",
  "SCANNER_API_TOKEN": "votre-token",
  "SCAN_INTERVAL": 100,
  "MIN_LENGTH": 20
}
```

#### 2. Fichier `.exe` introuvable

**Symptôme** : Erreur "Le chemin spécifié est introuvable"

**Solution** :
- Vérifier que `renouvellement-scanner.exe` est dans le dossier
- Vérifier que le chemin dans le service est correct :
```cmd
sc qc RenouvellementQRScanner
```

#### 3. Problème de permissions

**Symptôme** : Erreur d'accès refusé

**Solution** :
- Vérifier que le service s'exécute avec les bonnes permissions
- Le service doit pouvoir :
  - Lire le fichier `config.json`
  - Accéder au presse-papiers Windows
  - Se connecter à Internet (pour l'API)

## Problème : Le service ne détecte pas les scans

### Vérifier que le scanner fonctionne

1. **Tester le scanner de code-barres** :
   - Scanner un code-barres quelconque
   - Coller (Ctrl+V) dans un éditeur de texte
   - Si le contenu apparaît, le scanner fonctionne

2. **Tester avec un QR code de renouvellement** :
   - Scanner un QR code imprimé
   - Vérifier dans l'application web si la date de délivrance a été enregistrée

### Vérifier la configuration

1. **Vérifier l'URL de l'API** :
   - Ouvrir `config.json`
   - Vérifier que `API_URL` est correcte et accessible

2. **Vérifier le token API** (si configuré) :
   - Vérifier que `SCANNER_API_TOKEN` correspond au token dans votre `.env.local` Next.js

3. **Redémarrer le service** après modification de `config.json` :
```cmd
net stop RenouvellementQRScanner
net start RenouvellementQRScanner
```

## Problème : Le service ne répond pas aux commandes de maintenance

### Solution : Redémarrer le service

**Utiliser le script** :
- Double-cliquez sur `restart-service.bat` (en tant qu'administrateur)

**Ou manuellement** :
```cmd
net stop RenouvellementQRScanner
timeout /t 2
net start RenouvellementQRScanner
```

### Si le service ne répond toujours pas

1. **Forcer l'arrêt** :
```cmd
taskkill /F /IM renouvellement-scanner.exe
```

2. **Supprimer et réinstaller le service** :
```cmd
sc delete RenouvellementQRScanner
```
Puis réexécutez `install-service.bat`

## Commandes utiles

### Vérifier le statut
```cmd
sc query RenouvellementQRScanner
```

### Démarrer le service
```cmd
net start RenouvellementQRScanner
```

### Arrêter le service
```cmd
net stop RenouvellementQRScanner
```

### Redémarrer le service
```cmd
net stop RenouvellementQRScanner && net start RenouvellementQRScanner
```

### Voir la configuration du service
```cmd
sc qc RenouvellementQRScanner
```

### Voir les propriétés du service
```cmd
sc qfailure RenouvellementQRScanner
```

## Scripts disponibles

- **`install-service.bat`** : Installe le service Windows
- **`check-service.bat`** : Vérifie le statut et démarre si nécessaire
- **`restart-service.bat`** : Redémarre le service
- **`uninstall.bat`** : Désinstalle le service

## Support

Si le problème persiste :
1. Vérifier les logs dans l'Observateur d'événements Windows
2. Vérifier que `config.json` est valide
3. Vérifier que l'URL de l'API est accessible depuis le poste
4. Réinstaller le service si nécessaire


