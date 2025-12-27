# 📋 Guide : Créer la table patient_consents

## ⚠️ Problème

L'erreur `prepared statement "s0" already exists` se produit avec `prisma migrate deploy` à cause des prepared statements PostgreSQL dans un environnement serverless.

## ✅ Solution : Migration SQL manuelle

### Méthode recommandée : Via Supabase SQL Editor

1. **Allez sur Supabase Dashboard**
   - Ouvrez votre projet
   - Cliquez sur **SQL Editor** dans le menu de gauche

2. **Créez une nouvelle requête**
   - Cliquez sur **New query**

3. **Copiez-collez le script SQL suivant** :

```sql
-- Créer la table patient_consents
CREATE TABLE IF NOT EXISTS "patient_consents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patient_id" TEXT NOT NULL,
    "consent_type" TEXT NOT NULL DEFAULT 'ORDONNANCE_RETENTION',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signed_at" TIMESTAMP(3),
    "place" TEXT NOT NULL DEFAULT 'LA POSSESSION',
    "today_date" TEXT NOT NULL,
    "end_date" TEXT,
    "document_url" TEXT,
    "signature_data" TEXT,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,
    "created_by" TEXT NOT NULL,
    "revoked_by" TEXT
);

-- Créer les index
CREATE INDEX IF NOT EXISTS "patient_consents_patient_id_idx" ON "patient_consents"("patient_id");
CREATE INDEX IF NOT EXISTS "patient_consents_consent_type_idx" ON "patient_consents"("consent_type");
CREATE INDEX IF NOT EXISTS "patient_consents_revoked_at_idx" ON "patient_consents"("revoked_at");

-- Ajouter les clés étrangères
ALTER TABLE "patient_consents" 
    ADD CONSTRAINT "patient_consents_patient_id_fkey" 
    FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "patient_consents" 
    ADD CONSTRAINT "patient_consents_created_by_fkey" 
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "patient_consents" 
    ADD CONSTRAINT "patient_consents_revoked_by_fkey" 
    FOREIGN KEY ("revoked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

4. **Exécutez le script**
   - Cliquez sur **Run** ou appuyez sur `Ctrl+Enter`

5. **Vérifiez la création**
   - Vous devriez voir "Success. No rows returned"
   - Vérifiez avec : `SELECT * FROM "patient_consents" LIMIT 1;`

## 🔄 Alternative : Utiliser le fichier SQL

Le fichier `scripts/create-consents-table.sql` contient le même script. Vous pouvez :
- L'ouvrir dans un éditeur
- Copier son contenu
- Le coller dans Supabase SQL Editor

## ✅ Vérification

Après la création, vérifiez que tout est correct :

```sql
-- Vérifier que la table existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'patient_consents';

-- Vérifier les colonnes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'patient_consents'
ORDER BY ordinal_position;

-- Vérifier les index
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'patient_consents';
```

## 🚀 Après la migration

Une fois la table créée :

1. **Régénérez Prisma Client** (si nécessaire) :
   ```bash
   npx prisma generate
   ```

2. **Testez la fonctionnalité** :
   - Allez sur une fiche patient
   - Cliquez sur "Faire signer l'autorisation"
   - Testez la signature et la génération du PDF

## 📝 Notes

- La table sera créée avec tous les index et contraintes nécessaires
- Les relations avec `patients` et `users` seront établies automatiquement
- Vous pouvez maintenant utiliser la fonctionnalité de consentement complètement

## ⚠️ Si vous avez déjà des données

Si la table existe déjà partiellement, vous pouvez utiliser `CREATE TABLE IF NOT EXISTS` qui ne fera rien si la table existe déjà. Les contraintes seront ajoutées seulement si elles n'existent pas.

