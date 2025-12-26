# Guide de démarrage rapide

## Installation initiale

```bash
# 1. Installer les dépendances
npm install

# 2. Créer le fichier .env
cp .env.example .env
# Puis éditer .env et remplir les valeurs

# 3. Générer le client Prisma
npm run db:generate

# 4. Créer la base de données
npm run db:push

# 5. Remplir avec les données initiales
npm run db:seed
```

## Lancer l'application

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Connexion

- **Email** : `admin@pharmacie.local`
- **Mot de passe** : `admin123`

⚠️ **À changer en production !**

## Commandes utiles

```bash
# Développement
npm run dev

# Build production
npm run build
npm run start

# Base de données
npm run db:push          # Pousser le schéma (dev)
npm run db:migrate       # Créer une migration
npm run db:studio        # Ouvrir Prisma Studio
npm run db:seed          # Remplir avec les données initiales
```

## Structure des données

### Patient
- Nom, prénom, téléphone normalisé
- Consentement obligatoire pour SMS
- Notes optionnelles

### Cycle de prescription
- Date première délivrance (R0)
- Nombre de renouvellements
- Intervalle en jours (défaut: 21)

### Renouvellements
- Générés automatiquement à la création du cycle
- R0 = date première délivrance
- R1 = R0 + 21 jours
- R2 = R1 + 21 jours
- etc.

## Workflow typique

1. **Recruter un patient** (`/patients/new`)
   - Saisir les informations
   - Cocher le consentement
   - Optionnel : créer le cycle de renouvellement

2. **Consulter le planning du jour** (`/dashboard`)
   - Voir les renouvellements à préparer
   - Changer le statut (À préparer → En préparation → Prêt)
   - Envoyer un SMS quand c'est prêt
   - Imprimer la liste

3. **Gérer les templates SMS** (`/admin/templates-sms`) - Admin uniquement
   - Créer/modifier les templates
   - Maximum 160 caractères
   - Pas d'emojis

## Variables d'environnement

### Obligatoires
- `DATABASE_URL` : URL de la base de données
- `NEXTAUTH_SECRET` : Secret pour NextAuth (générer avec `openssl rand -base64 32`)
- `NEXTAUTH_URL` : URL de l'application (ex: `http://localhost:3000`)

### Optionnelles (pour SMS)
- `TEXTINGHOUSE_USER` : Email de connexion TextingHouse
- `TEXTINGHOUSE_PASS` : Mot de passe TextingHouse
- `TEXTINGHOUSE_FROM` : Expéditeur (optionnel)

## Dépannage

### Erreur "Non authentifié"
- Vérifier que `NEXTAUTH_SECRET` est défini dans `.env`
- Vider les cookies du navigateur

### Erreur base de données
- Vérifier `DATABASE_URL` dans `.env`
- Exécuter `npm run db:push`

### SMS ne s'envoient pas
- Vérifier les identifiants TextingHouse dans `.env`
- Consulter les logs dans Prisma Studio : `npm run db:studio`




