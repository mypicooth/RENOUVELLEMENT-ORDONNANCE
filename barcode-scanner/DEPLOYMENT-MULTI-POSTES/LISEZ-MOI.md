# 📝 INFORMATIONS IMPORTANTES - Package de Déploiement

## ✅ Ce Package Est Prêt à l'Emploi

Ce dossier contient **TOUT ce qui est nécessaire** pour installer le scanner sur n'importe quel poste Windows. **Aucune installation préalable n'est requise** !

---

## 🚀 Installation Ultra-Simple

### Pour Installer sur un Nouveau Poste :

1. **Copier** ce dossier complet sur le nouveau PC
2. **Clic-droit** sur `INSTALLER.bat` 
3. Choisir **"Exécuter en tant qu'administrateur"**
4. ✅ **C'est tout !**

---

## ❓ Prérequis (Déjà Inclus dans Windows)

✅ **Rien à installer !** Le scanner fonctionne avec :
- Windows 10 ou 11 (déjà présent)
- PowerShell (déjà présent dans Windows)
- Navigateur web (déjà présent dans Windows)

❌ **AUCUNE installation nécessaire** :
- Pas besoin de Python
- Pas besoin de Node.js
- Pas besoin d'Electron
- Pas besoin d'autres logiciels

---

## 🌐 Comment Fonctionne la Fenêtre de Confirmation ?

Quand un QR code est scanné :
1. Le scanner détecte le code
2. **Votre navigateur par défaut s'ouvre automatiquement**
3. La page de confirmation s'affiche
4. Vous validez ou annulez le scan

**Avantage** : Fonctionne avec n'importe quel navigateur (Chrome, Edge, Firefox, etc.)

---

## 📦 Contenu du Package

### Fichiers Principaux
- `renouvellement-scanner.exe` (42 MB) - Application complète auto-suffisante
- `keyboard-hook.ps1` - Script de capture clavier
- `config.json` - Configuration (modifier le token API)

### Scripts d'Installation
- `INSTALLER.bat` - Installation automatique (RECOMMANDÉ)
- `install-service.bat` - Installation manuelle du service
- `DESINSTALLER.bat` - Désinstallation du service
- `TEST-SCANNER.bat` - Test rapide

### Documentation
- `INSTALLATION.md` - Guide complet
- `README-DEPLOYMENT.md` - Guide de déploiement multi-postes
- `README-INSTALLATION.txt` - Instructions détaillées
- `LISEZ-MOI.md` - Ce fichier

---

## ⚙️ Configuration Obligatoire

**AVANT l'installation**, ouvrir `config.json` et vérifier :

```json
{
  "API_URL": "https://renouvellement-ordonnance.vercel.app",
  "SCANNER_API_TOKEN": "VOTRE_TOKEN_ICI"
}
```

⚠️ **Important** : Remplacer `VOTRE_TOKEN_ICI` par votre vrai token API

---

## 🔧 Installation Détaillée

### Étape 1 : Copier le Dossier
Copier tout le dossier `DEPLOYMENT-MULTI-POSTES` sur :
- Une clé USB
- Un partage réseau
- Le bureau du PC cible

### Étape 2 : Configurer le Token
1. Ouvrir `config.json` avec le Bloc-notes
2. Remplacer le token par le vôtre
3. Sauvegarder

### Étape 3 : Installer
1. Clic-droit sur `INSTALLER.bat`
2. "Exécuter en tant qu'administrateur"
3. Suivre les instructions à l'écran

### Étape 4 : Tester
1. Scanner un QR code de test
2. Votre navigateur s'ouvre automatiquement
3. La page de confirmation s'affiche

---

## ✅ Vérification Post-Installation

Vérifier que tout fonctionne :

```powershell
# 1. Vérifier que le service est démarré
Get-Service -Name "RenouvellementQRScanner"

# 2. Vérifier les logs (doivent montrer "Scanner démarré")
notepad logs\scanner-YYYY-MM-DD.log
```

---

## 🔄 Mise à Jour sur un Poste Existant

Si le scanner est déjà installé :

1. **Arrêter le service** :
   - Double-cliquer sur `DESINSTALLER.bat`
   
2. **Remplacer les fichiers** :
   - Remplacer `renouvellement-scanner.exe` par la nouvelle version
   
3. **Réinstaller** :
   - Double-cliquer sur `INSTALLER.bat`

---

## 🛠️ Dépannage

### Le navigateur ne s'ouvre pas

**Cause** : Navigateur par défaut non configuré

**Solution** :
1. Ouvrir les Paramètres Windows
2. Applications > Applications par défaut
3. Choisir un navigateur web par défaut (Chrome, Edge, Firefox)

### Le scan n'est pas détecté

**Cause** : Hook clavier non activé

**Solution** :
1. Vérifier les logs : `logs\scanner-YYYY-MM-DD.log`
2. Chercher : "Hook clavier global activé"
3. Si absent, réinstaller le service

### Erreur "ExecutionPolicy"

**Cause** : PowerShell bloqué

**Solution** : Déjà corrigé dans cette version ! L'EXE force `-ExecutionPolicy Bypass`

---

## 📞 Support

### En Cas de Problème

1. **Consulter les logs** :
   ```
   notepad logs\scanner-YYYY-MM-DD.log
   ```

2. **Tester manuellement** :
   ```
   TEST-SCANNER.bat
   ```

3. **Réinstaller** :
   ```
   DESINSTALLER.bat
   INSTALLER.bat
   ```

---

## 📊 Déploiement Multi-Postes

### Option 1 : Installation Poste par Poste
- Copier le dossier sur chaque PC
- Exécuter `INSTALLER.bat` sur chaque PC

### Option 2 : Script de Déploiement Réseau
Créer un script batch :

```batch
@echo off
xcopy "\\serveur\partage\Scanner\*.*" "C:\Scanner\" /E /I /Y
cd "C:\Scanner"
INSTALLER.bat
```

### Option 3 : GPO (Active Directory)
- Créer une GPO de déploiement
- Script de startup : `\\serveur\partage\Scanner\INSTALLER.bat`

---

## 🔒 Sécurité

### Token API
- ⚠️ Ne jamais partager le token
- Utiliser un token différent par poste si possible
- Protéger le fichier `config.json`

### Permissions
- Le service s'exécute en tant que SYSTEM
- Accès requis au clavier (déjà géré)
- Accès réseau pour l'API

---

## ✨ Fonctionnalités

✅ **Capture des scans même si minimisé**
✅ **Détection automatique des QR codes**
✅ **Ouverture automatique du navigateur**
✅ **Démarrage automatique avec Windows**
✅ **Logs détaillés pour le diagnostic**
✅ **Compatible AZERTY français**
✅ **Aucune dépendance externe**

---

## 📅 Version

**Version** : 2.0.0  
**Date** : 6 janvier 2026  
**Système** : Windows 10/11 (64 bits)  
**Changements** :
- ✅ Ouverture directe dans le navigateur (plus besoin de Python/Electron)
- ✅ ExecutionPolicy Bypass intégré (plus d'erreurs PowerShell)
- ✅ Installation simplifiée
- ✅ Package 100% autonome

---

**🎉 Prêt à Déployer ! Aucune Installation Supplémentaire Nécessaire !**
