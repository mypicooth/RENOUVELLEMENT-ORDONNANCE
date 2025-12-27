import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/lib/types";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

/**
 * Extrait le numéro de téléphone depuis une description
 */
function extractPhoneFromDescription(description: string | null | undefined): string | null {
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
 * Met à jour les numéros de téléphone depuis Google Calendar
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    // Récupérer les tokens depuis les cookies
    const accessToken = request.cookies.get("google_access_token")?.value;
    const refreshToken = request.cookies.get("google_refresh_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Token d'accès manquant. Veuillez vous reconnecter à Google Calendar." },
        { status: 401 }
      );
    }

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

    const body = await request.json().catch(() => ({}));
    const startDate = body.startDate 
      ? new Date(body.startDate)
      : new Date(); // Par défaut, date du jour
    startDate.setHours(0, 0, 0, 0);

    // Récupérer les événements
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: startDate.toISOString(),
      timeMax: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 an en avant
      maxResults: 2500,
      singleEvents: false,
      showDeleted: false,
    });

    const events = response.data.items || [];
    const results = {
      processed: 0,
      updated: 0,
      errors: 0,
      details: [] as Array<{
        patient: string;
        status: string;
        reason?: string;
        oldPhone?: string;
        newPhone?: string;
        error?: string;
      }>,
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
      } catch (error: any) {
        results.errors++;
        results.details.push({
          patient: event.summary || "Inconnu",
          status: "Erreur",
          error: error.message || "Erreur inconnue",
        });
        console.error(`Erreur pour l'événement ${event.summary}:`, error);
      }
    }

    return NextResponse.json({
      message: `Mise à jour terminée : ${results.updated} patients mis à jour, ${results.errors} erreurs`,
      results,
    });
  } catch (error: any) {
    console.error("Erreur mise à jour téléphones:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la mise à jour des numéros de téléphone" },
      { status: 500 }
    );
  }
}

