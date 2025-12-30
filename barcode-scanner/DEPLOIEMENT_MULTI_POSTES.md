# Déploiement du Scanner sur Plusieurs Postes

Ce guide explique comment installer le scanner comme service Windows sur tous les postes de travail.

## Prérequis

- Node.js installé sur chaque poste
- Accès administrateur sur chaque poste
- Fichier `.env` configuré avec l'URL de l'API et le token

## Méthode 1 : Installation manuelle sur chaque poste

### Étape 1 : Préparer les fichiers

1. Copier le dossier `barcode-scanner` sur chaque poste
2. Ou partager le dossier sur le réseau

### Étape 2 : Configurer sur chaque poste

1. Ouvrir PowerShell **en tant qu'administrateur** (clic droit > Exécuter en tant qu'administrateur)
2. Naviguer vers le dossier `barcode-scanner`
3. Créer le fichier `.env` :

```powershell
cd C:\chemin\vers\barcode-scanner
notepad .env
```

Contenu du fichier `.env` :
```env
API_URL=https://votre-domaine.com
SCANNER_API_TOKEN=votre-token-securise
```

**Important** : Utiliser l'URL complète de votre serveur (pas localhost si le serveur est distant).

### Étape 3 : Installer le service

**Option A : Via PowerShell (Recommandé)**

```powershell
.\install-service.ps1
```

**Option B : Via Node.js**

```powershell
npm install -g node-windows
node install-service.js
```

### Étape 4 : Vérifier l'installation

1. Ouvrir "Services" (Win+R, taper `services.msc`)
2. Chercher "Renouvellement QR Scanner"
3. Vérifier que le statut est "En cours d'exécution"
4. Vérifier que le type de démarrage est "Automatique"

## Méthode 2 : Déploiement automatisé (GPO ou script réseau)

### Script de déploiement automatique

Créer un script batch `deploy-scanner.bat` :

```batch
@echo off
echo Installation du scanner QR sur ce poste...
echo.

REM Vérifier Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERREUR: Node.js n'est pas installe
    pause
    exit /b 1
)

REM Aller dans le dossier du scanner
cd /d "%~dp0barcode-scanner"

REM Installer node-windows si nécessaire
npm list -g node-windows >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installation de node-windows...
    npm install -g node-windows
)

REM Installer le service
echo Installation du service...
node install-service.js

echo.
echo Installation terminee!
pause
```

### Déploiement via GPO (Group Policy)

1. Créer un package avec :
   - Le dossier `barcode-scanner`
   - Le script `deploy-scanner.bat`
   - Le fichier `.env` (avec les bonnes valeurs)

2. Configurer une GPO pour :
   - Copier les fichiers sur chaque poste
   - Exécuter le script au démarrage (en tant qu'administrateur)

## Configuration centralisée

### Pour un serveur unique accessible à tous

Dans le fichier `.env` de chaque poste :

```env
API_URL=https://votre-serveur.com
SCANNER_API_TOKEN=le-meme-token-pour-tous
```

### Pour un serveur local par poste

Si chaque poste a son propre serveur Next.js :

```env
API_URL=http://localhost:3000
SCANNER_API_TOKEN=token-local
```

## Vérification et maintenance

### Vérifier que le service fonctionne

Sur chaque poste :

1. Ouvrir "Services" (`services.msc`)
2. Chercher "Renouvellement QR Scanner"
3. Vérifier :
   - Statut : "En cours d'exécution"
   - Type de démarrage : "Automatique"

### Voir les logs

Les logs du service sont visibles dans :
- L'Observateur d'événements Windows
- Ou en démarrant manuellement : `node scanner.js` dans un terminal

### Mettre à jour le service

1. Arrêter le service dans "Services"
2. Modifier les fichiers si nécessaire
3. Réinstaller le service : `node install-service.js`
4. Redémarrer le service

### Désinstaller le service

```powershell
node uninstall-service.js
```

Ou via "Services" : Clic droit > Supprimer

## Dépannage

### Le service ne démarre pas

1. Vérifier les logs dans l'Observateur d'événements
2. Vérifier que Node.js est dans le PATH
3. Vérifier que le fichier `.env` existe et est correct
4. Tester manuellement : `node scanner.js`

### Le service démarre mais ne détecte pas les scans

1. Vérifier que l'API est accessible depuis ce poste
2. Tester la connexion : `curl https://votre-serveur.com/api/renewals/scan-public`
3. Vérifier le token API dans `.env`

### Erreur "Token API invalide"

- Vérifier que le token dans `.env` correspond à `SCANNER_API_TOKEN` dans `.env.local` du serveur
- Redémarrer le service après modification de `.env`

## Checklist de déploiement

- [ ] Node.js installé sur tous les postes
- [ ] Fichier `.env` créé avec les bonnes valeurs
- [ ] Service installé et démarré
- [ ] Type de démarrage configuré sur "Automatique"
- [ ] Test de scan effectué
- [ ] Vérification des logs

## Support

En cas de problème :
1. Vérifier les logs du service
2. Tester manuellement avec `node scanner.js`
3. Vérifier la connectivité réseau vers l'API
4. Vérifier les permissions du service

