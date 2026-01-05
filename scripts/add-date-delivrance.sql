-- Migration : Ajouter le champ date_delivrance à la table renewal_events
-- Ce champ stocke la date de récupération du médicament (scan QR code)

-- Pour PostgreSQL (Supabase)
ALTER TABLE "renewal_events" 
ADD COLUMN IF NOT EXISTS "date_delivrance" TIMESTAMP(3);

-- Vérification
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'renewal_events' 
AND column_name = 'date_delivrance';





