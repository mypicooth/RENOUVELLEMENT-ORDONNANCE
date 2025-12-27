# ✅ Checklist de déploiement en production

## 📋 Avant le déploiement

- [x] Base de données Supabase créée et accessible
- [x] Tables créées dans Supabase
- [x] Utilisateur admin créé
- [ ] Code poussé sur GitHub
- [ ] Variables d'environnement préparées

---

## 🚀 Déploiement sur Vercel

### Étape 1 : Pousser le code sur GitHub

```bash
git add .
git commit -m "Préparation production"
git push origin main
```

### Étape 2 : Créer un projet Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Connectez-vous avec GitHub
3. Cliquez sur **"Add New..."** → **"Project"**
4. Sélectionnez votre repository
5. Vercel détectera automatiquement Next.js

### Étape 3 : Configurer les variables d'environnement

**IMPORTANT** : Configurez les variables AVANT de cliquer sur "Deploy" !

Dans la section **"Environment Variables"**, ajoutez :

#### 1. DATABASE_URL
- **Value** : Votre connection string Supabase (avec pooler si possible)
- **Format** : `postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres`
- Ou avec pooler : `postgresql://postgres.xxxxx:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`
- ⚠️ **Encodez le mot de passe en URL si nécessaire** (@ → %40, etc.)

#### 2. NEXTAUTH_SECRET
- **Value** : Générez avec https://generate-secret.vercel.app/32
- Ou PowerShell : `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))`

#### 3. NEXTAUTH_URL
- **Value** : `https://votre-projet.vercel.app` (sera mis à jour après le déploiement)
- Vous le mettrez à jour avec l'URL exacte après le premier déploiement

#### 4. TEXTINGHOUSE_USER
- **Value** : `contact@pharmaciesaintlaurent.re` (ou votre username)

#### 5. TEXTINGHOUSE_PASS
- **Value** : Votre mot de passe TextingHouse

#### 6. TEXTINGHOUSE_FROM
- **Value** : `PHARMACIE` (ou votre numéro expéditeur)

**Pour toutes les variables** : Cochez **Production**, **Preview**, et **Development**

### Étape 4 : Déployer

1. Cliquez sur **"Deploy"**
2. Attendez 2-3 minutes
3. Vercel vous donnera une URL : `https://votre-projet.vercel.app`

### Étape 5 : Mettre à jour NEXTAUTH_URL

1. Dans Vercel → **Settings** → **Environment Variables**
2. Trouvez `NEXTAUTH_URL`
3. Cliquez sur **Edit**
4. Remplacez par votre URL Vercel exacte : `https://votre-projet.vercel.app`
5. Cliquez sur **Save**
6. **Redéployez** : Allez dans **Deployments** → Cliquez sur les 3 points → **Redeploy**

---

## ✅ Vérifications post-déploiement

- [ ] L'application se charge sans erreur
- [ ] La page de connexion s'affiche
- [ ] Connexion avec `admin@pharmacie.local` / `admin123` fonctionne
- [ ] Les données de la base de données s'affichent
- [ ] Les fonctionnalités principales fonctionnent

---

## 🔒 Sécurité en production

- [ ] **Changez le mot de passe admin** après le premier login
- [ ] Vérifiez que `.env` n'est pas dans Git (déjà dans `.gitignore`)
- [ ] Vérifiez que les variables d'environnement sont bien configurées dans Vercel
- [ ] Testez l'envoi de SMS (si configuré)

---

## 🆘 En cas de problème

### L'application ne se charge pas
- Vérifiez les logs dans Vercel → **Deployments** → Cliquez sur le déploiement → **Logs**

### Erreur de connexion à la base de données
- Vérifiez que `DATABASE_URL` est correct dans Vercel
- Vérifiez que le mot de passe est encodé en URL si nécessaire
- Essayez la connection pooler au lieu de la connection directe

### Erreur d'authentification
- Vérifiez que `NEXTAUTH_SECRET` est défini
- Vérifiez que `NEXTAUTH_URL` correspond exactement à l'URL Vercel

---

## 📝 Notes importantes

- Vercel déploiera automatiquement à chaque push sur `main`
- Les variables d'environnement sont sécurisées dans Vercel
- HTTPS est automatique et gratuit
- Les déploiements sont instantanés

---

## 🎉 C'est prêt !

Une fois déployé, votre application sera accessible à l'URL Vercel et fonctionnera en production !


