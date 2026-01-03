# Ajouter le champ date_delivrance

## Option 1 : Via SQL direct (Recommandé - Plus rapide)

1. Ouvrir Supabase Dashboard
2. Aller dans l'éditeur SQL
3. Exécuter le script `scripts/add-date-delivrance.sql` :

```sql
ALTER TABLE "renewal_events" 
ADD COLUMN IF NOT EXISTS "date_delivrance" TIMESTAMP(3);
```

## Option 2 : Via Prisma (si la connexion fonctionne)

Depuis la racine du projet :

```bash
npx prisma db push
```

**Note** : Si la commande reste bloquée, utilisez l'Option 1 (SQL direct).

## Vérification

Après avoir ajouté la colonne, vérifier qu'elle existe :

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'renewal_events' 
AND column_name = 'date_delivrance';
```

Vous devriez voir :
- column_name: date_delivrance
- data_type: timestamp without time zone
- is_nullable: YES




