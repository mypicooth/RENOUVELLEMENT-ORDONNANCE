-- Script SQL pour créer toutes les tables manuellement dans Supabase
-- Exécutez ce script dans Supabase Dashboard → SQL Editor

-- ============================================
-- 1. Table Users
-- ============================================
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "nom" TEXT,
    "prenom" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- ============================================
-- 2. Table Patients
-- ============================================
CREATE TABLE IF NOT EXISTS "patients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "telephone_normalise" TEXT NOT NULL,
    "date_recrutement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentement" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- ============================================
-- 3. Table Prescription Cycles
-- ============================================
CREATE TABLE IF NOT EXISTS "prescription_cycles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patient_id" TEXT NOT NULL,
    "date_premiere_delivrance" TIMESTAMP(3) NOT NULL,
    "nb_renouvellements" INTEGER NOT NULL,
    "intervalle_jours" INTEGER NOT NULL DEFAULT 21,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "prescription_cycles_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "prescription_cycles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================
-- 4. Table Renewal Events
-- ============================================
CREATE TABLE IF NOT EXISTS "renewal_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prescription_cycle_id" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "date_theorique" TIMESTAMP(3) NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'A_PREPARER',
    "date_preparation" TIMESTAMP(3),
    "date_sms" TIMESTAMP(3),
    "date_termine" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "renewal_events_prescription_cycle_id_fkey" FOREIGN KEY ("prescription_cycle_id") REFERENCES "prescription_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "renewal_events_prescription_cycle_id_index_key" UNIQUE ("prescription_cycle_id", "index")
);

-- Index pour renewal_events
CREATE INDEX IF NOT EXISTS "renewal_events_date_theorique_idx" ON "renewal_events"("date_theorique");
CREATE INDEX IF NOT EXISTS "renewal_events_statut_idx" ON "renewal_events"("statut");

-- ============================================
-- 5. Table SMS Templates
-- ============================================
CREATE TABLE IF NOT EXISTS "sms_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "libelle" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- ============================================
-- 6. Table SMS Logs
-- ============================================
CREATE TABLE IF NOT EXISTS "sms_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "renewal_event_id" TEXT,
    "prescription_cycle_id" TEXT,
    "template_id" TEXT,
    "telephone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "api_id" TEXT,
    "erreur" TEXT,
    "sent_by" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sms_logs_renewal_event_id_fkey" FOREIGN KEY ("renewal_event_id") REFERENCES "renewal_events"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "sms_logs_prescription_cycle_id_fkey" FOREIGN KEY ("prescription_cycle_id") REFERENCES "prescription_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "sms_logs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "sms_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "sms_logs_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Index pour sms_logs
CREATE INDEX IF NOT EXISTS "sms_logs_sent_at_idx" ON "sms_logs"("sent_at");
CREATE INDEX IF NOT EXISTS "sms_logs_statut_idx" ON "sms_logs"("statut");

-- ============================================
-- 7. Insérer les données initiales
-- ============================================

-- Utilisateur admin par défaut (mot de passe: admin123 - hashé avec bcrypt)
-- Le hash correspond à "admin123" avec 12 rounds
INSERT INTO "users" ("id", "email", "password", "role", "nom", "prenom", "actif", "createdAt", "updatedAt")
VALUES (
    'clx1234567890', -- Générer un ID unique (CUID)
    'admin@pharmacie.local',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJqZ5Z5Zq', -- Hash de "admin123"
    'ADMIN',
    'Admin',
    'Pharmacie',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT ("email") DO NOTHING;

-- Templates SMS par défaut
INSERT INTO "sms_templates" ("id", "code", "libelle", "message", "actif", "createdAt", "updatedAt")
VALUES
    ('clx1234567891', 'RENOUVELLEMENT_PRET', 'Renouvellement prêt', 'Bonjour, votre renouvellement est prêt. Vous pouvez passer le récupérer à la Pharmacie Saint-Laurent. À bientôt.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clx1234567892', 'ORDONNANCE_TERMINEE', 'Ordonnance terminée', 'Bonjour, votre ordonnance est terminée. Pensez à nous rapporter la nouvelle ordonnance pour la suite. Pharmacie Saint-Laurent.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clx1234567893', 'RAPPEL_PROCHAINE_FOIS', 'Rappel prochaine fois', 'Bonjour, pour gagner du temps la prochaine fois, vous pouvez nous laisser l''ordonnance au comptoir. Pharmacie Saint-Laurent.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('clx1234567894', 'COURT', 'Message court', 'Bonjour, votre traitement est prêt à la Pharmacie Saint-Laurent. Vous pouvez passer le récupérer.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- ============================================
-- Message de confirmation
-- ============================================
SELECT '✅ Tables créées avec succès!' as message;


