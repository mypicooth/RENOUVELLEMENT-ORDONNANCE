import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/types";
import { parse } from "csv-parse/sync";
import { normalizePhone } from "@/lib/phone";
import { createPrescriptionCycle } from "@/lib/prescription";
import { parse as parseDate } from "date-fns";

interface GoogleCalendarRow {
  "Subject"?: string;
  "Start Date"?: string;
  "Start Time"?: string;
  "End Date"?: string;
  "End Time"?: string;
  "All Day Event"?: string;
  "Recurrence Pattern"?: string;
  "Description"?: string;
  [key: string]: string | undefined;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    const text = await file.text();
    
    // Parser le CSV
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as GoogleCalendarRow[];

    const results = {
      success: 0,
      errors: 0,
      details: [] as Array<{ patient: string; status: string; error?: string }>,
    };

    // Traiter chaque ligne
    for (const record of records) {
      try {
        // Extraire les informations du sujet (format: "Nom Prénom" ou "Prénom Nom")
        const subject = record["Subject"] || record["subject"] || "";
        if (!subject.trim()) {
          results.errors++;
          results.details.push({
            patient: "Inconnu",
            status: "Erreur",
            error: "Sujet vide",
          });
          continue;
        }

        // Parser le nom et prénom (supposons format "Nom Prénom" ou "Prénom Nom")
        const nameParts = subject.trim().split(/\s+/);
        if (nameParts.length < 2) {
          results.errors++;
          results.details.push({
            patient: subject,
            status: "Erreur",
            error: "Format nom/prénom invalide",
          });
          continue;
        }

        // Supposons que le dernier mot est le prénom, le reste est le nom
        const prenom = nameParts[nameParts.length - 1];
        const nom = nameParts.slice(0, -1).join(" ");

        // Extraire la date de début
        const startDateStr = record["Start Date"] || record["Start date"] || record["start_date"] || "";
        if (!startDateStr) {
          results.errors++;
          results.details.push({
            patient: `${nom} ${prenom}`,
            status: "Erreur",
            error: "Date de début manquante",
          });
          continue;
        }

        // Parser la date (formats possibles: YYYY-MM-DD, DD/MM/YYYY, etc.)
        let startDate: Date;
        try {
          // Essayer différents formats
          if (startDateStr.includes("/")) {
            // Format DD/MM/YYYY ou MM/DD/YYYY
            const parts = startDateStr.split("/");
            if (parts.length === 3) {
              // Supposons DD/MM/YYYY
              startDate = new Date(
                parseInt(parts[2]),
                parseInt(parts[1]) - 1,
                parseInt(parts[0])
              );
            } else {
              startDate = parseDate(startDateStr, "dd/MM/yyyy", new Date());
            }
          } else if (startDateStr.includes("-")) {
            // Format YYYY-MM-DD
            startDate = new Date(startDateStr);
          } else {
            startDate = new Date(startDateStr);
          }
          
          // Vérifier que la date est valide
          if (isNaN(startDate.getTime())) {
            throw new Error("Date invalide");
          }
        } catch (error) {
          results.errors++;
          results.details.push({
            patient: `${nom} ${prenom}`,
            status: "Erreur",
            error: `Date invalide: ${startDateStr}`,
          });
          continue;
        }

        // Vérifier si le patient existe déjà (recherche insensible à la casse)
        const allPatients = await prisma.patient.findMany({
          where: { actif: true },
        });
        
        let patient = allPatients.find(
          (p) =>
            p.nom.toLowerCase().includes(nom.toLowerCase()) &&
            p.prenom.toLowerCase().includes(prenom.toLowerCase())
        ) || null;

        // Si le patient n'existe pas, le créer
        if (!patient) {
          // Essayer d'extraire le téléphone depuis la description
          const description = record["Description"] || record["description"] || "";
          const phoneMatch = description.match(/(\+33|0)[1-9]([.\s-]?\d{2}){4}/);
          const telephone = phoneMatch ? phoneMatch[0].replace(/[.\s-]/g, "") : "";

          if (!telephone) {
            results.errors++;
            results.details.push({
              patient: `${nom} ${prenom}`,
              status: "Erreur",
              error: "Téléphone manquant (nécessaire pour créer le patient)",
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

          patient = await prisma.patient.create({
            data: {
              nom,
              prenom,
              telephone_normalise: phoneNormalized,
              consentement: true, // Par défaut, on suppose oui pour les imports
              notes: description || undefined,
            },
          });
        }

        // Analyser le pattern de récurrence
        const recurrencePattern = record["Recurrence Pattern"] || record["recurrence"] || "";
        let nbRenouvellements = 0;
        let intervalleJours = 21;

        if (recurrencePattern) {
          // Exemple: "Every 3 weeks" ou "Toutes les 3 semaines"
          const weeksMatch = recurrencePattern.match(/(\d+)\s*(week|semaine)/i);
          if (weeksMatch) {
            const weeks = parseInt(weeksMatch[1]);
            intervalleJours = weeks * 7;
          }

          // Essayer de déterminer le nombre d'occurrences
          // Si "Until" est présent, calculer le nombre
          const untilMatch = recurrencePattern.match(/until\s+(\d{4}-\d{2}-\d{2})/i);
          if (untilMatch) {
            const untilDate = new Date(untilMatch[1]);
            const diffTime = untilDate.getTime() - startDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            nbRenouvellements = Math.floor(diffDays / intervalleJours);
          } else {
            // Par défaut, créer 12 renouvellements (environ 6 mois)
            nbRenouvellements = 12;
          }
        } else {
          // Pas de récurrence, créer juste R0
          nbRenouvellements = 0;
        }

        // Normaliser la date (début de journée)
        const normalizedStartDate = new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate()
        );

        // Vérifier si un cycle existe déjà pour ce patient avec cette date R0
        const existingCycle = await prisma.prescriptionCycle.findFirst({
          where: {
            patient_id: patient.id,
            date_premiere_delivrance: {
              gte: normalizedStartDate,
              lt: new Date(normalizedStartDate.getTime() + 24 * 60 * 60 * 1000),
            },
          },
        });

        if (existingCycle) {
          results.details.push({
            patient: `${nom} ${prenom}`,
            status: "Ignoré",
            error: "Cycle existant pour cette date",
          });
          continue;
        }

        // Créer le cycle de prescription
        await createPrescriptionCycle({
          patientId: patient.id,
          datePremiereDelivrance: normalizedStartDate,
          nbRenouvellements,
          intervalleJours,
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
          patient: record["Subject"] || "Inconnu",
          status: "Erreur",
          error: error.message || "Erreur inconnue",
        });
      }
    }

    return NextResponse.json({
      message: `Import terminé: ${results.success} importés, ${results.errors} erreurs`,
      results,
    });
  } catch (error: any) {
    console.error("Erreur import Google Calendar:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'import" },
      { status: 500 }
    );
  }
}

