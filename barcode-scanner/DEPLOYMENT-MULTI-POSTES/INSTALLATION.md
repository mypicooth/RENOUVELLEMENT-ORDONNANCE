# Installation du Scanner de QR Codes - Renouvellement d'Ordonnances

## 📦 Contenu du Package

Ce dossier contient tout le nécessaire pour installer le scanner de QR codes sur un nouveau poste :

- `renouvellement-scanner.exe` : Exécutable principal
- `keyboard-hook.ps1` : Hook clavier global Windows (capture même si minimisé)
- `scan-confirm.py` : Fenêtre de confirmation Python (optionnel)
- `config.json` : Configuration de l'application
- `install-service.bat` : Installation comme service Windows
- `install-service.ps1` : Script PowerShell d'installation
- `README-INSTALLATION.txt` : Instructions d'installation

## ⚙️ Prérequis

- **Windows 10/11** (64 bits)
- **PowerShell 5.1+** (installé par défaut sur Windows 10/11)
- **Droits administrateur** (pour installation comme service)
- **Python 3.x** (optionnel, pour la fenêtre de confirmation)

## 🚀 Installation Rapide (Recommandée)

### Option 1 : Installation comme Service Windows (Démarrage Automatique)

1. **Copier le dossier complet** sur le poste cible (ex: `C:\Scanner\`)
2. **Ouvrir PowerShell en Administrateur** (clic droit > "Exécuter en tant qu'administrateur")
3. **Naviguer vers le dossier** :
   ```powershell
   cd "C:\Scanner"
   ```
4. **Lancer l'installation** :
   ```powershell
   .\install-service.bat
   ```
5. Le scanner démarre automatiquement et se lancera à chaque démarrage de Windows

### Option 2 : Lancement Manuel

1. **Copier le dossier complet** sur le poste cible
2. **Double-cliquer** sur `renouvellement-scanner.exe`
3. Le scanner fonctionne tant que la fenêtre est ouverte (peut être minimisée)

## 📝 Configuration

### Modifier l'URL de l'API

Éditer le fichier `config.json` :

```json
{
  "API_URL": "https://renouvellement-ordonnance.vercel.app",
  "SCANNER_API_TOKEN": "votre_token_api",
  "SCAN_INTERVAL": 50,
  "MIN_LENGTH": 20
}
```

**Important** : Après modification de la configuration, redémarrer le scanner ou le service.

## 🔧 Dépannage

### Le scanner ne détecte pas les QR codes

1. **Vérifier que le hook clavier fonctionne** :
   - Logs dans : `logs\scanner-YYYY-MM-DD.log`
   - Rechercher : `Hook clavier global activé`

2. **Vérifier le layout clavier** :
   - Le scanner est configuré pour **clavier AZERTY français**
   - Pour autre layout, modifier `keyboard-hook.ps1` lignes 185-240

3. **Tester le scanner** :
   - Scanner un QR code contenant : `{"renewalId":"test123","type":"RENEWAL"}`
   - Vérifier les logs pour voir si détecté

### Le service ne démarre pas

1. **Vérifier l'installation** :
   ```powershell
   Get-Service -Name "RenouvellementsScanner" -ErrorAction SilentlyContinue
   ```

2. **Réinstaller le service** :
   ```powershell
   .\uninstall-service.bat
   .\install-service.bat
   ```

3. **Vérifier les droits** :
   - Assurez-vous d'exécuter en tant qu'administrateur

### Erreur "clipboardy non disponible"

C'est normal ! Le scanner fonctionne uniquement avec le hook clavier global, pas besoin de clipboardy.

## 📂 Structure des Dossiers

```
Scanner/
├── renouvellement-scanner.exe   # Exécutable principal
├── keyboard-hook.ps1            # Hook clavier Windows
├── scan-confirm.py              # Fenêtre confirmation (optionnel)
├── config.json                  # Configuration
├── install-service.bat          # Installation service
├── install-service.ps1          # Script PowerShell
├── README-INSTALLATION.txt      # Instructions
└── logs/                        # Logs de l'application
    └── scanner-YYYY-MM-DD.log
```

## 🔒 Sécurité

- Le token API est stocké dans `config.json` (ne pas partager)
- Les logs peuvent contenir des informations sensibles (vérifier avant partage)
- Le service s'exécute avec les droits SYSTEM

## 🆘 Support

En cas de problème :

1. **Consulter les logs** : `logs\scanner-YYYY-MM-DD.log`
2. **Vérifier la configuration** : `config.json`
3. **Tester en mode manuel** : Lancer `renouvellement-scanner.exe` directement

## 🔄 Mise à Jour

Pour mettre à jour le scanner sur un poste :

1. **Arrêter le service** :
   ```powershell
   Stop-Service -Name "RenouvellementsScanner"
   ```
2. **Remplacer les fichiers** :
   - `renouvellement-scanner.exe`
   - `keyboard-hook.ps1` (si modifications)
3. **Redémarrer le service** :
   ```powershell
   Start-Service -Name "RenouvellementsScanner"
   ```

## ✅ Vérification de l'Installation

Après installation, vérifier :

1. ✅ Le service est démarré : `Get-Service "RenouvellementsScanner"`
2. ✅ Le hook clavier est actif : Vérifier les logs
3. ✅ Un scan test fonctionne : Scanner un QR code de test
4. ✅ La fenêtre de confirmation s'ouvre

---

**Version** : 1.0.0  
**Date** : 5 janvier 2026  
**Système** : Windows 10/11 (64 bits)
