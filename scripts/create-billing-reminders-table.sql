-- Script pour créer la table billing_reminders
-- À exécuter manuellement si la migration Prisma ne fonctionne pas

CREATE TABLE IF NOT EXISTS "billing_reminders" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "date_rappel" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'A_FAIRE',
    "date_fait" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_reminders_pkey" PRIMARY KEY ("id")
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS "billing_reminders_patient_id_idx" ON "billing_reminders"("patient_id");
CREATE INDEX IF NOT EXISTS "billing_reminders_date_rappel_idx" ON "billing_reminders"("date_rappel");
CREATE INDEX IF NOT EXISTS "billing_reminders_statut_idx" ON "billing_reminders"("statut");

-- Clés étrangères
ALTER TABLE "billing_reminders" 
    ADD CONSTRAINT "billing_reminders_patient_id_fkey" 
    FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "billing_reminders" 
    ADD CONSTRAINT "billing_reminders_created_by_fkey" 
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

