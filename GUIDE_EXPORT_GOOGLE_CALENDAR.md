# 📅 Guide : Exporter depuis Google Calendar vers CSV

## 🎯 Objectif

Exporter vos événements de renouvellement depuis Google Calendar au format CSV pour les importer dans l'application.

---

## 📋 Méthode 1 : Export via Google Takeout (Recommandé)

### Étapes

1. **Allez sur Google Takeout** : https://takeout.google.com
2. **Désélectionnez tout** (cliquez sur "Désélectionner tout")
3. **Cochez uniquement "Calendar"**
4. Cliquez sur **"Suivant"**
5. **Format** : Choisissez **"iCalendar (.ics)"** (format natif, recommandé)
6. **Fréquence** : Une seule fois
7. **Type de fichier** : ZIP (par défaut)
8. Cliquez sur **"Créer l'export"**
9. Attendez quelques minutes
10. **Téléchargez** le fichier ZIP
11. **Extrayez** le ZIP
12. Trouvez le fichier `.ics` de votre calendrier (ex: `calendar.ics`)

---

## 📋 Méthode 2 : Export direct depuis Google Calendar

### Si votre calendrier contient peu d'événements

1. **Ouvrez Google Calendar** : https://calendar.google.com
2. **Sélectionnez votre calendrier** dans la liste de gauche
3. Cliquez sur les **3 points** à côté du nom du calendrier
4. **Paramètres et partage**
5. Faites défiler jusqu'à **"Intégrer le calendrier"**
6. Ou utilisez **"Exporter le calendrier"** si disponible

**Note** : Cette méthode exporte généralement en format `.ics`, qu'il faudra convertir en CSV.

---

## 📋 Méthode 3 : Utilisation directe du fichier .ics

**✅ Le système supporte maintenant directement les fichiers .ics !**

Vous n'avez plus besoin de convertir en CSV. Uploadez directement votre fichier `.ics` exporté depuis Google Takeout.

Le format `.ics` (iCalendar) est préférable car il contient :
- ✅ Toutes les informations de récurrence (RRULE)
- ✅ Les dates de fin de récurrence (UNTIL)
- ✅ Les descriptions complètes
- ✅ Les métadonnées complètes des événements

---

## 📝 Formats supportés

### Format .ics (iCalendar) - Recommandé ✅

Le fichier `.ics` exporté depuis Google Takeout contient automatiquement :
- ✅ **SUMMARY** : Nom du patient (format: "Nom Prénom")
- ✅ **DTSTART** : Date et heure de début
- ✅ **RRULE** : Règle de récurrence (ex: `FREQ=WEEKLY;INTERVAL=3;UNTIL=20241231`)
- ✅ **DESCRIPTION** : Description (peut contenir le téléphone)

### Format CSV (Alternative)

Le fichier CSV doit contenir au minimum ces colonnes :

| Colonne | Obligatoire | Description | Exemple |
|---------|-------------|-------------|---------|
| `Subject` | ✅ Oui | Nom du patient (format: "Nom Prénom") | "DUPONT Jean" |
| `Start Date` | ✅ Oui | Date de début (YYYY-MM-DD ou DD/MM/YYYY) | "2024-01-15" |
| `Start Time` | ❌ Non | Heure de début | "09:00" |
| `Recurrence Pattern` | ❌ Non | Pattern de récurrence | "Every 3 weeks" |
| `Description` | ⚠️ Si nouveau patient | Description (peut contenir le téléphone) | "Tél: 0612345678" |

---

## 📋 Exemple de fichier CSV

```csv
Subject,Start Date,Start Time,End Date,End Time,All Day Event,Recurrence Pattern,Description
"DUPONT Jean",2024-01-15,09:00,2024-01-15,09:30,False,"Every 3 weeks","Tél: 0612345678"
"MARTIN Marie",2024-01-20,10:00,2024-01-20,10:30,False,"Every 3 weeks","Tél: 0623456789"
```

---

## 🔍 Vérifier votre fichier

### Pour les fichiers .ics :
- Ouvrez le fichier dans un éditeur de texte (Notepad++, VS Code, etc.)
- Vérifiez que les événements commencent par `BEGIN:VEVENT`
- Vérifiez que les noms sont dans `SUMMARY:`
- Vérifiez que les récurrences sont dans `RRULE:`

### Pour les fichiers CSV :
Avant l'import, ouvrez le fichier CSV dans Excel ou LibreOffice pour vérifier :

1. ✅ Les colonnes sont présentes
2. ✅ Le format des dates est correct
3. ✅ Les noms sont au format "Nom Prénom"
4. ✅ Les téléphones sont dans la description (pour les nouveaux patients)

---

## 🚀 Importer dans l'application

1. **Connectez-vous en tant qu'admin**
2. Allez dans **Admin** → **Import Google Calendar**
3. **Sélectionnez votre fichier .ics** (ou .csv)
4. Cliquez sur **"Importer"**
5. Consultez les résultats

**💡 Astuce** : Le format `.ics` est préférable car il contient toutes les informations de récurrence automatiquement.

---

## ⚠️ Notes importantes

1. **Format du nom** : Le système suppose "Nom Prénom" (dernier mot = prénom)
2. **Téléphone requis** : Pour créer un nouveau patient, le téléphone doit être dans la description
3. **Doublons** : Si un cycle existe déjà pour la même date R0, il sera ignoré
4. **Récurrence** : Le système détecte "Every X weeks" et calcule automatiquement les renouvellements
5. **Dates dimanche** : Automatiquement ajustées au lundi suivant

---

## 🆘 Dépannage

### Le fichier .ics n'est pas reconnu
- Vérifiez que c'est bien un fichier `.ics` (pas `.zip`)
- Si vous avez un ZIP, extrayez-le d'abord
- Vérifiez que le fichier commence par `BEGIN:VCALENDAR`

### Le fichier CSV n'est pas reconnu
- Vérifiez que c'est bien un fichier CSV (pas Excel .xlsx)
- Ouvrez-le dans un éditeur de texte pour vérifier le format

### Les dates ne sont pas reconnues
- Vérifiez le format : YYYY-MM-DD ou DD/MM/YYYY
- Évitez les formats avec l'heure uniquement

### Les patients ne sont pas créés
- Vérifiez que le téléphone est présent dans la description
- Format attendu : "Tél: 0612345678" ou "06 12 34 56 78"

---

## 💡 Conseils

1. **Testez d'abord** avec quelques lignes du CSV
2. **Vérifiez les résultats** après l'import
3. **Corrigez les erreurs** et réimportez si nécessaire
4. **Sauvegardez** votre CSV original avant modification

