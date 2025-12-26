#!/usr/bin/env node

/**
 * Script pour tester la connexion à la base de données Supabase
 */

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

// Charger les variables d'environnement
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

loadEnvFiles();

async function testConnection() {
  console.log("🔍 Test de connexion à la base de données...\n");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL n'est pas défini");
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  console.log("📋 Connection string (masquée):");
  const maskedUrl = url.replace(/:[^:@]+@/, ":****@");
  console.log(`   ${maskedUrl}\n`);

  const prisma = new PrismaClient({
    log: ["error", "warn"],
  });

  try {
    console.log("🔄 Tentative de connexion...");
    await prisma.$connect();
    console.log("✅ Connexion réussie!\n");

    // Tester une requête simple
    console.log("🔄 Test d'une requête simple...");
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log("✅ Requête réussie!\n");

    console.log("✨ La base de données est accessible et fonctionnelle!");
  } catch (error) {
    console.error("\n❌ Erreur de connexion:\n");
    console.error(error.message);
    console.error("\n");

    if (error.message.includes("Can't reach database server")) {
      console.log("💡 Solutions possibles:\n");
      console.log("1. Vérifiez que votre projet Supabase est actif");
      console.log("   → Allez sur https://supabase.com/dashboard");
      console.log("   → Vérifiez que le projet n'est pas en pause\n");

      console.log("2. Vérifiez que vous utilisez la bonne connection string");
      console.log("   → Settings → Database → Connection string");
      console.log("   → Utilisez 'URI' (pas 'Connection Pooling')\n");

      console.log("3. Vérifiez votre firewall/antivirus");
      console.log("   → Le port 5432 doit être accessible\n");

      console.log("4. Essayez la connection pooler (port 6543)");
      console.log("   → Dans Supabase: Settings → Database");
      console.log("   → Utilisez 'Connection Pooling' → 'Session mode'\n");

      console.log("5. Vérifiez que le mot de passe est correct");
      console.log("   → Les caractères spéciaux doivent être encodés en URL\n");
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

