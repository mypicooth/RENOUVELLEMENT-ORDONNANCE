# Solution au problème d'accès au presse-papiers

## Problème identifié

Les services Windows s'exécutent dans la **session 0** (isolée) et n'ont **pas accès au presse-papiers** de la session utilisateur. C'est une limitation de sécurité de Windows.

## Solution recommandée : Mode démarrage automatique

Au lieu d'utiliser un service Windows, utilisez le **mode démarrage automatique** qui permet à l'application de s'exécuter dans la session de l'utilisateur et d'accéder au presse-papiers.

### Installation

1. **Arrêter et supprimer le service** (si installé) :
   ```cmd
   net stop RenouvellementQRScanner
   sc delete RenouvellementQRScanner
   ```

2. **Installer en mode démarrage automatique** :
   - Double-cliquez sur `install-startup.bat`
   - L'application sera ajoutée au démarrage automatique de Windows

3. **Tester** :
   - Redémarrer l'ordinateur ou exécuter manuellement `renouvellement-scanner.exe`
   - Copier `{"renewalId":"test123","type":"RENEWAL"}` dans le presse-papiers
   - Vérifier les logs dans `logs/scanner-YYYY-MM-DD.log`

### Avantages

- ✅ Accès au presse-papiers fonctionnel
- ✅ Démarré automatiquement à la connexion
- ✅ S'exécute dans la session utilisateur
- ✅ Plus simple à déboguer

### Inconvénients

- ⚠️ L'application doit être lancée pour chaque utilisateur
- ⚠️ Une fenêtre console peut apparaître (peut être masquée)

## Alternative : Service avec interaction bureau

Si vous devez absolument utiliser un service, vous pouvez essayer de configurer le service pour permettre l'interaction avec le bureau :

1. Ouvrir `services.msc`
2. Trouver `RenouvellementQRScanner`
3. Clic droit > Propriétés
4. Onglet "Connexion"
5. Cocher "Autoriser le service à interagir avec le bureau"
6. Redémarrer le service

**Note** : Cette option peut ne pas fonctionner sur toutes les versions de Windows et peut poser des problèmes de sécurité.

## Vérification

Pour vérifier que l'application détecte le presse-papiers :

1. Exécuter `renouvellement-scanner.exe` manuellement
2. Copier `{"renewalId":"test123","type":"RENEWAL"}` dans le presse-papiers
3. Vérifier les logs - vous devriez voir :
   ```
   🔄 Changement clipboard détecté (XX caractères): {"renewalId":"test123"...
   📋 Contenu JSON détecté, parsing...
   ✅ QR code valide détecté: renewalId=test123..., type=RENEWAL
   ```

Si vous ne voyez pas ces messages, l'application ne peut toujours pas accéder au presse-papiers.


