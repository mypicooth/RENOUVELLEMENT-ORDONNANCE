# Script PowerShell pour initialiser la base de données PostgreSQL (Supabase/Vercel)
# Usage: .\scripts\init-db.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Initialisation de la base de données..." -ForegroundColor Cyan
Write-Host ""

# Vérifier que DATABASE_URL est défini
if (-not $env:DATABASE_URL) {
    Write-Host "❌ Erreur: DATABASE_URL n'est pas défini" -ForegroundColor Red
    Write-Host "   Veuillez définir DATABASE_URL dans votre .env ou .env.local"
    Write-Host "   Exemple: `$env:DATABASE_URL='postgresql://...'"
    exit 1
}

Write-Host "✅ DATABASE_URL est défini" -ForegroundColor Green
Write-Host ""

# Étape 1: Générer le client Prisma
Write-Host "📦 Étape 1/4: Génération du client Prisma..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de la génération du client Prisma" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Client Prisma généré" -ForegroundColor Green
Write-Host ""

# Étape 2: Créer la migration initiale (si elle n'existe pas)
Write-Host "📝 Étape 2/4: Création de la migration initiale..." -ForegroundColor Yellow
if (-not (Test-Path "prisma/migrations")) {
    Write-Host "   Création de la première migration..."
    npx prisma migrate dev --name init --create-only
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de la création de la migration" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Migration créée" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Les migrations existent déjà" -ForegroundColor Blue
}
Write-Host ""

# Étape 3: Appliquer les migrations
Write-Host "🗄️  Étape 3/4: Application des migrations..." -ForegroundColor Yellow
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'application des migrations" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Migrations appliquées - Tables créées!" -ForegroundColor Green
Write-Host ""

# Étape 4: Seed la base de données
Write-Host "🌱 Étape 4/4: Remplissage avec les données initiales..." -ForegroundColor Yellow
npx prisma db seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du seed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Base de données initialisée!" -ForegroundColor Green
Write-Host ""

Write-Host "✨ Initialisation terminée avec succès!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Vous pouvez maintenant:" -ForegroundColor Cyan
Write-Host "   - Ouvrir Prisma Studio: npm run db:studio"
Write-Host "   - Vérifier les tables dans Supabase Dashboard"
Write-Host ""

