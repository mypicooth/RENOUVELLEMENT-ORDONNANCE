========================================================================
  SCANNER QR - RENOUVELLEMENT ORDONNANCES
========================================================================

INSTALLATION RAPIDE
-------------------

1. Installez Python 3.10+ sur l'ordinateur
   - Telechargez sur: https://www.python.org/downloads/
   - Cochez "Add Python to PATH"
   - Installez pip et tkinter

2. Installez les dependances Python:
   pip install requests

3. Lancez l'installation:
   - Clic droit sur INSTALLER.bat
   - "Executer en tant qu'administrateur"

4. Testez en scannant un QR code


FICHIERS IMPORTANTS
-------------------

INSTALLER.bat           - Installation automatique
DESINSTALLER.bat        - Desinstallation
TEST-SCANNER.bat        - Tester si le scanner fonctionne
config.json             - Configuration API
keyboard-hook.ps1       - Capture clavier en arriere-plan
scan-confirm.py         - Fenetre de confirmation Python


VERIFICATIONS
-------------

Le scanner fonctionne si:
  tasklist | find "renouvellement"
  
Voir les logs:
  Ouvrir le dossier: logs\


COMMANDES UTILES
----------------

Demarrer:  schtasks /Run /TN RenouvellementQRScanner
Arreter:   taskkill /IM renouvellement-scanner.exe /F
Statut:    tasklist | find "renouvellement"


FONCTIONNEMENT
--------------

Le scanner:
1. Demarre automatiquement a chaque connexion (tache planifiee)
2. Capture le clavier en arriere-plan (fonctionne minimise)
3. Detecte les QR codes contenant "renewalId"
4. Ouvre une fenetre Python pour confirmation
5. Envoie les donnees a l'API


SUPPORT
-------

Probleme de scan:
- Verifiez que Python 3.10+ est installe
- Verifiez config.json (API_URL et token)
- Consultez logs\scanner-YYYY-MM-DD.log

Le scanner ne demarre pas:
- Double-cliquez sur renouvellement-scanner.exe pour tester
- Verifiez l'Observateur d'evenements Windows

Fenetre ne s'ouvre pas:
- Testez: python scan-confirm.py test RENEWAL https://... token
- Installez: pip install requests


========================================================================
