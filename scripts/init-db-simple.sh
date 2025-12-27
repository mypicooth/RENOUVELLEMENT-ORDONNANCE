#!/bin/bash

# Script simple pour créer les tables (sans migration)
# Usage: ./scripts/init-db-simple.sh
# Alternative à prisma migrate deploy

set -e

echo "🚀 Création des tables avec Prisma..."
echo ""

# Vérifier que DATABASE_URL est défini
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Erreur: DATABASE_URL n'est pas défini"
    exit 1
fi

echo "📦 Génération du client Prisma..."
npx prisma generate

echo ""
echo "🗄️  Création des tables (db push)..."
npx prisma db push --accept-data-loss

echo ""
echo "🌱 Remplissage avec les données initiales..."
npx prisma db seed

echo ""
echo "✅ Terminé! Tables créées et données initiales ajoutées."


