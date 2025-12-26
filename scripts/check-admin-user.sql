-- Script SQL pour vérifier l'utilisateur admin dans Supabase
-- Exécutez ce script dans Supabase Dashboard → SQL Editor

-- Vérifier si l'utilisateur existe
SELECT 
    id,
    email,
    role,
    nom,
    prenom,
    actif,
    "createdAt",
    "updatedAt",
    CASE 
        WHEN password IS NULL THEN '❌ Pas de mot de passe'
        WHEN LENGTH(password) < 50 THEN '❌ Hash trop court (probablement incorrect)'
        WHEN password LIKE '$2a$12$%' THEN '✅ Format bcrypt correct'
        ELSE '⚠️ Format inconnu'
    END as password_status,
    SUBSTRING(password, 1, 20) || '...' as password_preview
FROM "users" 
WHERE "email" = 'admin@pharmacie.local';

-- Si l'utilisateur n'existe pas, le créer
INSERT INTO "users" ("id", "email", "password", "role", "nom", "prenom", "actif", "createdAt", "updatedAt")
SELECT 
    'clx' || substr(md5(random()::text || clock_timestamp()::text), 1, 10),
    'admin@pharmacie.local',
    '$2a$12$aGvvGrqhwWi1jt2XAzib3Ov3fBybqGpBs7rkm7sn/n656Rrq.8yN6',
    'ADMIN',
    'Admin',
    'Pharmacie',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM "users" WHERE "email" = 'admin@pharmacie.local'
);

-- Mettre à jour l'utilisateur existant si nécessaire
UPDATE "users" 
SET 
    "password" = '$2a$12$aGvvGrqhwWi1jt2XAzib3Ov3fBybqGpBs7rkm7sn/n656Rrq.8yN6',
    "role" = 'ADMIN',
    "actif" = true,
    "nom" = 'Admin',
    "prenom" = 'Pharmacie',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "email" = 'admin@pharmacie.local';

-- Afficher le résultat final
SELECT '✅ Utilisateur admin vérifié et mis à jour!' as message;
SELECT id, email, role, actif, "createdAt" FROM "users" WHERE "email" = 'admin@pharmacie.local';

