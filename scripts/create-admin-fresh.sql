-- Script SQL pour créer l'utilisateur admin avec un hash FRESH
-- Exécutez ce script dans Supabase Dashboard → SQL Editor

-- Supprimer l'ancien
DELETE FROM "users" WHERE "email" = 'admin@pharmacie.local';

-- Créer avec le hash le plus récent (généré maintenant)
INSERT INTO "users" ("id", "email", "password", "role", "nom", "prenom", "actif", "createdAt", "updatedAt")
VALUES (
    'clx' || substr(md5(random()::text || clock_timestamp()::text), 1, 10),
    'admin@pharmacie.local',
    '$2a$12$yJFb5V/DvdShL7Bh2r8TH.DrtzFVQZrn6KETSScyq3xT72wJFPYE2',
    'ADMIN',
    'Admin',
    'Pharmacie',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Vérifier
SELECT 
    '✅ Utilisateur créé!' as status,
    email,
    role,
    actif,
    SUBSTRING(password, 1, 29) as hash_preview
FROM "users" 
WHERE "email" = 'admin@pharmacie.local';

