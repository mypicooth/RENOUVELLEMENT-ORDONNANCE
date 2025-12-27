# Migration manuelle : Table patient_consents

## Problème

L'erreur "prepared statement 's0' already exists" se produit avec `prisma migrate deploy` à cause des prepared statements PostgreSQL dans un environnement serverless.

## Solution : Migration SQL manuelle

### Option 1 : Via Supabase SQL Editor (Recommandé)

1. **Allez sur Supabase Dashboard** → Votre projet → **SQL Editor**
2. **Copiez-collez le contenu** du fichier `scripts/create-consents-table.sql`
3. **Exécutez le script**
4. **Vérifiez** que la table a été créée

### Option 2 : Via psql (si vous avez accès)

```bash
psql "votre-connection-string" -f scripts/create-consents-table.sql
```

### Option 3 : Utiliser `prisma db push` (développement uniquement)

```bash
npx prisma db push
```

⚠️ **Attention** : `db push` ne crée pas de migration, utilisez-le uniquement en développement.

## Vérification

Après la création, vérifiez que la table existe :

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'patient_consents';
```

## Après la migration

Une fois la table créée, vous pouvez utiliser l'application normalement. Prisma Client sera régénéré automatiquement lors du prochain build.

## Notes

- La table sera créée avec tous les index et contraintes nécessaires
- Les relations avec `patients` et `users` seront établies
- Vous pouvez maintenant utiliser la fonctionnalité de consentement

