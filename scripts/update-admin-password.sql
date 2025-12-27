-- Script SQL pour mettre à jour le mot de passe admin dans Supabase
-- Exécutez ce script dans Supabase Dashboard → SQL Editor

-- Supprimer l'ancien utilisateur admin s'il existe
DELETE FROM "users" WHERE "email" = 'admin@pharmacie.local';

-- Créer l'utilisateur admin avec le bon hash
-- Hash de "admin123" généré avec bcrypt (12 rounds)
INSERT INTO "users" ("id", "email", "password", "role", "nom", "prenom", "actif", "createdAt", "updatedAt")
VALUES (
    'clx' || substr(md5(random()::text || clock_timestamp()::text), 1, 10),
    'admin@pharmacie.local',
    '$2a$12$aGvvGrqhwWi1jt2XAzib3Ov3fBybqGpBs7rkm7sn/n656Rrq.8yN6',
    'ADMIN',
    'Admin',
    'Pharmacie',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Vérifier que l'utilisateur a été créé
SELECT '✅ Utilisateur admin créé/mis à jour!' as message;
SELECT id, email, role, nom, prenom FROM "users" WHERE "email" = 'admin@pharmacie.local';


