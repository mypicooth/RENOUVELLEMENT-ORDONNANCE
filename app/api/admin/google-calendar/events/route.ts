import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/lib/types";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { createPrescriptionCycle } from "@/lib/prescription";

/**
 * Récupère les événements depuis Google Calendar et les importe
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { calendarId, timeMin, timeMax } = body;

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

    // Récupérer les événements
    const response = await calendar.events.list({
      calendarId: calendarId || "primary",
      timeMin: timeMin || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 an en arrière
      timeMax: timeMax || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 an en avant
      maxResults: 2500,
      singleEvents: false, // Important pour récupérer les événements récurrents
      showDeleted: false,
    });

    const events = response.data.items || [];
    const results = {
      success: 0,
      errors: 0,
      details: [] as Array<{ patient: string; status: string; error?: string }>,
    };

    for (const event of events) {
      try {
        const summary = event.summary || "";
        if (!summary || summary.trim().length === 0) {
          continue;
        }

        // Extraire nom et prénom du titre (format: "Nom Prénom" ou "Prénom Nom")
        const nameParts = summary.trim().split(/\s+/);
        if (nameParts.length < 2) {
          results.errors++;
          results.details.push({
            patient: summary,
            status: "Erreur",
            error: "Format de nom invalide (attendu: Nom Prénom)",
          });
          continue;
        }

        const nom = nameParts[0];
        const prenom = nameParts.slice(1).join(" ");

        // Date de début
        const startDate = event.start?.dateTime || event.start?.date;
        if (!startDate) {
          results.errors++;
          results.details.push({
            patient: `${nom} ${prenom}`,
            status: "Erreur",
            error: "Date de début manquante",
          });
          continue;
        }

        const start = new Date(startDate);

        // Extraire le téléphone depuis la description
        const description = event.description || "";
        const phoneMatch = description.match(/(\+33|0)[1-9]([.\s-]?\d{2}){4}/);
        const telephone = phoneMatch ? phoneMatch[0].replace(/[.\s-]/g, "") : "";

        if (!telephone) {
          results.errors++;
          results.details.push({
            patient: `${nom} ${prenom}`,
            status: "Erreur",
            error: "Téléphone manquant dans la description",
          });
          continue;
        }

        const phoneNormalized = normalizePhone(telephone);
        if (!phoneNormalized) {
          results.errors++;
          results.details.push({
            patient: `${nom} ${prenom}`,
            status: "Erreur",
            error: "Téléphone invalide",
          });
          continue;
        }

        // Chercher ou créer le patient
        let patient = await prisma.patient.findFirst({
          where: {
            OR: [
              { telephone_normalise: phoneNormalized, actif: true },
              {
                nom: { contains: nom },
                prenom: { contains: prenom },
                actif: true,
              },
            ],
          },
        });

        if (!patient) {
          patient = await prisma.patient.create({
            data: {
              nom,
              prenom,
              telephone_normalise: phoneNormalized,
              consentement: true,
              notes: description || undefined,
            },
          });
        }

        // Analyser la récurrence
        let nbRenouvellements = 12; // Par défaut
        let intervalleJours = 21; // Par défaut

        if (event.recurrence && event.recurrence.length > 0) {
          const rrule = event.recurrence.find((r) => r.startsWith("RRULE:"));
          if (rrule) {
            const rruleStr = rrule.replace("RRULE:", "");
            const params = new URLSearchParams(rruleStr);

            // Détecter l'intervalle (FREQ=WEEKLY;INTERVAL=3)
            if (params.get("FREQ") === "WEEKLY") {
              const interval = parseInt(params.get("INTERVAL") || "3");
              intervalleJours = interval * 7;
            }

            // Détecter le nombre d'occurrences ou la date de fin
            const count = params.get("COUNT");
            const until = params.get("UNTIL");

            if (count) {
              nbRenouvellements = parseInt(count) - 1; // -1 car R0 est inclus
            } else if (until) {
              const untilDate = new Date(until);
              const diffTime = untilDate.getTime() - start.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              nbRenouvellements = Math.max(0, Math.floor(diffDays / intervalleJours));
            }
          }
        }

        // Vérifier si un cycle existe déjà pour ce patient avec cette date R0
        const existingCycle = await prisma.prescriptionCycle.findFirst({
          where: {
            patient_id: patient.id,
            date_premiere_delivrance: {
              gte: new Date(start.getFullYear(), start.getMonth(), start.getDate()),
              lt: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1),
            },
          },
        });

        if (existingCycle) {
          results.details.push({
            patient: `${nom} ${prenom}`,
            status: "Ignoré",
            error: "Cycle déjà existant pour cette date",
          });
          continue;
        }

        // Créer le cycle de prescription
        await createPrescriptionCycle({
          patientId: patient.id,
          datePremiereDelivrance: start,
          nbRenouvellements: nbRenouvellements,
          intervalleJours: intervalleJours,
          createdBy: session.user.id,
        });

        results.success++;
        results.details.push({
          patient: `${nom} ${prenom}`,
          status: "Importé",
        });
      } catch (error: any) {
        results.errors++;
        results.details.push({
          patient: event.summary || "Inconnu",
          status: "Erreur",
          error: error.message || "Erreur inconnue",
        });
      }
    }

    return NextResponse.json({
      message: `Import terminé : ${results.success} importés, ${results.errors} erreurs`,
      results,
    });
  } catch (error: any) {
    console.error("Erreur import Google Calendar:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'import depuis Google Calendar" },
      { status: 500 }
    );
  }
}

