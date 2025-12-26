# Vérification de la connexion Supabase

## Problème : "Can't reach database server"

Si vous obtenez cette erreur, voici les solutions :

### 1. Vérifier que le projet Supabase est actif

1. Allez sur https://supabase.com/dashboard
2. Vérifiez que votre projet n'est pas en **pause** (icône de pause)
3. Si le projet est en pause, cliquez sur **"Restore"** ou **"Resume"**
4. Attendez 1-2 minutes que le projet redémarre

### 2. Utiliser la Connection Pooler (Recommandé)

La connection pooler est plus fiable et fonctionne mieux avec Prisma :

1. Dans Supabase Dashboard → **Settings** → **Database**
2. Faites défiler jusqu'à **"Connection Pooling"**
3. Sélectionnez **"Session mode"**
4. Copiez la connection string (elle utilise le port **6543** au lieu de 5432)
5. Remplacez `DATABASE_URL` dans votre `.env` ou `.env.local`

**Format de la connection pooler** :
```
postgresql://postgres.ciygoiabqlvngwzlhgur:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

### 3. Vérifier le firewall

- Windows : Vérifiez que Windows Firewall n'bloque pas le port 5432 ou 6543
- Antivirus : Certains antivirus bloquent les connexions sortantes

### 4. Tester avec la connection pooler

La connection pooler (port 6543) est généralement plus fiable que la connection directe (port 5432).

### 5. Vérifier dans Supabase Dashboard

1. Allez dans **Settings** → **Database**
2. Vérifiez que l'état du projet est **"Active"**
3. Vérifiez les **"Connection Info"** pour confirmer l'hôte

