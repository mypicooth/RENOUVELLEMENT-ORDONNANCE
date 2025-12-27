# 📅 Configuration de l'import via API Google Calendar

## 🎯 Vue d'ensemble

Cette fonctionnalité permet d'importer directement les événements depuis Google Calendar via l'API, sans avoir besoin d'exporter un fichier .ics ou .csv.

## 🔧 Configuration requise

### 1. Créer un projet Google Cloud

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Notez l'ID du projet

### 2. Activer l'API Google Calendar

1. Dans le menu, allez dans **APIs & Services** > **Library**
2. Recherchez "Google Calendar API"
3. Cliquez sur **Enable** pour activer l'API

### 3. Créer des identifiants OAuth 2.0

1. Allez dans **APIs & Services** > **Credentials**
2. Cliquez sur **Create Credentials** > **OAuth client ID**
3. Si c'est la première fois, configurez l'écran de consentement OAuth :
   - Type d'application : **External** (ou Internal si vous utilisez Google Workspace)
   - Remplissez les informations requises
   - Ajoutez votre email comme test user si nécessaire
4. Créez l'OAuth client ID :
   - Type d'application : **Web application**
   - Nom : "Renouvellement Ordonnance"
   - **Authorized redirect URIs** : 
     ```
     http://localhost:3000/api/admin/google-calendar/callback
     https://votre-domaine.com/api/admin/google-calendar/callback
     ```
   - Cliquez sur **Create**
5. **Copiez le Client ID et le Client Secret**

### 4. Configurer les variables d'environnement

Ajoutez ces variables dans votre fichier `.env.local` (et dans Vercel/environnement de production) :

```env
GOOGLE_CLIENT_ID=votre_client_id_ici
GOOGLE_CLIENT_SECRET=votre_client_secret_ici
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/admin/google-calendar/callback
# En production, utilisez :
# GOOGLE_CALENDAR_REDIRECT_URI=https://votre-domaine.com/api/admin/google-calendar/callback
```

**Pour Vercel :**
1. Allez dans votre projet Vercel
2. **Settings** > **Environment Variables**
3. Ajoutez les trois variables ci-dessus

## 📖 Utilisation

### Dans l'application

1. Allez sur la page **Import Google Calendar** (menu Admin)
2. Cliquez sur **"Se connecter à Google Calendar"**
3. Autorisez l'application à accéder à votre calendrier
4. Une fois connecté, cliquez sur **"Importer depuis Google Calendar"**
5. Les événements seront importés automatiquement

## 🔍 Format des événements attendus

Pour que l'import fonctionne correctement, vos événements Google Calendar doivent respecter ce format :

### Titre de l'événement
- Format : `Nom Prénom` ou `Prénom Nom`
- Exemple : `Dupont Jean` ou `Jean Dupont`

### Description
- Doit contenir un numéro de téléphone au format français
- Format accepté : `+33 6 12 34 56 78` ou `06 12 34 56 78`

### Récurrence (optionnel)
- Si l'événement est récurrent, le système détectera automatiquement :
  - L'intervalle (ex: toutes les 3 semaines)
  - Le nombre d'occurrences ou la date de fin
- Format RRULE supporté : `FREQ=WEEKLY;INTERVAL=3;COUNT=13`

## 🔒 Sécurité

- Les tokens d'accès sont stockés dans des cookies HttpOnly sécurisés
- Les tokens expirent après 1 heure (access_token) ou 30 jours (refresh_token)
- Seuls les administrateurs peuvent accéder à cette fonctionnalité
- L'application demande uniquement l'accès en lecture (`calendar.readonly`)

## 🐛 Dépannage

### Erreur "Token d'accès manquant"
- Déconnectez-vous et reconnectez-vous à Google Calendar
- Vérifiez que les cookies sont activés dans votre navigateur

### Erreur "Invalid redirect URI"
- Vérifiez que l'URI de redirection dans Google Cloud Console correspond exactement à celui dans `.env.local`
- Les URIs doivent correspondre exactement (http vs https, avec ou sans slash final)

### Erreur "Access denied"
- Vérifiez que l'API Google Calendar est bien activée dans Google Cloud Console
- Vérifiez que vous avez autorisé l'application lors de la connexion

### Les événements ne s'importent pas
- Vérifiez que le format du titre est correct (Nom Prénom)
- Vérifiez que la description contient un numéro de téléphone valide
- Vérifiez les logs du serveur pour plus de détails

