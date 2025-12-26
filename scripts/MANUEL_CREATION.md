# Création manuelle des tables dans Supabase

## 📋 Étapes

### 1. Ouvrir SQL Editor dans Supabase

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Cliquez sur **"SQL Editor"** dans le menu de gauche
4. Cliquez sur **"New query"**

### 2. Exécuter le script SQL

1. Ouvrez le fichier `scripts/create-tables-with-seed.sql`
2. Copiez tout le contenu
3. Collez-le dans l'éditeur SQL de Supabase
4. Cliquez sur **"Run"** (ou appuyez sur `Ctrl+Enter`)

### 3. Vérifier que les tables sont créées

1. Dans Supabase Dashboard, allez dans **"Table Editor"**
2. Vous devriez voir 6 tables :
   - ✅ `users`
   - ✅ `patients`
   - ✅ `prescription_cycles`
   - ✅ `renewal_events`
   - ✅ `sms_templates`
   - ✅ `sms_logs`

### 4. Créer l'utilisateur admin

Les templates SMS seront créés automatiquement, mais pour l'utilisateur admin, vous devez utiliser Prisma seed car le hash bcrypt nécessite Node.js.

**Option A : Via Prisma seed (Recommandé)**

Une fois les tables créées, exécutez localement :

```bash
npm run db:seed
```

Cela créera l'utilisateur admin avec le mot de passe hashé correctement.

**Option B : Créer manuellement (temporaire)**

Si vous voulez créer l'utilisateur directement en SQL, vous pouvez utiliser un hash temporaire, mais **changez le mot de passe immédiatement après** :

```sql
-- Hash temporaire (à changer après)
INSERT INTO "users" ("id", "email", "password", "role", "nom", "prenom", "actif", "createdAt", "updatedAt")
VALUES (
    'clx' || substr(md5(random()::text), 1, 10),
    'admin@pharmacie.local',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJqZ5Z5Zq', -- Hash de "admin123"
    'ADMIN',
    'Admin',
    'Pharmacie',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT ("email") DO NOTHING;
```

⚠️ **Important** : Ce hash est un exemple. Utilisez `npm run db:seed` pour un hash correct.

### 5. Vérifier les données

1. Allez dans **"Table Editor"** → **"sms_templates"**
2. Vous devriez voir 4 templates créés
3. Pour l'utilisateur admin, vérifiez dans **"users"** après avoir exécuté `npm run db:seed`

## ✅ Vérification finale

Une fois tout fait :

1. ✅ 6 tables créées
2. ✅ 4 templates SMS créés
3. ✅ 1 utilisateur admin créé (via `npm run db:seed`)

Vous pouvez maintenant vous connecter avec :
- Email : `admin@pharmacie.local`
- Mot de passe : `admin123`

## 🔧 Si vous avez des erreurs

### Erreur : "relation already exists"
- Les tables existent déjà, c'est normal
- Le script utilise `CREATE TABLE IF NOT EXISTS` donc c'est sans danger

### Erreur : "duplicate key value"
- Les données existent déjà
- Le script utilise `ON CONFLICT DO NOTHING` donc c'est sans danger

### Erreur : "foreign key constraint"
- Vérifiez l'ordre de création des tables
- Le script crée les tables dans le bon ordre

## 📝 Notes

- Les IDs sont générés avec CUID (format `clx...`)
- Les timestamps utilisent `TIMESTAMP(3)` pour la précision milliseconde
- Les contraintes de clés étrangères sont activées
- Les index sont créés pour optimiser les requêtes

