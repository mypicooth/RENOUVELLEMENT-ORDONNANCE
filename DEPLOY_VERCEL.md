# Guide de déploiement - Vercel + Supabase

## 🚀 Solution : Vercel (Gratuit) + Supabase (Gratuit)

**Vercel** est la plateforme optimale pour Next.js. **Supabase** offre PostgreSQL gratuit.

### Avantages :
- ✅ **100% gratuit** pour commencer
- ✅ **Très simple** : déploiement en quelques clics
- ✅ **PostgreSQL gratuit** (500 MB) avec Supabase
- ✅ **HTTPS automatique** (certificat SSL inclus)
- ✅ **Déploiement automatique** depuis GitHub
- ✅ **Performance optimale** pour Next.js

---

## 📋 Étapes de déploiement

### Étape 1 : Créer la base de données Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un compte (gratuit)
3. Cliquez sur **"New Project"**
4. Remplissez :
   - **Name** : `renouvellement-ordonnance` (ou autre)
   - **Database Password** : Choisissez un mot de passe fort (⚠️ **SAVEZ-LE**)
   - **Region** : Choisissez la région la plus proche (ex: `West Europe`)
5. Cliquez sur **"Create new project"**
6. Attendez 2-3 minutes que la base soit créée

### Étape 2 : Récupérer la connection string Supabase

1. Dans votre projet Supabase, allez dans **Settings** → **Database**
2. Faites défiler jusqu'à **"Connection string"**
3. Sélectionnez **"URI"** dans le menu déroulant
4. Copiez la connection string qui ressemble à :
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
5. ⚠️ **Remplacez `[YOUR-PASSWORD]`** par le mot de passe que vous avez créé à l'étape 1
6. Vous obtiendrez quelque chose comme :
   ```
   postgresql://postgres:VotreMotDePasse123@db.abcdefgh.supabase.co:5432/postgres
   ```
7. **SAUVEGARDEZ cette URL**, vous en aurez besoin !

### Étape 3 : Préparer le code

Assurez-vous que votre code est sur GitHub :
```bash
git add .
git commit -m "Préparation déploiement Vercel"
git push origin main
```

### Étape 4 : Déployer sur Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez sur **"Sign Up"** et connectez-vous avec GitHub
3. Cliquez sur **"Add New..."** → **"Project"**
4. Sélectionnez votre repository GitHub
5. Vercel détectera automatiquement Next.js
6. **Ne cliquez pas encore sur "Deploy"** ! Configurez d'abord les variables

### Étape 5 : Configurer les variables d'environnement dans Vercel

Avant de déployer, configurez les variables :

1. Dans la page de configuration Vercel, faites défiler jusqu'à **"Environment Variables"**
2. Ajoutez les variables suivantes :

#### Variable 1 : DATABASE_URL
- **Name** : `DATABASE_URL`
- **Value** : La connection string Supabase que vous avez copiée à l'étape 2
- **Environments** : Cochez toutes (Production, Preview, Development)

#### Variable 2 : NEXTAUTH_SECRET
- **Name** : `NEXTAUTH_SECRET`
- **Value** : Générez un secret avec :
  - Windows PowerShell : `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))`
  - Mac/Linux : `openssl rand -base64 32`
  - En ligne : https://generate-secret.vercel.app/32
- **Environments** : Cochez toutes

#### Variable 3 : NEXTAUTH_URL
- **Name** : `NEXTAUTH_URL`
- **Value** : Pour l'instant, mettez `https://votre-projet.vercel.app` (vous le mettrez à jour après le déploiement)
- **Environments** : Cochez toutes

#### Variable 4 : TEXTINGHOUSE_USER
- **Name** : `TEXTINGHOUSE_USER`
- **Value** : Votre username TextingHouse
- **Environments** : Cochez toutes

#### Variable 5 : TEXTINGHOUSE_PASS
- **Name** : `TEXTINGHOUSE_PASS`
- **Value** : Votre mot de passe TextingHouse
- **Environments** : Cochez toutes

#### Variable 6 : TEXTINGHOUSE_FROM
- **Name** : `TEXTINGHOUSE_FROM`
- **Value** : Votre numéro expéditeur (ou laissez vide `""`)
- **Environments** : Cochez toutes

### Étape 6 : Déployer

