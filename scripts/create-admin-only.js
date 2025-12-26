#!/usr/bin/env node

/**
 * Script pour créer uniquement l'utilisateur admin
 * Usage: node scripts/create-admin-only.js
 */

const { PrismaClient } = require("@prisma/client");
const { hash } = require("bcryptjs");
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

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log("🔐 Création de l'utilisateur admin...\n");

    const adminEmail = "admin@pharmacie.local";
    const adminPassword = "admin123";
    const hashedPassword = await hash(adminPassword, 12);

    // Vérifier si l'utilisateur existe déjà
    const existing = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existing) {
      console.log("ℹ️  L'utilisateur admin existe déjà");
      console.log("   Mise à jour du mot de passe...\n");
      
      await prisma.user.update({
        where: { email: adminEmail },
        data: { password: hashedPassword },
      });
      
      console.log("✅ Mot de passe mis à jour!");
    } else {
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          role: "ADMIN",
          nom: "Admin",
          prenom: "Pharmacie",
        },
      });
      
      console.log("✅ Utilisateur admin créé!");
    }

    console.log("\n📋 Identifiants de connexion:");
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Mot de passe: ${adminPassword}\n`);
    
  } catch (error) {
    console.error("❌ Erreur:", error.message);
    if (error.message.includes("Can't reach database server")) {
      console.error("\n💡 Vérifiez que:");
      console.error("   1. DATABASE_URL est correct dans .env.local");
      console.error("   2. La base de données Supabase est accessible");
      console.error("   3. Les tables ont été créées\n");
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();

