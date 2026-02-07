import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDays, startOfDay } from "date-fns";
import { adjustToWorkingDay } from "@/lib/prescription";

/**
 * Endpoint pour scanner les QR codes (avec authentification session)
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { renewalId, type, operatorId } = body;

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

    // Mettre à jour la date de délivrance, le statut et l'opérateur (pour stats / prime)
    await prisma.renewalEvent.update({
      where: { id: renewalId },
      data: {
        date_delivrance: today,
        statut: "TERMINE",
        date_termine: today,
        completed_by: session.user.id,
        completed_operator_id: operatorId || null,
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

    // Récupérer le cycle mis à jour
    const updatedCycle = await prisma.prescriptionCycle.findUnique({
      where: { id: cycle.id },
      include: {
        patient: true,
        renewals: {
          orderBy: { index: "asc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message:
        type === "RENEWAL"
          ? "Renouvellement enregistré. Prochain renouvellement recalculé."
          : "Fin d'ordonnance enregistrée. Cycle terminé.",
      cycle: updatedCycle,
    });
  } catch (error) {
    console.error("Erreur scan renouvellement:", error);
    return NextResponse.json(
      { error: "Erreur lors du scan" },
      { status: 500 }
    );
  }
}