1. Cliquez sur **"Deploy"**
2. Attendez 2-3 minutes que Vercel build et déploie votre application
3. Une fois terminé, vous obtiendrez une URL comme : `https://votre-projet.vercel.app`

### Étape 7 : Mettre à jour NEXTAUTH_URL

1. Dans Vercel, allez dans votre projet → **Settings** → **Environment Variables**
2. Trouvez `NEXTAUTH_URL`
3. Cliquez sur **Edit**
4. Remplacez par votre URL Vercel exacte : `https://votre-projet.vercel.app`
5. Cliquez sur **Save**

### Étape 8 : Initialiser la base de données

#### Option A : Script automatique (Recommandé) ⭐

1. Créez un fichier `.env.local` à la racine du projet avec :
   ```env
   DATABASE_URL="postgresql://postgres:VotreMotDePasse@db.xxxxx.supabase.co:5432/postgres"
   ```
   ⚠️ Remplacez `VotreMotDePasse` et `xxxxx` par vos vraies valeurs Supabase

2. Exécutez le script d'initialisation :

   **Windows (PowerShell)** :
   ```powershell
   npm run db:init
   ```

   **Mac/Linux** :
   ```bash
   npm run db:init
   ```

   **OU directement** :
   ```bash
   node scripts/init-db.js
   ```

   Ce script va automatiquement :
   - ✅ Générer le client Prisma
   - ✅ Créer les migrations
   - ✅ Créer toutes les tables
   - ✅ Ajouter les données initiales (admin + templates SMS)

#### Option B : Méthode simple (sans migrations)

Si vous préférez une méthode plus simple sans migrations :

```bash
npm run db:init:simple
```

Cette commande utilise `prisma db push` au lieu de migrations.

#### Option C : Commandes manuelles

Si vous préférez exécuter les commandes une par une :

```bash
# 1. Générer le client Prisma
npx prisma generate

# 2. Créer les tables (avec migrations)
npx prisma migrate deploy

# 3. Ajouter les données initiales
npx prisma db seed
```

#### Option D : Via Vercel CLI (après déploiement)

Si vous voulez initialiser depuis Vercel :

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Lier au projet
vercel link

# Exécuter les migrations (nécessite DATABASE_URL dans Vercel)
vercel env pull .env.local
npm run db:init
```

### Étape 9 : Tester l'application

1. Ouvrez votre URL Vercel : `https://votre-projet.vercel.app`
2. Connectez-vous avec :
   - Email : `admin@pharmacie.local`
   - Mot de passe : `admin123`

⚠️ **Important** : Changez ce mot de passe en production !

---

## 🔄 Déploiements automatiques

Vercel déploiera automatiquement à chaque push sur GitHub :
- **Production** : Push sur `main` ou `master`
- **Preview** : Push sur les autres branches

---

## 📝 Checklist

- [ ] Compte Supabase créé
- [ ] Base de données Supabase créée
- [ ] Connection string Supabase récupérée
- [ ] Code poussé sur GitHub
- [ ] Projet Vercel créé
- [ ] Variables d'environnement configurées dans Vercel
- [ ] Déploiement Vercel réussi
- [ ] `NEXTAUTH_URL` mis à jour avec l'URL Vercel
- [ ] Migrations Prisma exécutées
- [ ] Base de données seedée
- [ ] Application testée et fonctionnelle

---

## 🛠️ Commandes utiles Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer
vercel

# Voir les logs
vercel logs

# Ouvrir le dashboard
vercel open
```

---

## 💡 Conseils

1. **Base de données** : Supabase offre 500 MB gratuit, largement suffisant pour commencer
2. **Backups** : Supabase fait des backups automatiques
3. **Monitoring** : Utilisez les logs Vercel pour surveiller l'application
4. **Sécurité** : Ne commitez jamais les fichiers `.env` dans Git
5. **Performance** : Vercel optimise automatiquement Next.js

---

## 🆘 Support

- Documentation Vercel : https://vercel.com/docs
- Documentation Supabase : https://supabase.com/docs
- Support Vercel : support@vercel.com

---

## 💰 Coûts

| Service | Coût | Limites gratuites |
|---------|------|-------------------|
| **Vercel** | $0 | Illimité pour projets personnels |
| **Supabase** | $0 | 500 MB base de données, 2 GB bande passante |

**Total : $0/mois** pour commencer ! 🎉

