# Installation du Scanner en Arrière-plan

## Vue d'ensemble

Le scanner en arrière-plan permet de scanner les QR codes même quand vous êtes sur une autre application (comme WINPHARMA). Il fonctionne en surveillant le presse-papiers (clipboard) et envoie automatiquement les scans à l'API.

## Installation complète

### Étape 1 : Mettre à jour la base de données

Ajouter le champ `date_delivrance` à la table `renewal_events`.

**Option A : Via Supabase Dashboard (Recommandé - Plus rapide)**

1. Ouvrir votre projet Supabase
2. Aller dans l'éditeur SQL
3. Exécuter cette commande :

```sql
ALTER TABLE "renewal_events" 
ADD COLUMN IF NOT EXISTS "date_delivrance" TIMESTAMP(3);
```

**Option B : Via Prisma (si la connexion fonctionne)**

```bash
# Depuis la racine du projet (RENOUVELLEMENT-ORDONNANCE)
npx prisma db push
```

**Note** : Si `prisma db push` reste bloqué, utilisez l'Option A (SQL direct dans Supabase).

### Étape 2 : Installer les dépendances du scanner

```bash
cd barcode-scanner
npm install
```

**Note** : L'installation est simple et ne nécessite pas de compilateurs natifs. Seules les dépendances JavaScript pures sont utilisées.

### Étape 3 : Générer un token API sécurisé

Générer un token sécurisé (32 caractères hexadécimaux) :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ou utiliser un générateur en ligne.

### Étape 4 : Configurer le token dans Next.js

Dans le fichier `.env.local` à la racine du projet Next.js :

```env
SCANNER_API_TOKEN=votre-token-securise-ici
```

**Important** : Redémarrer l'application Next.js après avoir ajouté cette variable.

### Étape 5 : Configurer le scanner

Créer un fichier `.env` dans le dossier `barcode-scanner` :

```env
API_URL=http://localhost:3000
SCANNER_API_TOKEN=votre-token-securise-ici
```

**Le même token** doit être utilisé dans Next.js et dans le scanner.

## Utilisation

### Mode simple (manuel)

```bash
cd barcode-scanner
npm start
```

L'application reste active dans le terminal. Appuyez sur `Ctrl+C` pour l'arrêter.

### Mode service Windows (démarrage automatique)

Pour installer comme service Windows qui démarre automatiquement :

1. Installer `node-windows` globalement :
```bash
npm install -g node-windows
```

2. Créer un fichier `install-service.js` dans `barcode-scanner` :

```javascript
const Service = require('node-windows').Service;
const path = require('path');
require('dotenv').config();

const svc = new Service({
  name: 'Renouvellement QR Scanner',
  description: 'Scanner de QR codes en arrière-plan pour les renouvellements',
  script: path.join(__dirname, 'scanner.js'),
  env: [
    {
      name: "API_URL",
      value: process.env.API_URL || "http://localhost:3000"
    },
    {
      name: "SCANNER_API_TOKEN",
      value: process.env.SCANNER_API_TOKEN || ""
    }
  ]
});

svc.on('install', function() {
  console.log('Service installé avec succès !');
  svc.start();
});

svc.on('start', function() {
  console.log('Service démarré !');
});

svc.install();
```

3. Installer le service :
```bash
node install-service.js
```

Le service sera installé et démarrera automatiquement au démarrage de Windows.

## Configuration du Scanner de Code-barres

Votre scanner de code-barres doit être configuré pour :
- **Copier dans le presse-papiers** (mode standard)
- La plupart des scanners modernes font cela par défaut

## Test

1. Démarrer l'application Next.js
2. Démarrer le scanner : `cd barcode-scanner && npm start`
3. Copier manuellement un QR code JSON dans le presse-papiers :
   ```json
   {"renewalId":"clx...","type":"RENEWAL"}
   ```
4. Le scanner devrait détecter et envoyer le scan automatiquement

## Dépannage

### Le scanner ne détecte pas les scans

1. **Vérifier que le scanner copie dans le presse-papiers** :
   - Scanner un code et coller (Ctrl+V) dans un éditeur de texte
   - Si rien n'apparaît, le scanner n'est pas configuré correctement

2. **Vérifier les logs** :
   - Le scanner affiche les scans détectés dans la console
   - Vérifier les messages d'erreur

3. **Tester manuellement** :
   - Copier un QR code JSON dans le presse-papiers
   - Le scanner devrait le détecter immédiatement

### Erreur "Token API invalide"

- Vérifier que le token dans `.env` du scanner correspond à `SCANNER_API_TOKEN` dans `.env.local` de Next.js
- Redémarrer l'application Next.js après avoir modifié `.env.local`

### Erreur "Pas de réponse du serveur"

- Vérifier que l'application Next.js est démarrée
- Vérifier l'URL de l'API (par défaut `http://localhost:3000`)
- Vérifier les paramètres de firewall

### Le service ne démarre pas

- Vérifier les permissions (le service doit être installé en tant qu'administrateur)
- Vérifier les logs dans l'Observateur d'événements Windows

## Sécurité

- Le token API doit être **fort et secret**
- Ne pas commiter le fichier `.env` dans Git
- Changer le token régulièrement en production
- Utiliser HTTPS en production

## Notes

- Le scanner fonctionne uniquement sur Windows
- Nécessite Node.js installé
- Fonctionne en arrière-plan même si l'application web n'est pas ouverte
- Compatible avec tous les scanners de code-barres qui copient dans le presse-papiers

## Format des QR codes

Les QR codes doivent contenir un JSON au format :
```json
{
  "renewalId": "clx...",
  "type": "RENEWAL" | "RENEWAL_END"
}
```

- **RENEWAL** : Renouvellement normal - recalcule le prochain renouvellement à +21 jours
- **RENEWAL_END** : Fin d'ordonnance - termine le cycle et annule les renouvellements futurs

