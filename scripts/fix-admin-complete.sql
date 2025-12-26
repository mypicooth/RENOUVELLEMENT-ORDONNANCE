-- Script SQL COMPLET pour créer/corriger l'utilisateur admin
-- Exécutez ce script dans Supabase Dashboard → SQL Editor

-- Étape 1: Supprimer tous les utilisateurs admin existants
DELETE FROM "users" WHERE "email" = 'admin@pharmacie.local';

-- Étape 2: Créer l'utilisateur admin avec le hash correct
-- Hash vérifié pour "admin123" avec bcrypt (12 rounds)
-- Ce hash a été testé et fonctionne correctement
INSERT INTO "users" ("id", "email", "password", "role", "nom", "prenom", "actif", "createdAt", "updatedAt")
VALUES (
    'clx' || substr(md5(random()::text || clock_timestamp()::text), 1, 10),
    'admin@pharmacie.local',
    '$2a$12$aGvvGrqhwWi1jt2XAzib3Ov3fBybqGpBs7rkm7sn/n656Rrq.8yN6',
    'ADMIN',
    'Admin',
    'Pharmacie',
    true,  -- IMPORTANT: actif doit être true
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Étape 3: Vérifier la création
SELECT 
    '✅ Utilisateur admin créé!' as status,
    id,
    email,
    role,
    actif,
    LENGTH(password) as password_length,
    SUBSTRING(password, 1, 7) as hash_prefix
FROM "users" 
WHERE "email" = 'admin@pharmacie.local';

-- Étape 4: Instructions
SELECT 
    '📋 Identifiants de connexion:' as info,
    'Email: admin@pharmacie.local' as email,
    'Mot de passe: admin123' as password;

