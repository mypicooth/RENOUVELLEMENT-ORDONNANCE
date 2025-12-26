-- Script pour vérifier l'utilisateur admin dans Supabase
-- Exécutez ce script dans Supabase Dashboard → SQL Editor

-- Vérifier l'utilisateur admin
SELECT 
    id,
    email,
    role,
    actif,
    LENGTH(password) as password_length,
    SUBSTRING(password, 1, 29) as hash_start,
    CASE 
        WHEN password LIKE '$2a$12$%' THEN '✅ Format bcrypt correct'
        ELSE '❌ Format incorrect'
    END as hash_format,
    "createdAt",
    "updatedAt"
FROM "users" 
WHERE "email" = 'admin@pharmacie.local';

-- Si aucun résultat, l'utilisateur n'existe pas
-- Si actif = false, c'est le problème
-- Si le hash ne commence pas par $2a$12$, c'est le problème

