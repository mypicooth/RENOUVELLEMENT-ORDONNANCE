# Scanner de QR codes en arrière-plan

Application Node.js qui écoute les scans de code-barres en arrière-plan, même quand vous êtes sur une autre application (comme WINPHARMA).

## Fonctionnement

L'application surveille le presse-papiers (clipboard) en continu. Quand un scanner de code-barres scanne un QR code, le contenu est automatiquement copié dans le presse-papiers, et l'application le détecte et l'envoie à l'API.

## Installation

### 0. Mettre à jour la base de données (depuis la racine du projet)

**Important** : Cette étape doit être faite depuis la racine du projet, pas depuis `barcode-scanner`.

```bash
# Depuis la racine du projet (RENOUVELLEMENT-ORDONNANCE)
npx prisma db push
```

Cela ajoute le champ `date_delivrance` nécessaire pour enregistrer les scans.

### 1. Installer les dépendances

```bash
cd barcode-scanner
npm install
```

**Note** : L'installation est simple et ne nécessite pas de compilateurs natifs (Visual Studio Build Tools). Seules les dépendances JavaScript pures sont utilisées (`axios` et `clipboardy`).

### 2. Configuration

Créer un fichier `.env` dans le dossier `barcode-scanner` :

```env
# URL de l'API (par défaut: http://localhost:3000)
API_URL=http://localhost:3000

# Token API pour l'authentification (optionnel mais recommandé)
# Ce token doit correspondre à SCANNER_API_TOKEN dans .env.local de Next.js
SCANNER_API_TOKEN=votre-token-securise-ici
```

**Générer un token sécurisé** :
- Utiliser un générateur en ligne
- Ou : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 3. Configurer le token dans Next.js

Dans le fichier `.env.local` à la racine du projet Next.js :

```env
SCANNER_API_TOKEN=votre-token-securise-ici
```

## Utilisation

### Mode simple (manuel)

```bash
npm start
```

L'application reste active dans le terminal. Appuyez sur `Ctrl+C` pour l'arrêter.

### Mode service Windows (démarrage automatique)

Pour installer comme service Windows qui démarre automatiquement :

1. Installer `node-windows` globalement :
```bash
npm install -g node-windows
```

2. Créer un fichier `install-service.js` :

```javascript
const Service = require('node-windows').Service;
const path = require('path');

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
  console.log('Service installé !');
  svc.start();
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

## Format des QR codes

Les QR codes doivent contenir un JSON au format :
```json
{
  "renewalId": "clx...",
  "type": "RENEWAL" | "RENEWAL_END"
}
```

## Dépannage

### L'application ne détecte pas les scans

1. Vérifiez que votre scanner de code-barres copie bien dans le presse-papiers
2. Testez en copiant manuellement un QR code JSON dans le presse-papiers
3. Vérifiez que l'API est accessible : `http://localhost:3000/api/renewals/scan-public`

### Erreur "Token API invalide"

- Vérifiez que le token dans `.env` du scanner correspond à `SCANNER_API_TOKEN` dans `.env.local` de Next.js
- Redémarrer l'application Next.js après avoir modifié `.env.local`

### Erreur "Pas de réponse du serveur"

- Vérifiez que l'application Next.js est démarrée
- Vérifiez l'URL de l'API dans la configuration
- Vérifiez les paramètres de firewall

### L'application consomme trop de ressources

- Augmentez `SCAN_INTERVAL` dans `scanner.js` (par exemple à 500ms)

## Notes

- L'application fonctionne uniquement sur Windows
- Nécessite que le scanner de code-barres copie dans le presse-papiers (mode standard)
- Fonctionne en arrière-plan même si l'application web n'est pas ouverte

