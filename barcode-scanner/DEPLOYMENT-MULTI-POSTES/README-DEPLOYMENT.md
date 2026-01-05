# 📦 Package de Déploiement Multi-Postes
## Scanner de QR Codes - Renouvellement d'Ordonnances

---

## 🎯 Objectif

Ce package contient tous les fichiers nécessaires pour déployer le scanner de QR codes sur plusieurs postes Windows.

---

## 📂 Contenu du Package

### Fichiers Principaux
- ✅ **renouvellement-scanner.exe** - Exécutable principal (auto-suffisant)
- ✅ **keyboard-hook.ps1** - Hook clavier global Windows (fonctionne même si minimisé)
- ✅ **scan-confirm.py** - Fenêtre de confirmation (optionnel, nécessite Python)
- ✅ **config.json** - Configuration de l'application

### Scripts d'Installation
- ✅ **INSTALLER.bat** - Installation automatique complète (RECOMMANDÉ)
- ✅ **install-service.bat** - Installation comme service Windows
- ✅ **install-service.ps1** - Script PowerShell d'installation du service

### Scripts de Gestion
- ✅ **DESINSTALLER.bat** - Désinstallation du service
- ✅ **DESINSTALLER.ps1** - Script PowerShell de désinstallation
- ✅ **TEST-SCANNER.bat** - Test rapide du scanner

### Documentation
- ✅ **INSTALLATION.md** - Guide d'installation complet
- ✅ **README-DEPLOYMENT.md** - Ce fichier
- ✅ **config-template.json** - Modèle de configuration

---

## 🚀 Installation sur un Nouveau Poste

### Méthode Rapide (Recommandée)

