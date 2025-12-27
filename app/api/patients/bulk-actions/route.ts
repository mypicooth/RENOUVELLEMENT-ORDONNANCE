import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/types";
import { sendRenewalSms } from "@/lib/sms";

type BulkAction = "SMS" | "SUPPRIMER_CYCLE" | "SUPPRIMER_PATIENT" | "NE_PAS_RENOUVELLER";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, patientIds, templateId, message } = body;

    if (!action || !patientIds || !Array.isArray(patientIds) || patientIds.length === 0) {
      return NextResponse.json(
        { error: "action et patientIds requis" },
        { status: 400 }
      );
    }

    const results: Array<{ success: boolean; patientId: string; patientName: string; error?: string }> = [];

    for (const patientId of patientIds) {
      try {
        const patient = await prisma.patient.findUnique({
          where: { id: patientId },
          include: {
            cycles: {
              include: {
                renewals: {
                  orderBy: { index: "desc" },
                  take: 1,
                },
              },
            },
          },
        });

        if (!patient) {
          results.push({
            success: false,
            patientId,
            patientName: "Inconnu",
            error: "Patient introuvable",
          });
          continue;
        }

        const patientName = `${patient.prenom} ${patient.nom}`;

        switch (action as BulkAction) {
          case "SMS": {
            // Envoyer un SMS avec le template choisi
            if (!templateId && !message) {
              results.push({
                success: false,
                patientId,
                patientName,
                error: "templateId ou message requis",
              });
              continue;
            }

            // Trouver le dernier renouvellement actif ou créer un SMS direct
            const lastRenewal = patient.cycles
              ?.flatMap((cycle) => cycle.renewals || [])
              .filter((r) => r.statut !== "ANNULE")
              .sort((a, b) => new Date(b.date_theorique).getTime() - new Date(a.date_theorique).getTime())[0];

            if (lastRenewal) {
              const smsResult = await sendRenewalSms({
                renewalEventId: lastRenewal.id,
                templateId: templateId || undefined,
                message: message || undefined,
                userId: session.user.id,
              });

              if (smsResult.success) {
                results.push({
                  success: true,
                  patientId,
                  patientName,
                });
              } else {
                results.push({
                  success: false,
                  patientId,
                  patientName,
                  error: smsResult.error || "Erreur envoi SMS",
                });
              }
            } else {
              // Envoyer un SMS direct sans renouvellement
              if (!patient.consentement) {
                results.push({
                  success: false,
                  patientId,
                  patientName,
                  error: "Patient sans consentement SMS",
                });
                continue;
              }

              // Récupérer le template ou utiliser le message
              const template = templateId
                ? await prisma.smsTemplate.findUnique({ where: { id: templateId } })
                : null;

              const smsMessage = message || template?.message || "Message SMS";

              // Envoyer le SMS directement
              const { sendSmsToTextingHouse } = await import("@/lib/sms");
              const { normalizePhone } = await import("@/lib/phone");
              const phoneNormalized = normalizePhone(patient.telephone_normalise);
              
              if (!phoneNormalized) {
                results.push({
                  success: false,
                  patientId,
                  patientName,
                  error: "Numéro de téléphone invalide",
                });
                continue;
              }

              const smsResult = await sendSmsToTextingHouse(phoneNormalized, smsMessage);

              if (smsResult.success) {
                // Créer un log SMS
                await prisma.smsLog.create({
                  data: {
                    telephone: phoneNormalized,
                    message: smsMessage,
                    statut: "SUCCESS",
                    api_id: smsResult.apiId || undefined,
                    sent_by: session.user.id,
                    template_id: templateId || undefined,
                  },
                });

                results.push({
                  success: true,
                  patientId,
                  patientName,
                });
              } else {
                // Créer un log SMS d'erreur
                await prisma.smsLog.create({
                  data: {
                    telephone: phoneNormalized,
                    message: smsMessage,
                    statut: "ERROR",
                    erreur: smsResult.error || "Erreur inconnue",
                    sent_by: session.user.id,
                    template_id: templateId || undefined,
                  },
                });

                results.push({
                  success: false,
                  patientId,
                  patientName,
                  error: smsResult.error || "Erreur envoi SMS",
                });
              }
            }
            break;
          }

          case "SUPPRIMER_CYCLE": {
            // Supprimer tous les cycles actifs du patient
            if (session.user.role !== UserRole.ADMIN) {
              results.push({
                success: false,
                patientId,
                patientName,
                error: "Seuls les administrateurs peuvent supprimer des cycles",
              });
              continue;
            }

            const activeCycles = patient.cycles.filter((c) => c.statut === "ACTIF");

            for (const cycle of activeCycles) {
              // Supprimer les renouvellements
              await prisma.renewalEvent.deleteMany({
                where: { prescription_cycle_id: cycle.id },
              });

              // Supprimer les logs SMS
              await prisma.smsLog.deleteMany({
                where: { prescription_cycle_id: cycle.id },
              });

              // Supprimer le cycle
              await prisma.prescriptionCycle.delete({
                where: { id: cycle.id },
              });
            }

            results.push({
              success: true,
              patientId,
              patientName,
            });
            break;
          }

          case "SUPPRIMER_PATIENT": {
            // Supprimer complètement le patient
            if (session.user.role !== UserRole.ADMIN) {
              results.push({
                success: false,
                patientId,
                patientName,
                error: "Seuls les administrateurs peuvent supprimer des patients",
              });
              continue;
            }

            // Supprimer tous les cycles et renouvellements
            for (const cycle of patient.cycles) {
              await prisma.renewalEvent.deleteMany({
                where: { prescription_cycle_id: cycle.id },
              });
              await prisma.smsLog.deleteMany({
                where: { prescription_cycle_id: cycle.id },
              });
              await prisma.prescriptionCycle.delete({
                where: { id: cycle.id },
              });
            }

            // Supprimer les consentements
            await prisma.patientConsent.deleteMany({
              where: { patient_id: patientId },
            });

            // Supprimer les rappels de facturation
            await prisma.billingReminder.deleteMany({
              where: { patient_id: patientId },
            });

            // Supprimer le patient
            await prisma.patient.delete({
              where: { id: patientId },
            });

            results.push({
              success: true,
              patientId,
              patientName,
            });
            break;
          }

          case "NE_PAS_RENOUVELLER": {
            // Mettre tous les cycles actifs en ANNULE
            const activeCycles = patient.cycles.filter((c) => c.statut === "ACTIF");

            for (const cycle of activeCycles) {
              // Mettre le cycle en ANNULE
              await prisma.prescriptionCycle.update({
                where: { id: cycle.id },
                data: { statut: "ANNULE" },
              });

              // Annuler tous les renouvellements futurs
              await prisma.renewalEvent.updateMany({
                where: {
                  prescription_cycle_id: cycle.id,
                  statut: { notIn: ["TERMINE", "ANNULE"] },
                },
                data: { statut: "ANNULE" },
              });
            }

            results.push({
              success: true,
              patientId,
              patientName,
            });
            break;
          }

          default:
            results.push({
              success: false,
              patientId,
              patientName,
              error: `Action inconnue: ${action}`,
            });
        }
      } catch (error) {
        results.push({
          success: false,
          patientId,
          patientName: "Erreur",
          error: error instanceof Error ? error.message : "Erreur inconnue",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failCount,
      },
    });
  } catch (error) {
    console.error("Erreur actions de masse:", error);
    return NextResponse.json(
      { error: "Erreur lors des actions de masse" },
      { status: 500 }
    );
  }
}

