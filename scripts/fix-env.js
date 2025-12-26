#!/usr/bin/env node

/**
 * Script pour corriger automatiquement DATABASE_URL en encodant le mot de passe
 */

const fs = require("fs");
const path = require("path");

function encodePassword(password) {
  // Encoder les caractères spéciaux en URL
  return encodeURIComponent(password);
}

function fixDatabaseUrl(url) {
  // Pattern: postgresql://user:password@host:port/database
  const match = url.match(/^(postgresql?:\/\/)([^:]+):([^@]+)@(.+)$/);
  
  if (!match) {
    console.error("❌ Format de connection string invalide");
    return null;
  }

  const protocol = match[1];
  const user = match[2];
  const password = match[3];
  const hostAndPath = match[4];

  // Encoder le mot de passe
  const encodedPassword = encodePassword(password);

  return `${protocol}${user}:${encodedPassword}@${hostAndPath}`;
}

function main() {
  const envFiles = [".env.local", ".env"];
  let found = false;

  for (const envFile of envFiles) {
    const envPath = path.join(process.cwd(), envFile);
    
    if (fs.existsSync(envPath)) {
      console.log(`📝 Lecture de ${envFile}...\n`);
      
      let content = fs.readFileSync(envPath, "utf8");
      const lines = content.split("\n");
      let modified = false;

      const newLines = lines.map((line) => {
        const trimmed = line.trim();
        
        // Chercher DATABASE_URL
        if (trimmed.startsWith("DATABASE_URL=") || trimmed.startsWith("DATABASE_URL =")) {
          const match = trimmed.match(/DATABASE_URL\s*=\s*(.+)/);
          if (match) {
            let url = match[1].trim();
            
            // Supprimer les guillemets
            if ((url.startsWith('"') && url.endsWith('"')) || 
                (url.startsWith("'") && url.endsWith("'"))) {
              url = url.slice(1, -1);
            }

            // Vérifier si le mot de passe contient des caractères spéciaux non encodés
            const passwordMatch = url.match(/:\/([^:]+):([^@]+)@/);
            if (passwordMatch) {
              const password = passwordMatch[2];
              
              // Vérifier si le mot de passe contient des caractères spéciaux
              if (/[@#%&+=\/?:\s]/.test(password) && !password.includes("%")) {
                console.log("⚠️  Mot de passe détecté avec caractères spéciaux");
                console.log(`   Avant: ${password.substring(0, 10)}...\n`);
                
                const fixedUrl = fixDatabaseUrl(url);
                if (fixedUrl) {
                  modified = true;
                  console.log("✅ Connection string corrigée!\n");
                  return `DATABASE_URL="${fixedUrl}"`;
                }
              }
            }
          }
        }
        
        return line;
      });

      if (modified) {
        fs.writeFileSync(envPath, newLines.join("\n"), "utf8");
        console.log(`✅ Fichier ${envFile} mis à jour!\n`);
        found = true;
      } else {
        console.log(`ℹ️  Aucune modification nécessaire dans ${envFile}\n`);
      }
    }
  }

  if (!found) {
    console.log("❌ Aucun fichier .env ou .env.local trouvé");
    console.log("   Créez un fichier .env.local avec:");
    console.log('   DATABASE_URL="postgresql://postgres:password@host:5432/db"\n');
  }
}

main();

