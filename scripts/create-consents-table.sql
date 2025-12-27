-- Script SQL pour créer la table patient_consents
-- À exécuter directement dans Supabase SQL Editor

-- Créer la table
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

-- Vérification
SELECT 
    'Table patient_consents créée avec succès!' as status,
    COUNT(*) as total_consents
FROM "patient_consents";

