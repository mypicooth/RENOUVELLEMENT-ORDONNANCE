# Solution : Mot de passe admin inconnu

## 🔧 Solution rapide : Mettre à jour via SQL

Si le mot de passe ne fonctionne pas après création manuelle des tables :

### Étape 1 : Ouvrir SQL Editor dans Supabase

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Cliquez sur **"SQL Editor"**
4. Cliquez sur **"New query"**

### Étape 2 : Exécuter le script de mise à jour

1. Ouvrez le fichier `scripts/update-admin-password.sql`
2. Copiez tout le contenu
3. Collez dans l'éditeur SQL de Supabase
4. Cliquez sur **"Run"**

Ce script va :
- ✅ Supprimer l'ancien utilisateur admin (s'il existe)
- ✅ Créer un nouvel utilisateur admin avec le bon hash bcrypt
- ✅ Afficher les informations de l'utilisateur créé

### Étape 3 : Tester la connexion

Après exécution du script, connectez-vous avec :
- **Email** : `admin@pharmacie.local`
- **Mot de passe** : `admin123`

---

## 🔄 Solution alternative : Utiliser Prisma Seed

Si vous pouvez vous connecter à la base de données (même temporairement) :

```bash
npm run db:seed
```

Cette commande va :
- ✅ Créer l'utilisateur admin avec le bon hash
- ✅ Créer les templates SMS s'ils n'existent pas

---

## 🔍 Vérifier l'utilisateur dans Supabase

1. Allez dans **"Table Editor"** → **"users"**
2. Vérifiez qu'il y a un utilisateur avec :
   - Email : `admin@pharmacie.local`
   - Role : `ADMIN`
   - Actif : `true`

Si l'utilisateur existe mais que le mot de passe ne fonctionne pas, exécutez le script SQL de mise à jour.

---

## ⚠️ Important

Le hash bcrypt dans le script SQL est correct pour le mot de passe `admin123`. Si ça ne fonctionne toujours pas :

1. Vérifiez que vous utilisez bien `admin@pharmacie.local` (pas `admin@pharmacie.com`)
2. Vérifiez que le mot de passe est bien `admin123` (sans espace)
3. Essayez de vider le cache du navigateur
4. Essayez en navigation privée

---

## 🔐 Changer le mot de passe

Si vous voulez changer le mot de passe admin :

1. Exécutez : `node scripts/generate-admin-hash.js "nouveau-mot-de-passe"`
2. Utilisez le hash généré dans le script SQL


