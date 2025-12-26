# Guide de déploiement - Solution simple et économique

## 🚀 Solution recommandée : Railway

**Railway** est la solution la plus simple et économique pour déployer votre application Next.js.

### Avantages :
- ✅ **Gratuit** pour commencer (500 heures/mois, $5 de crédit gratuit)
- ✅ **Très simple** : déploiement en quelques clics
- ✅ **Supporte SQLite** (votre base actuelle) ou PostgreSQL
- ✅ **Variables d'environnement** faciles à gérer
- ✅ **HTTPS automatique** (certificat SSL inclus)
- ✅ **Déploiement automatique** depuis GitHub

### Coût estimé :
- **Gratuit** : $5 de crédit/mois (suffisant pour commencer)
- **Payant** : ~$5-10/mois selon l'utilisation

---

## 📋 Étapes de déploiement sur Railway

### 1. Préparer le projet

#### a) Créer un fichier `.env.example` pour documenter les variables nécessaires :

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="votre-secret-aleatoire-tres-long"
NEXTAUTH_URL="http://localhost:3000"
TEXTINGHOUSE_USER="votre-user"
TEXTINGHOUSE_PASS="votre-password"
TEXTINGHOUSE_FROM="votre-numero"
```

#### b) Créer un fichier `railway.json` (optionnel, pour la configuration) :

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 2. Créer un compte Railway

1. Allez sur [railway.app](https://railway.app)
2. Cliquez sur "Start a New Project"
3. Connectez-vous avec GitHub

### 3. Déployer l'application

#### Option A : Depuis GitHub (recommandé)

1. **Pousser votre code sur GitHub** (si ce n'est pas déjà fait)
2. Dans Railway, cliquez sur "New Project"
3. Sélectionnez "Deploy from GitHub repo"
4. Choisissez votre repository
5. Railway détectera automatiquement Next.js

#### Option B : Depuis le dossier local

1. Installez Railway CLI : `npm i -g @railway/cli`
2. Connectez-vous : `railway login`
3. Initialisez : `railway init`
4. Déployez : `railway up`

### 4. Configurer la base de données

#### Option 1 : Garder SQLite (simple mais limité)

Railway peut utiliser SQLite, mais la base de données sera réinitialisée à chaque redéploiement. **Non recommandé pour la production.**

#### Option 2 : Migrer vers PostgreSQL (recommandé)

1. Dans Railway, cliquez sur "New" → "Database" → "PostgreSQL"
2. Railway créera automatiquement une base PostgreSQL
3. Copiez l'URL de connexion (variable `DATABASE_URL`)

### 5. Configurer les variables d'environnement

Dans Railway, allez dans votre projet → "Variables" et ajoutez :

```
DATABASE_URL=<url-postgresql-de-railway>
NEXTAUTH_SECRET=<générez-un-secret-aleatoire>
NEXTAUTH_URL=https://votre-app.railway.app
TEXTINGHOUSE_USER=votre-user
TEXTINGHOUSE_PASS=votre-password
TEXTINGHOUSE_FROM=votre-numero
```

**Pour générer NEXTAUTH_SECRET** :
```bash
openssl rand -base64 32
```

### 6. Migrer la base de données vers PostgreSQL (si nécessaire)

Si vous choisissez PostgreSQL, modifiez `prisma/schema.prisma` :

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Puis dans Railway, exécutez les migrations :
1. Ouvrez le terminal Railway
2. Exécutez : `npx prisma migrate deploy`
3. (Optionnel) Exécutez : `npx prisma db seed` pour les données initiales

### 7. Déployer

Railway déploiera automatiquement. Une fois terminé, vous obtiendrez une URL comme :
`https://votre-app.railway.app`

---

## 🔄 Alternatives économiques

### Option 2 : Vercel (Gratuit) + Supabase (Gratuit)

**Avantages** :
- ✅ Vercel est gratuit pour Next.js
- ✅ Supabase offre PostgreSQL gratuit (500 MB)
- ✅ Très performant

**Inconvénients** :
- ⚠️ Nécessite de migrer vers PostgreSQL
- ⚠️ Configuration en deux étapes

### Option 3 : Render (Gratuit)

**Avantages** :
- ✅ Gratuit pour les projets personnels
- ✅ Supporte Next.js et PostgreSQL

**Inconvénients** :
- ⚠️ L'application se met en veille après 15 min d'inactivité (plan gratuit)

---

## 📝 Checklist avant déploiement

- [ ] Code poussé sur GitHub
- [ ] Variables d'environnement préparées
- [ ] Base de données configurée (PostgreSQL recommandé)
- [ ] `NEXTAUTH_SECRET` généré
- [ ] `NEXTAUTH_URL` configuré avec l'URL de production
- [ ] Migrations Prisma exécutées
- [ ] Données de seed importées (si nécessaire)

---

## 🛠️ Commandes utiles Railway

```bash
# Installer Railway CLI
npm i -g @railway/cli

# Se connecter
railway login

# Voir les logs
railway logs

# Ouvrir un shell
railway shell

# Voir les variables
railway variables
```

---

## 💡 Conseils pour la production

1. **Base de données** : Utilisez PostgreSQL plutôt que SQLite pour la persistance
2. **Backups** : Configurez des backups automatiques de la base de données
3. **Monitoring** : Utilisez les logs Railway pour surveiller l'application
4. **Sécurité** : Ne commitez jamais les fichiers `.env` dans Git
5. **Performance** : Activez le cache Next.js en production

---

## 🆘 Support

- Documentation Railway : https://docs.railway.app
- Support Railway : support@railway.app

---

## 💰 Coûts estimés

| Solution | Coût mensuel | Limites |
|----------|--------------|---------|
| **Railway** | $0-10 | 500h gratuites, $5 crédit |
| **Vercel + Supabase** | $0 | Limites généreuses gratuites |
| **Render** | $0-7 | Veille après 15 min (gratuit) |

**Recommandation finale** : **Railway** pour la simplicité, ou **Vercel + Supabase** pour le gratuit complet.

