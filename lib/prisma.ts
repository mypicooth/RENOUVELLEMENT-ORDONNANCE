import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// En production (serverless), modifier l'URL pour désactiver les prepared statements
// Cela évite l'erreur "prepared statement already exists" sur Vercel
let databaseUrl = process.env.DATABASE_URL;

if (process.env.NODE_ENV === "production" && databaseUrl) {
  // Pour Supabase avec connection pooling (port 6543 ou "pooler" dans l'URL), ajouter pgbouncer=true
  // Cela désactive automatiquement les prepared statements
  if (databaseUrl.includes(":6543") || databaseUrl.includes("pooler") || databaseUrl.includes("supabase")) {
    if (!databaseUrl.includes("pgbouncer=true")) {
      databaseUrl = databaseUrl.includes("?")
        ? `${databaseUrl}&pgbouncer=true`
        : `${databaseUrl}?pgbouncer=true`;
    }
  } else {
    // Pour les autres connexions, ajouter connection_limit=1
    if (!databaseUrl.includes("?")) {
      databaseUrl = `${databaseUrl}?connection_limit=1&pool_timeout=20`;
    } else if (!databaseUrl.includes("connection_limit")) {
      databaseUrl = `${databaseUrl}&connection_limit=1&pool_timeout=20`;
    }
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

// En production (Vercel), ne pas réutiliser le client global pour éviter les problèmes de prepared statements
// Chaque invocation serverless créera son propre client
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}




