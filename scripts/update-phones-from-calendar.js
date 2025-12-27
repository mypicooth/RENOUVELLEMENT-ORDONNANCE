/**
 * Script pour extraire les numéros de téléphone depuis les descriptions
 * des événements Google Calendar et mettre à jour les patients
 * 
 * Usage: node scripts/update-phones-from-calendar.js
 */

require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

const { PrismaClient } = require("@prisma/client");
const { google } = require("googleapis");
const { normalizePhone } = require("../lib/phone");

const prisma = new PrismaClient();

/**
 * Extrait le numéro de téléphone depuis une description
 */
function extractPhoneFromDescription(description) {
  if (!description) return null;

  // Patterns pour trouver les numéros de téléphone français
  const patterns = [
    /(\+33|0)[1-9]([.\s-]?\d{2}){4}/g, // Format français standard
    /(\+33|0033)[1-9]([.\s-]?\d{2}){4}/g, // Format international
    /0[1-9]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}/g, // Format avec espaces
    /0[1-9]-?\d{2}-?\d{2}-?\d{2}-?\d{2}/g, // Format avec tirets
  ];

  for (const pattern of patterns) {
    const matches = description.match(pattern);
    if (matches && matches.length > 0) {
      // Prendre le premier match et normaliser
      const phone = matches[0].replace(/[.\s-]/g, "");
      return normalizePhone(phone);
    }
  }

  return null;
}

/**
 * Récupère les événements depuis Google Calendar
 */
async function getCalendarEvents(accessToken, refreshToken) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI || 
      `${process.env.NEXTAUTH_URL || ""}/api/admin/google-calendar/callback`
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 an en arrière
      timeMax: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 an en avant
      maxResults: 2500,
      singleEvents: false,
      showDeleted: false,
    });

    return response.data.items || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des événements:", error);
    throw error;
  }
}

/**
 * Met à jour les numéros de téléphone des patients
 */
async function updatePatientPhones(events) {
  const results = {
    processed: 0,
    updated: 0,
    errors: 0,
    details: [],
  };

  for (const event of events) {
    try {
      const summary = event.summary || "";
      if (!summary || summary.trim().length === 0) {
        continue;
      }

      // Extraire nom et prénom du titre
      const nameParts = summary.trim().split(/\s+/);
      if (nameParts.length < 2) {
        continue;
      }

      const nom = nameParts[0];
      const prenom = nameParts.slice(1).join(" ");

      // Extraire le téléphone depuis la description
      const description = event.description || "";
      const phone = extractPhoneFromDescription(description);

      if (!phone) {
        results.details.push({
          patient: `${nom} ${prenom}`,
          status: "Ignoré",
          reason: "Aucun numéro de téléphone trouvé dans la description",
        });
        continue;
      }

      // Chercher le patient par nom et prénom
      const patients = await prisma.patient.findMany({
        where: {
          nom: {
            contains: nom,
          },
          prenom: {
            contains: prenom,
          },
          actif: true,
        },
      });

      if (patients.length === 0) {
        results.details.push({
          patient: `${nom} ${prenom}`,
          status: "Ignoré",
          reason: "Patient non trouvé dans la base de données",
        });
        continue;
      }

      // Mettre à jour tous les patients correspondants
      for (const patient of patients) {
        // Vérifier si le téléphone est différent
        if (patient.telephone_normalise === phone) {
          results.details.push({
            patient: `${nom} ${prenom}`,
            status: "Ignoré",
            reason: "Numéro déjà à jour",
          });
          continue;
        }

        // Mettre à jour le patient
        await prisma.patient.update({
          where: { id: patient.id },
          data: {
            telephone_normalise: phone,
          },
        });

        results.updated++;
        results.details.push({
          patient: `${nom} ${prenom}`,
          status: "Mis à jour",
          oldPhone: patient.telephone_normalise,
          newPhone: phone,
        });
      }

      results.processed++;
    } catch (error) {
      results.errors++;
      results.details.push({
        patient: event.summary || "Inconnu",
        status: "Erreur",
        error: error.message,
      });
      console.error(`Erreur pour l'événement ${event.summary}:`, error);
    }
  }

  return results;
}

/**
 * Fonction principale
 */
async function main() {
  console.log("🚀 Démarrage du script de mise à jour des numéros de téléphone...\n");

  // Vérifier les variables d'environnement
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error("❌ Erreur: GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET doivent être définis");
    console.log("\n💡 Pour obtenir les tokens d'accès:");
    console.log("1. Allez sur /admin/import dans l'application");
    console.log("2. Cliquez sur 'Se connecter à Google Calendar'");
    console.log("3. Après l'authentification, récupérez les tokens depuis les cookies");
    console.log("\nOu utilisez les tokens directement:");
    console.log("GOOGLE_ACCESS_TOKEN=... GOOGLE_REFRESH_TOKEN=... node scripts/update-phones-from-calendar.js");
    process.exit(1);
  }

  // Récupérer les tokens depuis les variables d'environnement ou les arguments
  const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!accessToken) {
    console.error("❌ Erreur: GOOGLE_ACCESS_TOKEN doit être défini");
    console.log("\n💡 Pour obtenir le token:");
    console.log("1. Allez sur /admin/import dans l'application");
    console.log("2. Cliquez sur 'Se connecter à Google Calendar'");
    console.log("3. Ouvrez la console du navigateur et récupérez le token depuis les cookies");
    console.log("4. Exécutez: GOOGLE_ACCESS_TOKEN=... GOOGLE_REFRESH_TOKEN=... node scripts/update-phones-from-calendar.js");
    process.exit(1);
  }

  try {
    console.log("📅 Récupération des événements depuis Google Calendar...");
    const events = await getCalendarEvents(accessToken, refreshToken);
    console.log(`✅ ${events.length} événements récupérés\n`);

    console.log("🔄 Mise à jour des numéros de téléphone...");
    const results = await updatePatientPhones(events);

    console.log("\n📊 Résultats:");
    console.log(`   - Événements traités: ${results.processed}`);
    console.log(`   - Patients mis à jour: ${results.updated}`);
    console.log(`   - Erreurs: ${results.errors}`);

    if (results.details.length > 0) {
      console.log("\n📋 Détails:");
      results.details.forEach((detail) => {
        if (detail.status === "Mis à jour") {
          console.log(`   ✅ ${detail.patient}: ${detail.oldPhone} → ${detail.newPhone}`);
        } else if (detail.status === "Ignoré") {
          console.log(`   ⏭️  ${detail.patient}: ${detail.reason}`);
        } else {
          console.log(`   ❌ ${detail.patient}: ${detail.error || detail.reason}`);
        }
      });
    }

    console.log("\n✅ Script terminé avec succès!");
  } catch (error) {
    console.error("\n❌ Erreur lors de l'exécution du script:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
if (require.main === module) {
  main().catch((error) => {
    console.error("Erreur fatale:", error);
    process.exit(1);
  });
}

module.exports = { extractPhoneFromDescription, updatePatientPhones };

