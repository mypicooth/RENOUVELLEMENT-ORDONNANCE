# Scripts d'initialisation de la base de données

Ces scripts permettent d'initialiser facilement votre base de données PostgreSQL (Supabase/Vercel).

## 🚀 Utilisation rapide

### Méthode recommandée (avec migrations)

```bash
npm run db:init
```

Cette commande exécute automatiquement :
1. Génération du client Prisma
2. Création des migrations
3. Application des migrations (création des tables)
4. Remplissage avec les données initiales (admin + templates SMS)

### Méthode simple (sans migrations)

```bash
npm run db:init:simple
```

Cette commande utilise `prisma db push` au lieu de migrations (plus rapide mais moins de contrôle).

## 📋 Prérequis

1. **Avoir une base de données PostgreSQL** (Supabase, Railway, etc.)
2. **Avoir la connection string** dans votre environnement :
   - Créez un fichier `.env.local` avec :
     ```env
     DATABASE_URL="postgresql://postgres:password@host:5432/postgres"
     ```
   - OU exportez la variable :
     ```bash
     export DATABASE_URL="postgresql://..."
     ```

## 🔧 Scripts disponibles

### `scripts/init-db.js` (Recommandé)
- ✅ Fonctionne sur Windows, Mac et Linux
- ✅ Messages colorés et clairs
- ✅ Gestion d'erreurs complète
- ✅ Utilise les migrations Prisma

**Usage** :
```bash
node scripts/init-db.js
# OU
npm run db:init
```

### `scripts/init-db.sh` (Linux/Mac)
Script bash pour Linux et Mac.

**Usage** :
```bash
chmod +x scripts/init-db.sh
./scripts/init-db.sh
```

### `scripts/init-db.ps1` (Windows PowerShell)
Script PowerShell pour Windows.

**Usage** :
```powershell
.\scripts\init-db.ps1
```

### `scripts/init-db-simple.sh` (Linux/Mac - Simple)
Version simplifiée utilisant `db push` au lieu de migrations.

**Usage** :
```bash
chmod +x scripts/init-db-simple.sh
./scripts/init-db-simple.sh
```

## 📝 Ce que font les scripts

1. **Vérifient** que `DATABASE_URL` est défini
2. **Génèrent** le client Prisma (`prisma generate`)
3. **Créent** les migrations si elles n'existent pas
4. **Appliquent** les migrations (`prisma migrate deploy`)
5. **Seedent** la base de données avec :
   - Un utilisateur admin : `admin@pharmacie.local` / `admin123`
   - 4 templates SMS par défaut

## ✅ Vérification

Après l'exécution, vous pouvez vérifier que tout fonctionne :

```bash
# Ouvrir Prisma Studio pour voir les données
npm run db:studio
```

Ou vérifiez directement dans Supabase Dashboard → Table Editor.

## 🆘 Dépannage

### Erreur : "DATABASE_URL n'est pas défini"
- Créez un fichier `.env.local` avec votre connection string
- OU exportez la variable : `export DATABASE_URL="..."`

### Erreur : "Connection refused"
- Vérifiez que votre base de données Supabase est active
- Vérifiez que la connection string est correcte
- Vérifiez que le mot de passe est bien remplacé dans l'URL

### Erreur : "Migration already applied"
- C'est normal si vous avez déjà exécuté le script
- Les migrations sont idempotentes (peuvent être exécutées plusieurs fois)

### Réinitialiser complètement
Si vous voulez tout réinitialiser :

```bash
# Supprimer toutes les migrations
rm -rf prisma/migrations

# Réexécuter le script
npm run db:init
```

## 📚 Commandes Prisma utiles

```bash
# Générer le client Prisma
npm run db:generate

# Créer une nouvelle migration
npm run db:migrate

# Appliquer les migrations
npx prisma migrate deploy

# Seed la base de données
npm run db:seed

# Ouvrir Prisma Studio (interface graphique)
npm run db:studio

# Push le schéma (sans migrations)
npm run db:push
```


