# Diagnostic - Scanner ne détecte pas les QR codes

## Vérifications à effectuer

### 1. Vérifier que le service est démarré

```cmd
sc query RenouvellementQRScanner
```

Le statut doit être `RUNNING`. Si ce n'est pas le cas :
```cmd
net start RenouvellementQRScanner
```

### 2. Vérifier les logs

Consultez les fichiers dans le dossier `logs/` :
- `scanner-YYYY-MM-DD.log` : Logs principaux
- `startup-YYYY-MM-DD.log` : Logs de démarrage

Recherchez :
- `✅ Scanner démarré` : Confirme que le scanner est actif
- `📋 Surveillance du presse-papiers activée` : Confirme la surveillance
- `Contenu clipboard détecté` : Indique que le scanner lit le presse-papiers
- `✅ QR code valide détecté` : Confirme la détection d'un QR code
- `Ouverture de la page de scan` : Confirme l'ouverture du navigateur

### 3. Vérifier la configuration

Ouvrez `config.json` et vérifiez :
```json
{
  "API_URL": "https://renouvellement-ordonnance.vercel.app",
  "SCANNER_API_TOKEN": "votre_token_ici"
}
```

### 4. Tester manuellement

1. Copiez ce JSON dans le presse-papiers :
```json
{"renewalId":"test123","type":"RENEWAL"}
```

2. Attendez 1-2 secondes

3. Vérifiez les logs pour voir si le scanner a détecté

### 5. Problèmes courants

**Le scanner ne détecte rien :**
- Vérifiez que le service est bien démarré
- Vérifiez les permissions d'accès au presse-papiers
- Vérifiez que le format du QR code est bien JSON : `{"renewalId":"...","type":"RENEWAL"}`

**Le scanner détecte mais n'ouvre pas le navigateur :**
- Vérifiez l'URL dans `config.json` (doit être accessible)
- Vérifiez les logs pour les erreurs d'ouverture du navigateur
- Essayez d'ouvrir manuellement : `https://renouvellement-ordonnance.vercel.app/scan?renewalId=test&type=RENEWAL`

**La page s'ouvre mais affiche une erreur :**
- Vérifiez que l'API est accessible
- Vérifiez les logs du navigateur (F12 > Console)
- Vérifiez que le `renewalId` existe dans la base de données

### 6. Commandes utiles

```cmd
# Vérifier le statut du service
sc query RenouvellementQRScanner

# Redémarrer le service
net stop RenouvellementQRScanner
net start RenouvellementQRScanner

# Voir les logs en temps réel (PowerShell)
Get-Content logs\scanner-*.log -Wait -Tail 20
```




