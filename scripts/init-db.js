#!/usr/bin/env node

/**
 * Script Node.js pour initialiser la base de données PostgreSQL
 * Fonctionne sur tous les systèmes (Windows, Mac, Linux)
 * Usage: npm run db:init
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Charger les variables d'environnement depuis .env et .env.local
function loadEnvFiles() {
  const envFiles = [".env.local", ".env"];
  const envDir = process.cwd();

  for (const envFile of envFiles) {
    const envPath = path.join(envDir, envFile);
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");
      envContent.split("\n").forEach((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith("#")) {
          const match = trimmedLine.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            // Supprimer les guillemets si présents
            if (
              (value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))
            ) {
              value = value.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      });
    }
  }
}

// Charger les fichiers .env au démarrage
loadEnvFiles();

// Couleurs pour la console
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    execSync(command, { stdio: "inherit", ...options });
    return true;
  } catch (error) {
    return false;
  }
}

function checkDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    log("❌ Erreur: DATABASE_URL n'est pas défini", "red");
    log("   Veuillez définir DATABASE_URL dans votre .env ou .env.local", "yellow");
    log("   Exemple: DATABASE_URL='postgresql://postgres:password@host:5432/db'", "yellow");
    process.exit(1);
  }
  
  // Valider le format de l'URL
  const url = process.env.DATABASE_URL;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
      log("⚠️  Avertissement: Le protocole devrait être 'postgresql:' ou 'postgres:'", "yellow");
    }
    if (!parsed.port || isNaN(parseInt(parsed.port))) {
      log("❌ Erreur: Le port dans DATABASE_URL est invalide", "red");
      log(`   URL actuelle: ${url.substring(0, 50)}...`, "yellow");
      log("   Le port doit être un nombre (ex: 5432)", "yellow");
      log("", "reset");
      log("💡 Solution: Si votre mot de passe contient des caractères spéciaux,", "cyan");
      log("   vous devez les encoder en URL (URL encoding)", "cyan");
      log("   Exemple: @ devient %40, # devient %23, etc.", "cyan");
      log("   Ou utilisez la connection string depuis Supabase Dashboard", "cyan");
      process.exit(1);
    }
  } catch (error) {
    log("❌ Erreur: Format de DATABASE_URL invalide", "red");
    log(`   Erreur: ${error.message}`, "yellow");
    log("", "reset");
    log("💡 Vérifiez votre connection string Supabase:", "cyan");
    log("   1. Allez dans Supabase Dashboard → Settings → Database", "blue");
    log("   2. Copiez la 'Connection string' (URI)", "blue");
    log("   3. Remplacez [YOUR-PASSWORD] par votre mot de passe", "blue");
    log("   4. Si le mot de passe contient @, #, %, etc., encodez-les en URL", "blue");
    process.exit(1);
  }
  
  log("✅ DATABASE_URL est défini et valide", "green");
}

function main() {
  log("🚀 Initialisation de la base de données...", "cyan");
  console.log("");

  // Vérifier DATABASE_URL
  checkDatabaseUrl();
  console.log("");

  // Étape 1: Générer le client Prisma
  log("📦 Étape 1/4: Génération du client Prisma...", "yellow");
  if (!exec("npx prisma generate")) {
    log("❌ Erreur lors de la génération du client Prisma", "red");
    process.exit(1);
  }
  log("✅ Client Prisma généré", "green");
  console.log("");

  // Étape 2: Créer la migration initiale (si elle n'existe pas)
  log("📝 Étape 2/4: Création de la migration initiale...", "yellow");
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  if (!fs.existsSync(migrationsDir)) {
    log("   Création de la première migration...", "blue");
    if (!exec("npx prisma migrate dev --name init --create-only")) {
      log("❌ Erreur lors de la création de la migration", "red");
      process.exit(1);
    }
    log("✅ Migration créée", "green");
  } else {
    log("ℹ️  Les migrations existent déjà", "blue");
  }
  console.log("");

  // Étape 3: Appliquer les migrations
  log("🗄️  Étape 3/4: Application des migrations...", "yellow");
  if (!exec("npx prisma migrate deploy")) {
    log("❌ Erreur lors de l'application des migrations", "red");
    process.exit(1);
  }
  log("✅ Migrations appliquées - Tables créées!", "green");
  console.log("");

  // Étape 4: Seed la base de données
  log("🌱 Étape 4/4: Remplissage avec les données initiales...", "yellow");
  if (!exec("npx prisma db seed")) {
    log("❌ Erreur lors du seed", "red");
    process.exit(1);
  }
  log("✅ Base de données initialisée!", "green");
  console.log("");

  log("✨ Initialisation terminée avec succès!", "green");
  console.log("");
  log("📊 Vous pouvez maintenant:", "cyan");
  log("   - Ouvrir Prisma Studio: npm run db:studio", "blue");
  log("   - Vérifier les tables dans Supabase Dashboard", "blue");
  console.log("");
}

main();

