-- Script pour récupérer le hash complet de l'utilisateur admin
-- Exécutez ce script dans Supabase Dashboard → SQL Editor

SELECT 
    email,
    password as hash_complet,
    LENGTH(password) as longueur
FROM "users" 
WHERE "email" = 'admin@pharmacie.local';


