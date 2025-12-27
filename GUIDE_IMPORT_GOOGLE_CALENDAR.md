# 📅 Guide d'import depuis Google Calendar

## 📋 Étapes pour exporter depuis Google Calendar

### Méthode 1 : Export complet du calendrier (Recommandé)

1. **Allez sur Google Calendar** : https://calendar.google.com
2. **Paramètres** (icône ⚙️ en haut à droite)
3. **Paramètres** → **Import et export**
4. Cliquez sur **"Exporter"**
5. Un fichier ZIP sera téléchargé contenant tous vos calendriers
6. **Extrayez le ZIP** et trouvez le fichier `.ics` de votre calendrier
7. **Convertissez le fichier .ics en CSV** :
   - Utilisez un outil en ligne : https://icaltocsv.com/ ou https://convertio.co/fr/ics-csv/
   - Ou utilisez le script fourni ci-dessous

### Méthode 2 : Export CSV direct (si disponible)

1. Dans Google Calendar, sélectionnez les événements
2. **Plus d'options** (3 points) → **Exporter**
3. Choisissez le format **CSV**
4. Téléchargez le fichier

### Méthode 3 : Export manuel via Google Takeout

1. Allez sur https://takeout.google.com
2. Sélectionnez **Calendar**
3. Choisissez le format **CSV**
4. Téléchargez l'archive

---

## 📝 Format CSV attendu

Le fichier CSV doit contenir au minimum ces colonnes :

| Colonne | Description | Exemple |
|---------|-------------|---------|
| `Subject` | Nom du patient (format: "Nom Prénom") | "DUPONT Jean" |
| `Start Date` | Date de début (format: YYYY-MM-DD ou DD/MM/YYYY) | "2024-01-15" |
| `Start Time` | Heure de début (optionnel) | "09:00" |
| `Recurrence Pattern` | Pattern de récurrence (optionnel) | "Every 3 weeks" |
| `Description` | Description (peut contenir le téléphone) | "Tél: 0612345678" |

---

## 🔄 Conversion .ics vers CSV

Si vous avez un fichier `.ics`, vous pouvez le convertir en CSV :

### Option 1 : Outil en ligne
- https://icaltocsv.com/
- https://convertio.co/fr/ics-csv/

### Option 2 : Script Node.js (à créer)

```javascript
// scripts/ics-to-csv.js
const ics = require('ics');
const fs = require('fs');

// Lire le fichier .ics
const icsContent = fs.readFileSync('calendar.ics', 'utf8');
// Convertir en CSV...
```

---

## 🚀 Utilisation de l'import

1. **Connectez-vous en tant qu'admin**
2. Allez dans **Admin** → **Import Google Calendar**
3. **Sélectionnez votre fichier CSV**
4. Cliquez sur **"Importer"**
5. Consultez les résultats de l'import

---

## ⚙️ Fonctionnement de l'import

L'import va :

1. **Parser le CSV** ligne par ligne
2. **Extraire les informations** :
   - Nom et prénom depuis le "Subject"
   - Date de début depuis "Start Date"
   - Téléphone depuis "Description" (si présent)
   - Pattern de récurrence depuis "Recurrence Pattern"
3. **Créer ou trouver le patient** :
   - Si le patient existe (même nom/prénom) → utilise l'existant
   - Sinon → crée un nouveau patient (nécessite le téléphone)
4. **Créer le cycle de prescription** :
   - R0 = date de début
   - R1, R2, etc. = calculés selon l'intervalle (21 jours par défaut)
   - Les dates sont ajustées pour éviter les dimanches (avancées au lundi)
5. **Générer les renouvellements** automatiquement

---

## 📋 Exemple de fichier CSV

```csv
Subject,Start Date,Start Time,End Date,End Time,Recurrence Pattern,Description
"DUPONT Jean",2024-01-15,09:00,2024-01-15,09:30,"Every 3 weeks","Tél: 0612345678"
"MARTIN Marie",2024-01-20,10:00,2024-01-20,10:30,"Every 3 weeks","Tél: 0623456789"
```

---

## ⚠️ Notes importantes

1. **Format du nom** : Le système suppose "Nom Prénom" (dernier mot = prénom)
2. **Téléphone requis** : Pour créer un nouveau patient, le téléphone doit être dans la description
3. **Doublons** : Si un cycle existe déjà pour la même date R0, il sera ignoré
4. **Récurrence** : Le système détecte "Every X weeks" et calcule le nombre d'occurrences
5. **Dates dimanche** : Automatiquement ajustées au lundi suivant

---

## 🆘 Dépannage

### Erreur : "Format nom/prénom invalide"
- Vérifiez que le Subject contient au moins 2 mots (nom et prénom)

### Erreur : "Téléphone manquant"
- Ajoutez le téléphone dans la description de l'événement Google Calendar
- Format : "Tél: 0612345678" ou "06 12 34 56 78"

### Erreur : "Date invalide"
- Vérifiez le format de la date dans le CSV
- Formats acceptés : YYYY-MM-DD ou DD/MM/YYYY

### Les renouvellements ne sont pas créés
- Vérifiez que le "Recurrence Pattern" est présent
- Par défaut, 12 renouvellements sont créés si pas de pattern

---

## 💡 Conseils

1. **Vérifiez le CSV** avant l'import (ouvrez-le dans Excel/LibreOffice)
2. **Testez avec quelques lignes** d'abord
3. **Vérifiez les résultats** après l'import
4. **Corrigez les erreurs** et réimportez si nécessaire

