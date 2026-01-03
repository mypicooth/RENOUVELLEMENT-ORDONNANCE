# Résolution de l'erreur "Le service ne répond pas à la fonction de maintenance" (2186)

## Diagnostic

Cette erreur indique que le service Windows ne peut pas démarrer l'application. Le service est créé mais l'exécutable plante immédiatement au démarrage.

## Solutions

### Solution 1 : Vérifier les logs

L'application écrit maintenant les logs dans un fichier. Vérifiez :

1. **Dans le dossier de l'application** :
   - Cherchez un dossier `logs/`
   - Ouvrez le fichier `scanner-YYYY-MM-DD.log` le plus récent
   - Cherchez les erreurs

2. **Dans l'Observateur d'événements Windows** :
   - Ouvrir `eventvwr.msc`
   - Aller dans "Journaux Windows" > "Application"
   - Filtrer par source "Application Error" ou chercher "renouvellement-scanner"
   - Vérifier les erreurs récentes

### Solution 2 : Tester l'exécutable manuellement

1. Ouvrir une invite de commande dans le dossier de l'application
2. Exécuter :
   ```cmd
   renouvellement-scanner.exe
   ```
3. Observer les messages d'erreur qui s'affichent
4. Si l'application démarre, appuyez sur Ctrl+C pour l'arrêter

### Solution 3 : Vérifier config.json

1. Ouvrir `config.json` avec un éditeur de texte
2. Vérifier que le JSON est valide (pas de virgule en trop, guillemets corrects)
3. Format attendu :
   ```json
   {
     "API_URL": "https://renouvellement-ordonnance.vercel.app",
     "SCANNER_API_TOKEN": "",
     "SCAN_INTERVAL": 100,
     "MIN_LENGTH": 20
   }
   ```

### Solution 4 : Vérifier l'antivirus

L'antivirus peut bloquer l'exécution. Vérifiez :
- Les logs de l'antivirus
- Ajoutez une exception pour `renouvellement-scanner.exe` si nécessaire

### Solution 5 : Réinstaller le service

1. Arrêter le service (s'il est démarré) :
   ```cmd
   net stop RenouvellementQRScanner
   ```

2. Supprimer le service :
   ```cmd
   sc delete RenouvellementQRScanner
   ```

3. Réinstaller :
   - Double-cliquez sur `install-service.bat` (en tant qu'administrateur)

### Solution 6 : Vérifier les permissions

Le service s'exécute avec le compte "LocalSystem". Vérifiez que :
- Le fichier `renouvellement-scanner.exe` est accessible
- Le fichier `config.json` est accessible
- Le service peut accéder au presse-papiers Windows

## Nouveautés dans cette version

✅ **Système de logging** : Les logs sont maintenant écrits dans `logs/scanner-YYYY-MM-DD.log`
✅ **Meilleure gestion d'erreurs** : L'application ne plante plus silencieusement
✅ **Scripts de diagnostic** : Utilisez `diagnostic-service.bat` pour diagnostiquer

## Après résolution

Une fois le problème résolu, vérifiez que le service fonctionne :

```cmd
sc query RenouvellementQRScanner
```

Le statut doit être "RUNNING".