1. **Copier tout le dossier** sur le poste cible (ex: `C:\Scanner\`)

2. **Configurer le token API** :
   - Ouvrir `config.json` avec un éditeur de texte
   - Remplacer `"SCANNER_API_TOKEN"` par votre vrai token

3. **Installer comme service** :
   - Clic-droit sur `INSTALLER.bat`
   - Choisir **"Exécuter en tant qu'administrateur"**
   - Suivre les instructions à l'écran

4. **Tester** :
   - Scanner un QR code
   - Vérifier que la fenêtre de confirmation s'ouvre

✅ **C'est tout ! Le scanner démarre automatiquement à chaque démarrage de Windows.**

---

## ⚙️ Prérequis

### Requis
- Windows 10 ou 11 (64 bits)
- PowerShell 5.1+ (déjà installé sur Windows 10/11)
- Droits administrateur (pour installation comme service)

### Optionnel
- Python 3.x (pour la fenêtre de confirmation graphique)

---

## 📝 Configuration

### Fichier config.json

```json
{
  "API_URL": "https://renouvellement-ordonnance.vercel.app",
  "SCANNER_API_TOKEN": "VOTRE_TOKEN_ICI",
  "SCAN_INTERVAL": 50,
  "MIN_LENGTH": 20
}
```

**Paramètres :**
- `API_URL` : URL de votre application web
- `SCANNER_API_TOKEN` : Token d'authentification API (⚠️ NE PAS PARTAGER)
- `SCAN_INTERVAL` : Intervalle de scan en ms (50ms par défaut)
- `MIN_LENGTH` : Longueur minimale d'un scan (20 caractères)

---

## 🔧 Déploiement sur Plusieurs Postes

### Option 1 : Installation Manuelle sur Chaque Poste

1. Copier le dossier sur chaque poste
2. Exécuter `INSTALLER.bat` en tant qu'administrateur
3. Vérifier le bon fonctionnement

### Option 2 : Script de Déploiement Automatisé

Créer un script batch pour déploiement réseau :

```batch
@echo off
REM Copier les fichiers depuis un partage réseau
xcopy "\\serveur\partage\Scanner\*.*" "C:\Scanner\" /E /I /Y

REM Installer le service
cd "C:\Scanner"
INSTALLER.bat
```

### Option 3 : GPO (Group Policy Object)

1. Créer un package MSI (ou utiliser le dossier)
2. Déployer via GPO dans Active Directory
3. Script de startup pour lancer l'installation

---

## 🛠️ Maintenance

### Mise à Jour du Scanner

1. **Arrêter le service** :
   ```powershell
   Stop-Service -Name "RenouvellementsScanner"
   ```

2. **Remplacer les fichiers** :
   - `renouvellement-scanner.exe` (nouveau)
   - `keyboard-hook.ps1` (si modifié)

3. **Redémarrer le service** :
   ```powershell
   Start-Service -Name "RenouvellementsScanner"
   ```

### Consultation des Logs

Les logs sont dans : `logs\scanner-YYYY-MM-DD.log`

Vérifier :
- ✅ `Hook clavier global activé`
- ✅ `Scanner démarré`
- ✅ `QR code détecté`

### Vérification du Service

```powershell
Get-Service -Name "RenouvellementsScanner"
```

Si le service ne démarre pas :
1. Vérifier les logs
2. Réinstaller : `DESINSTALLER.bat` puis `INSTALLER.bat`
3. Vérifier les droits administrateur

---

## 🔒 Sécurité

### Token API
- ⚠️ **Ne jamais partager** le `SCANNER_API_TOKEN`
- Générer un token unique par poste si nécessaire
- Stocker les tokens de manière sécurisée

### Logs
- Les logs peuvent contenir des informations sensibles
- Configurer une rotation des logs si nécessaire
- Limiter l'accès au dossier `logs\`

### Service Windows
- Le service s'exécute avec les droits **SYSTEM**
- Limiter l'accès au dossier d'installation
- Utiliser des permissions NTFS appropriées

---

## 📊 Surveillance

### Vérifications Recommandées

✅ **Quotidiennes** :
- Service actif sur tous les postes
- Aucune erreur critique dans les logs

✅ **Hebdomadaires** :
- Taille des fichiers de logs
- Test de scan sur chaque poste

✅ **Mensuelles** :
- Mise à jour du scanner si disponible
- Vérification des tokens API

---

## 🆘 Dépannage

### Le scanner ne détecte pas les QR codes

1. **Vérifier le hook clavier** :
   - Ouvrir les logs
   - Chercher : `Hook clavier global activé`

2. **Tester manuellement** :
   - Double-cliquer sur `TEST-SCANNER.bat`
   - Scanner un QR code de test

3. **Vérifier la configuration clavier** :
   - Le scanner est configuré pour **AZERTY français**
   - Modifier `keyboard-hook.ps1` pour autre layout

### Le service ne démarre pas

```powershell
# Vérifier l'état
Get-Service -Name "RenouvellementsScanner"

# Voir les erreurs
Get-EventLog -LogName Application -Source "RenouvellementsScanner" -Newest 10

# Réinstaller
.\DESINSTALLER.bat
.\INSTALLER.bat
```

### Erreur "clipboardy non disponible"

✅ **C'est normal** ! Le scanner fonctionne sans clipboardy grâce au hook clavier global.

---

## 📞 Support

### Ressources
- 📖 Documentation complète : `INSTALLATION.md`
- 🔧 Scripts de test : `TEST-SCANNER.bat`
- 📝 Logs : `logs\scanner-YYYY-MM-DD.log`

### Contacts
- Support technique : [votre email]
- Documentation : [votre site]

---

## ✅ Checklist de Déploiement

Avant déploiement sur un nouveau poste :

- [ ] Token API configuré dans `config.json`
- [ ] URL API correcte dans `config.json`
- [ ] Droits administrateur disponibles
- [ ] PowerShell activé sur le poste
- [ ] Antivirus configuré pour autoriser l'exécutable
- [ ] Test de scan effectué
- [ ] Service installé et démarré
- [ ] Logs vérifiés
- [ ] Documentation fournie à l'utilisateur

---

**Version** : 1.0.0  
**Date** : 5 janvier 2026  
**Système** : Windows 10/11 (64 bits)  
**Auteur** : Scanner Team
