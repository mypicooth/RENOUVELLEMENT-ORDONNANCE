#!/usr/bin/env node

/**
 * Script pour encoder correctement une connection string PostgreSQL
 * Utile si votre mot de passe contient des caractères spéciaux
 */

const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("🔧 Aide à la correction de DATABASE_URL\n");
console.log("Si votre mot de passe Supabase contient des caractères spéciaux");
console.log("(@, #, %, &, etc.), ils doivent être encodés en URL.\n");

rl.question("Collez votre connection string Supabase (avec [YOUR-PASSWORD]): ", (url) => {
  rl.question("Entrez votre mot de passe Supabase: ", (password) => {
    // Encoder le mot de passe en URL
    const encodedPassword = encodeURIComponent(password);
    
    // Remplacer [YOUR-PASSWORD] par le mot de passe encodé
    const fixedUrl = url.replace("[YOUR-PASSWORD]", encodedPassword);
    
    console.log("\n✅ Connection string corrigée :\n");
    console.log(`DATABASE_URL="${fixedUrl}"\n`);
    console.log("Copiez cette ligne dans votre fichier .env.local\n");
    
    rl.close();
  });
});

