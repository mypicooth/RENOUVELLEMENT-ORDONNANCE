#!/bin/bash

# Script pour initialiser la base de données PostgreSQL (Supabase/Vercel)
# Usage: ./scripts/init-db.sh

set -e  # Arrêter en cas d'erreur

echo "🚀 Initialisation de la base de données..."
echo ""

# Vérifier que DATABASE_URL est défini
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Erreur: DATABASE_URL n'est pas défini"
    echo "   Veuillez définir DATABASE_URL dans votre .env ou .env.local"
    echo "   Exemple: export DATABASE_URL='postgresql://...'"
    exit 1
fi

echo "✅ DATABASE_URL est défini"
echo ""

# Étape 1: Générer le client Prisma
echo "📦 Étape 1/4: Génération du client Prisma..."
npx prisma generate
echo "✅ Client Prisma généré"
echo ""

# Étape 2: Créer la migration initiale (si elle n'existe pas)
echo "📝 Étape 2/4: Création de la migration initiale..."
if [ ! -d "prisma/migrations" ]; then
    echo "   Création de la première migration..."
    npx prisma migrate dev --name init --create-only
    echo "✅ Migration créée"
else
    echo "ℹ️  Les migrations existent déjà"
fi
echo ""

# Étape 3: Appliquer les migrations
echo "🗄️  Étape 3/4: Application des migrations..."
npx prisma migrate deploy
echo "✅ Migrations appliquées - Tables créées!"
echo ""

# Étape 4: Seed la base de données
echo "🌱 Étape 4/4: Remplissage avec les données initiales..."
npx prisma db seed
echo "✅ Base de données initialisée!"
echo ""

echo "✨ Initialisation terminée avec succès!"
echo ""
echo "📊 Vous pouvez maintenant:"
echo "   - Ouvrir Prisma Studio: npm run db:studio"
echo "   - Vérifier les tables dans Supabase Dashboard"
echo ""


