#!/usr/bin/env node

/**
 * Script pour générer le hash bcrypt du mot de passe admin123
 * Usage: node scripts/generate-admin-hash.js
 */

const { hash } = require("bcryptjs");

async function generateHash() {
  const password = "admin123";
  const hashedPassword = await hash(password, 12);
  
  console.log("🔐 Hash généré pour le mot de passe 'admin123':\n");
  console.log(hashedPassword);
  console.log("\n📝 Utilisez ce hash dans votre script SQL ou Prisma seed.\n");
}

generateHash().catch(console.error);

