import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays, startOfDay } from "date-fns";
import { adjustToWorkingDay } from "@/lib/prescription";

/**
 * Endpoint public pour les scans depuis l'application background
 * Sécurisé avec un token API (SCANNER_API_TOKEN)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { renewalId, type, apiToken } = body;

    // Vérifier le token API
    const expectedToken = process.env.SCANNER_API_TOKEN;
    if (!expectedToken) {
      return NextResponse.json(
        { error: "Token API non configuré côté serveur" },
        { status: 500 }
      );
    }

    if (apiToken !== expectedToken) {
      return NextResponse.json(
        { error: "Token API invalide" },
        { status: 401 }
      );
    }

    if (!renewalId || !type) {
      return NextResponse.json(
        { error: "renewalId et type requis" },
        { status: 400 }
      );
    }

    if (!["RENEWAL", "RENEWAL_END"].includes(type)) {
      return NextResponse.json(
        { error: "Type invalide. Doit être RENEWAL ou RENEWAL_END" },
        { status: 400 }
      );
    }

    // Récupérer le renouvellement et son cycle
    const renewal = await prisma.renewalEvent.findUnique({
      where: { id: renewalId },
      include: {
        prescriptionCycle: {
          include: {
            renewals: {
              orderBy: { index: "asc" },
            },
          },
        },
      },
    });

    if (!renewal) {
      return NextResponse.json(
        { error: "Renouvellement introuvable" },
        { status: 404 }
      );
    }

    const cycle = renewal.prescriptionCycle;
    const today = startOfDay(new Date());
    const intervalleJours = cycle.intervalle_jours || 21;

    // Mettre à jour la date de délivrance et le statut
    await prisma.renewalEvent.update({
      where: { id: renewalId },
      data: {
        date_delivrance: today,
        statut: "TERMINE",
        date_termine: today,
      },
    });

    // Si c'est un renouvellement normal, recalculer le prochain renouvellement
    if (type === "RENEWAL") {
      const nextRenewal = cycle.renewals.find(
        (r) => r.index === renewal.index + 1 && r.statut !== "ANNULE"
      );

      if (nextRenewal) {
        let newDateTheorique = addDays(today, intervalleJours);
        newDateTheorique = adjustToWorkingDay(newDateTheorique);

        await prisma.renewalEvent.update({
          where: { id: nextRenewal.id },
          data: {
            date_theorique: startOfDay(newDateTheorique),
          },
        });

        // Recalculer tous les renouvellements suivants
        const followingRenewals = cycle.renewals.filter(
          (r) => r.index > nextRenewal.index && r.statut !== "ANNULE"
        );

        let previousDate = newDateTheorique;
        for (const followingRenewal of followingRenewals) {
          previousDate = addDays(previousDate, intervalleJours);
          previousDate = adjustToWorkingDay(previousDate);

          await prisma.renewalEvent.update({
            where: { id: followingRenewal.id },
            data: {
              date_theorique: startOfDay(previousDate),
            },
          });
        }
      }
    } else if (type === "RENEWAL_END") {
      // Fin d'ordonnance : terminer le cycle
      await prisma.prescriptionCycle.update({
        where: { id: cycle.id },
        data: {
          statut: "TERMINE",
        },
      });

      // Annuler tous les renouvellements futurs
      const futureRenewals = cycle.renewals.filter(
        (r) => r.index > renewal.index
      );

      await prisma.renewalEvent.updateMany({
        where: {
          id: {
            in: futureRenewals.map((r) => r.id),
          },
        },
        data: {
          statut: "ANNULE",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message:
        type === "RENEWAL"
          ? "Renouvellement enregistré. Prochain renouvellement recalculé."
          : "Fin d'ordonnance enregistrée. Cycle terminé.",
    });
  } catch (error) {
    console.error("Erreur scan renouvellement:", error);
    return NextResponse.json(
      { error: "Erreur lors du scan" },
      { status: 500 }
    );
  }
}




