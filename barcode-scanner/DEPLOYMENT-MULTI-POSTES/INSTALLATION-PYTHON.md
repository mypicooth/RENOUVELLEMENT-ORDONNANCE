# 🐍 Installation de Python pour le Scanner

## 📋 Prérequis à Installer sur Chaque Poste

### 1. Python (OBLIGATOIRE)

**Version recommandée** : Python 3.10 ou supérieur

#### Téléchargement :
- **Site officiel** : https://www.python.org/downloads/
- **Lien direct Windows** : https://www.python.org/ftp/python/3.12.1/python-3.12.1-amd64.exe

#### Installation :

1. **Télécharger** Python depuis le lien ci-dessus

2. **Lancer l'installateur** :
   - ✅ **IMPORTANT : Cocher "Add Python to PATH"** (en bas de la fenêtre)
   - Cliquer sur "Install Now"
   - Attendre la fin de l'installation

3. **Vérifier l'installation** :
   Ouvrir PowerShell et taper :
   ```powershell
   python --version
   ```
   Vous devriez voir : `Python 3.12.1` (ou version similaire)

---

### 2. Bibliothèques Python Nécessaires

Une fois Python installé, ouvrir PowerShell **en tant qu'administrateur** et installer :

```powershell
pip install tkinter
pip install requests
```

**Note** : `tkinter` est généralement déjà inclus avec Python sur Windows

---

## 🔧 Vérification de l'Installation

### Test Python :

```powershell
# 1. Vérifier Python
python --version

# 2. Vérifier pip
pip --version

# 3. Tester tkinter
python -m tkinter
```

Si une petite fenêtre s'ouvre, tkinter fonctionne ! ✅

---

## 📦 Installation du Scanner (Après Python)

Une fois Python installé et configuré :

1. **Copier** le dossier `DEPLOYMENT-MULTI-POSTES` sur le poste
2. **Clic-droit** sur `INSTALLER.bat` → "Exécuter en tant qu'administrateur"
3. Le scanner est installé ✅

---

## 🎯 Ordre d'Installation Complet

### Sur Chaque Nouveau Poste :

**Étape 1** : Installer Python (une fois, 5 minutes)
- Télécharger : https://www.python.org/downloads/
- Installer avec "Add Python to PATH"
- Vérifier : `python --version`

**Étape 2** : Installer les bibliothèques (une fois, 2 minutes)
```powershell
pip install requests
```

**Étape 3** : Installer le scanner (1 minute)
- Copier le dossier `DEPLOYMENT-MULTI-POSTES`
- Exécuter `INSTALLER.bat` en administrateur

**Étape 4** : Tester
- Scanner un QR code
- La fenêtre Python s'ouvre (rapide et légère) ✅

---

## 🚀 Avantages de la Version Python

✅ **Fenêtre dédiée rapide** (plus rapide que le navigateur)
✅ **Interface native Windows**
✅ **Aucun onglet de navigateur supplémentaire**
✅ **Légère et réactive**

---

## 🔄 Installation Python pour Déploiement Massif

### Option 1 : Installation Manuelle
- Installer Python sur chaque poste individuellement
- Recommandé pour 1-5 postes

### Option 2 : Installation Silencieuse (Script)

Créer un script `install-python.bat` :

```batch
@echo off
echo Installation de Python...

REM Télécharger Python (si pas déjà téléchargé)
if not exist "python-3.12.1-amd64.exe" (
    echo Telechargement de Python...
    curl -o python-3.12.1-amd64.exe https://www.python.org/ftp/python/3.12.1/python-3.12.1-amd64.exe
)

REM Installation silencieuse avec PATH
python-3.12.1-amd64.exe /quiet InstallAllUsers=1 PrependPath=1

echo Attente fin installation...
timeout /t 30 /nobreak

REM Installer les bibliothèques
pip install requests

echo Installation terminee!
pause
```

### Option 3 : GPO (Active Directory)
- Déployer Python via GPO avec installation silencieuse
- Configurer le PATH automatiquement
- Installer les bibliothèques via script de startup

---

## 📝 Liste de Vérification Pré-Déploiement

Avant de déployer sur un nouveau poste, vérifier :

- [ ] Python 3.10+ installé
- [ ] Python dans le PATH (commande `python` fonctionne)
- [ ] pip fonctionnel
- [ ] Bibliothèque `requests` installée
- [ ] Dossier DEPLOYMENT-MULTI-POSTES copié
- [ ] config.json configuré avec le bon token
- [ ] INSTALLER.bat exécuté en administrateur
- [ ] Test de scan effectué

---

## 🆘 Dépannage

### "python n'est pas reconnu..."

**Problème** : Python pas dans le PATH

**Solution** :
1. Désinstaller Python
2. Réinstaller en cochant **"Add Python to PATH"**

### "No module named 'tkinter'"

**Problème** : tkinter manquant

**Solution** :
```powershell
# Sur Windows, réinstaller Python en cochant "tcl/tk and IDLE"
```

### "No module named 'requests'"

**Problème** : requests pas installé

**Solution** :
```powershell
pip install requests
```

### La fenêtre Python ne s'ouvre pas

**Vérifier** :
1. Python est installé : `python --version`
2. Le fichier `scan-confirm.py` existe dans le dossier du scanner
3. Les logs : `logs\scanner-YYYY-MM-DD.log`

---

## 💡 Alternative sans Python

Si vous ne voulez pas installer Python sur tous les postes, le scanner peut fonctionner **sans Python** en ouvrant le navigateur web à la place.

Pour cela, pas besoin d'installer Python, mais la page s'ouvrira dans votre navigateur (Chrome, Edge, Firefox) au lieu d'une fenêtre dédiée.

---

## 📊 Récapitulatif

| Élément | Nécessaire ? | Temps d'installation | Fréquence |
|---------|--------------|---------------------|-----------|
| Python 3.10+ | ✅ OUI | 5 minutes | Une fois par poste |
| pip (inclus) | ✅ OUI | Automatique | - |
| requests | ✅ OUI | 1 minute | Une fois par poste |
| tkinter | ⚠️ Généralement inclus | - | - |
| Scanner | ✅ OUI | 1 minute | Une fois par poste |

**Temps total** : ~7 minutes par poste (installation Python incluse)

---

**Version** : 2.0.0  
**Date** : 6 janvier 2026  
**Python recommandé** : 3.10, 3.11, ou 3.12
