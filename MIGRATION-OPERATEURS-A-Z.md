# Création de la table Opérateurs en production (A à Z)

Si vous avez une erreur **500** lors de la création d’un opérateur sur Vercel, c’est en général parce que la table `operators` n’existe pas encore en base. Il faut appliquer les migrations sur la base de **production**.

---

## A. Vérifier que le code est à jour

- Les migrations doivent être dans le dépôt :
  - `prisma/migrations/20250207000000_add_operator_tracking/`
  - `prisma/migrations/20250207100000_add_operators_model/`
- Si vous venez de les ajouter : commit + push vers le dépôt utilisé par Vercel.

---

## B. Récupérer l’URL de la base de données (production)

1. Allez sur **Vercel** → votre projet → **Settings** → **Environment Variables**.
2. Repérez **`DATABASE_URL`** (celle utilisée en **Production**).
3. Vous en aurez besoin pour l’étape suivante. Ne la commitez pas dans le code.

**Supabase :** si `migrate deploy` rame ou bloque, utilisez la **connexion directe** pour les migrations (pas le pooler) :
- Supabase → **Project Settings** → **Database** → **Connection string** → onglet **URI**.
- Choisir **« Direct connection »** (port **5432**, pas 6543) et copier l’URL.
- Utiliser cette URL uniquement pour `db:migrate:deploy` (gardez l’URL pooler sur Vercel pour l’app).

---

## B2. Erreur « Can't reach database server » (P1001) avec `migrate deploy`

Si vous voyez :
```text
Error: P1001: Can't reach database server at `db.xxxxx.supabase.co:5432`
```
c’est que la **connexion directe** (port 5432) n’est pas joignable depuis votre réseau. Dans ce cas, **ne passez pas par Prisma** : appliquez les migrations **à la main dans Supabase** :

1. Ouvrez **Supabase** → votre projet → **SQL Editor** → **New query**.
2. Ouvrez le fichier **`prisma/migrations/APPLIER_EN_PROD_SUPABASE.sql`** dans le projet, copiez tout son contenu.
3. Collez dans l’éditeur SQL Supabase et cliquez sur **Run**.
4. Vérifiez qu’il n’y a pas d’erreur (les lignes « already exists » sont normales si vous relancez le script).
5. Rechargez votre application (ex. page Patients sur Vercel) : les données devraient réapparaître.

Vous n’avez pas besoin de lancer `prisma migrate resolve` pour que l’app fonctionne ; c’est optionnel si vous voulez garder l’historique Prisma aligné.

---

## C. Appliquer les migrations sur la base de production

Sur votre machine (avec Node et le projet cloné) :

1. **Ouvrir un terminal** dans le dossier du projet :
   ```bash
   cd c:\Users\abbas\Desktop\RENOUVELLEMENT-ORDONNANCE
   ```

2. **Définir l’URL de la base de production** (une seule fois dans ce terminal) :
   - **Windows (PowerShell)** :
     ```powershell
     $env:DATABASE_URL="votre_url_postgres_ici"
     ```
   - Remplacez `votre_url_postgres_ici` par la vraie valeur de `DATABASE_URL` (celle de Vercel / production).

3. **Lancer l’application des migrations** :
   ```bash
   npm run db:migrate:deploy
   ```
   (ou `npx prisma migrate deploy`)
   Cette commande :
   - se connecte à la base indiquée par `DATABASE_URL`,
   - applique uniquement les migrations pas encore appliquées (dont celle qui crée la table `operators`).

4. **Vérifier le résultat**  
   Vous devez voir quelque chose comme :
   ```text
   Applying migration `20250207000000_add_operator_tracking`
   Applying migration `20250207100000_add_operators_model`
   All migrations have been successfully applied.
   ```
   Si une migration échoue, le message d’erreur indiquera la cause (droits, syntaxe SQL, etc.).

---

## D. Vérifier que la table existe (optionnel)

Avec `DATABASE_URL` toujours définie pour la production, vous pouvez ouvrir Prisma Studio pour voir les tables :

```bash
npx prisma studio
```

Dans l’interface, vérifiez que la table **operators** apparaît.

---

## E. Redéployer sur Vercel (si besoin)

- Si vous aviez seulement oublié de lancer les migrations : **pas besoin** de redéployer, la création d’opérateur devrait déjà fonctionner.
- Si vous avez modifié le code ou les variables d’environnement : faites un **nouveau déploiement** (push ou “Redeploy” sur Vercel).

---

## F. Tester la création d’opérateur

1. Aller sur votre site en production (ex. `https://renouvellement-ordonnance.vercel.app`).
2. Se connecter en **Superadmin**.
3. Menu **Opérateurs** → saisir un prénom → **Ajouter**.
4. Vérifier qu’il n’y a plus d’erreur 500 et que l’opérateur apparaît dans la liste.

---

## En résumé

| Étape | Action |
|-------|--------|
| A | Migrations dans le repo, commit + push |
| B | Récupérer `DATABASE_URL` (production) dans Vercel |
| C | `$env:DATABASE_URL="..."` puis `npx prisma migrate deploy` |
| D | (Optionnel) Vérifier la table `operators` en SQL |
| E | Redéployer Vercel seulement si nécessaire |
| F | Tester la création d’opérateur en production |

Une fois `prisma migrate deploy` exécuté avec la bonne `DATABASE_URL`, la table `operators` existe en production et l’erreur 500 à la création d’opérateur disparaît.

---

## Alternative : exécuter le SQL dans Supabase (si migrate deploy rame)

Si la commande `migrate deploy` reste bloquée à cause du pooler, vous pouvez créer la table à la main :

1. Ouvrez **Supabase** → votre projet → **SQL Editor**.
2. Cliquez sur **New query**.
3. Collez et exécutez le script ci-dessous (en une fois ou en deux blocs).

**Bloc 1 – Table operators et colonnes :**
```sql
CREATE TABLE IF NOT EXISTS "operators" (
    "id" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "operators_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "registered_operator_id" TEXT;
ALTER TABLE "renewal_events" ADD COLUMN IF NOT EXISTS "completed_operator_id" TEXT;
CREATE INDEX IF NOT EXISTS "renewal_events_completed_operator_id_idx" ON "renewal_events"("completed_operator_id");
```

**Bloc 2 – Clés étrangères :**
```sql
ALTER TABLE "patients" ADD CONSTRAINT "patients_registered_operator_id_fkey"
  FOREIGN KEY ("registered_operator_id") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "renewal_events" ADD CONSTRAINT "renewal_events_completed_operator_id_fkey"
  FOREIGN KEY ("completed_operator_id") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

Si une contrainte existe déjà (erreur « already exists »), ignorez la ligne concernée.

4. Enregistrer la migration dans l’historique Prisma (optionnel, pour garder le repo cohérent) : après avoir exécuté le SQL, sur votre machine avec `DATABASE_URL` = URL **directe** (port 5432), lancez :
   ```bash
   npx prisma migrate resolve --applied 20250207000000_add_operator_tracking
   npx prisma migrate resolve --applied 20250207100000_add_operators_model
   ```
