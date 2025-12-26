# Application de Renouvellement d'Ordonnances - Pharmacie Saint-Laurent

Application web interne pour gérer les renouvellements d'ordonnances de façon simple et efficace.

## 🚀 Installation

### Prérequis

- Node.js 18+ 
- npm ou yarn

### Étapes d'installation

1. **Installer les dépendances**

```bash
npm install
```

2. **Configurer les variables d'environnement**

Créer un fichier `.env` à la racine du projet :

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-me-in-production-generate-a-random-string"

# TextingHouse (optionnel pour le développement)
TEXTINGHOUSE_USER="contact@pharmaciesaintlaurent.re"
TEXTINGHOUSE_PASS="votre-mot-de-passe"
TEXTINGHOUSE_FROM=""
```

**Important** : Pour générer un `NEXTAUTH_SECRET` sécurisé, vous pouvez utiliser :
```bash
openssl rand -base64 32
```

3. **Initialiser la base de données**

```bash
# Générer le client Prisma
npm run db:generate

# Créer la base de données et les tables
npm run db:push

# Remplir avec les données initiales (admin + templates SMS)
npm run db:seed
```

4. **Lancer l'application en développement**

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## 🔐 Connexion

**Compte admin par défaut** (créé automatiquement au seed) :
- Email : `admin@pharmacie.local`
- Mot de passe : `admin123`

⚠️ **Important** : Changez ce mot de passe en production !

## 📋 Fonctionnalités

### Pour tous les utilisateurs (Staff)

- **Planning du jour** : Vue des renouvellements à préparer aujourd'hui
- **Planning semaine** : Vue hebdomadaire avec nombre d'événements par jour
- **Recrutement patient** : Saisie rapide d'un nouveau patient avec cycle de renouvellement
- **Liste patients** : Recherche et consultation des patients
- **Actions rapides** : Changer le statut d'un renouvellement, envoyer un SMS
- **Impression A4** : Format optimisé pour l'impression

### Pour les administrateurs

- **Gestion des templates SMS** : Créer, modifier, supprimer les templates
- **Export CSV** : Exporter la liste des patients
- **Anonymisation/Suppression** : Anonymiser ou supprimer un patient

## 📱 Envoi de SMS (TextingHouse)

L'application intègre l'API TextingHouse pour l'envoi de SMS.

### Configuration

1. Renseigner les variables d'environnement `TEXTINGHOUSE_USER` et `TEXTINGHOUSE_PASS`
2. Les SMS sont automatiquement limités à 160 caractères
3. Les emojis sont interdits
4. Retry automatique sur l'URL secondaire en cas d'échec

### Templates SMS par défaut

- `RENOUVELLEMENT_PRET` : Message quand le renouvellement est prêt
- `ORDONNANCE_TERMINEE` : Message quand l'ordonnance est terminée
- `RAPPEL_PROCHAINE_FOIS` : Rappel pour laisser l'ordonnance
- `COURT` : Message court générique

## 🗄️ Base de données

### SQLite (développement)

Par défaut, l'application utilise SQLite pour le développement local. Le fichier `dev.db` sera créé automatiquement.

### Migration vers PostgreSQL (production)

Pour passer à PostgreSQL en production :

1. Modifier `prisma/schema.prisma` :
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Mettre à jour `.env` :
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

3. Exécuter les migrations :
```bash
npm run db:migrate
```

## 📁 Structure du projet

```
├── app/                    # Pages Next.js (App Router)
│   ├── api/               # Routes API
│   ├── dashboard/        # Planning du jour
│   ├── planning/         # Planning semaine
│   ├── patients/         # Gestion patients
│   ├── admin/            # Pages admin
│   └── login/            # Page de connexion
├── components/            # Composants React réutilisables
├── lib/                  # Utilitaires (auth, prisma, sms, etc.)
├── prisma/               # Schéma Prisma et migrations
└── types/                # Types TypeScript
```

## 🔧 Scripts disponibles

- `npm run dev` : Lancer en développement
- `npm run build` : Build de production
- `npm run start` : Lancer en production
- `npm run db:push` : Pousser le schéma vers la DB (dev)
- `npm run db:migrate` : Créer une migration
- `npm run db:studio` : Ouvrir Prisma Studio
- `npm run db:seed` : Remplir la DB avec les données initiales

## 🛡️ Sécurité

- Authentification obligatoire (NextAuth)
- Rôles utilisateurs (ADMIN / STAFF)
- Consentement patient obligatoire pour SMS
- Normalisation et validation des numéros de téléphone
- Logs d'audit (création, modification, envoi SMS)

## 📝 Notes importantes

- Les numéros de téléphone sont normalisés au format `33XXXXXXXXX`
- Les renouvellements sont calculés automatiquement à la création du cycle
- R0 correspond à la première délivrance (index 0)
- Le nombre de renouvellements = nombre total d'événements - 1
- Les SMS doivent être ≤ 160 caractères et sans emojis

## 🐛 Dépannage

### Erreur "Non authentifié"
- Vérifier que `NEXTAUTH_SECRET` est défini dans `.env`
- Vider les cookies du navigateur

### Erreur base de données
- Vérifier que `DATABASE_URL` est correct
- Exécuter `npm run db:push` pour créer les tables

### SMS ne s'envoient pas
- Vérifier les identifiants TextingHouse dans `.env`
- Consulter les logs dans la table `sms_logs` via Prisma Studio

## 📞 Support

Pour toute question ou problème, contacter l'équipe de développement.




