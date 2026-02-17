import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/types";
import { addDays } from "date-fns";
import { adjustToWorkingDay } from "@/lib/prescription";

const isAdminOrSuper = (role: string) =>
  role === UserRole.ADMIN || role === UserRole.SUPERADMIN;

/**
 * PATCH : opérations sur un cycle.
 * - stop: true → arrêter le cycle (TERMINE + annuler les renouvellements non terminés) — ADMIN ou SUPERADMIN
 * - nb_renouvellements: number → modifier le nombre de renouvellements — ADMIN ou SUPERADMIN
 * - created_operator_id → attribuer l'opérateur créateur — SUPERADMIN uniquement
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { stop, nb_renouvellements, created_operator_id } = body;

    const cycle = await prisma.prescriptionCycle.findUnique({
      where: { id: params.id },
      include: {
        renewals: { orderBy: { index: "asc" } },
      },
    });

    if (!cycle) {
      return NextResponse.json({ error: "Cycle introuvable" }, { status: 404 });
    }

    const updates: { statut?: string; nb_renouvellements?: number; created_operator_id?: string | null } = {};

    // --- Arrêt manuel du cycle ---
    if (stop === true) {
      if (!isAdminOrSuper(session.user.role as string)) {
        return NextResponse.json({ error: "Accès réservé (admin ou superadmin)" }, { status: 403 });
      }
      if (cycle.statut === "TERMINE" || cycle.statut === "ANNULE") {
        return NextResponse.json({ error: "Ce cycle est déjà terminé ou annulé" }, { status: 400 });
      }
      updates.statut = "TERMINE";
      const toCancel = cycle.renewals.filter(
        (r) => r.statut !== "TERMINE" && r.statut !== "ANNULE"
      );
      if (toCancel.length > 0) {
        await prisma.renewalEvent.updateMany({
          where: { id: { in: toCancel.map((r) => r.id) } },
          data: { statut: "ANNULE" },
        });
      }
    }

    // --- Modifier le nombre de renouvellements ---
    if (typeof nb_renouvellements === "number") {
      if (!isAdminOrSuper(session.user.role as string)) {
        return NextResponse.json({ error: "Accès réservé (admin ou superadmin)" }, { status: 403 });
      }
      const currentMaxIndex = cycle.nb_renouvellements; // indices 0..currentMaxIndex
      if (nb_renouvellements < 1 || nb_renouvellements > 99) {
        return NextResponse.json({ error: "Le nombre de renouvellements doit être entre 1 et 99" }, { status: 400 });
      }
      const intervalleJours = cycle.intervalle_jours ?? 21;

      if (nb_renouvellements > currentMaxIndex) {
        // Ajouter des renouvellements : créer les index currentMaxIndex+1 .. nb_renouvellements
        const lastRenewal = cycle.renewals[cycle.renewals.length - 1];
        const lastDate = lastRenewal
          ? new Date(lastRenewal.date_theorique)
          : new Date(cycle.date_premiere_delivrance);
        const newEvents: { prescription_cycle_id: string; index: number; date_theorique: Date; statut: string }[] = [];
        let prevDate = lastDate;
        for (let i = currentMaxIndex + 1; i <= nb_renouvellements; i++) {
          prevDate = addDays(prevDate, intervalleJours);
          prevDate = adjustToWorkingDay(prevDate);
          newEvents.push({
            prescription_cycle_id: cycle.id,
            index: i,
            date_theorique: prevDate,
            statut: "A_PREPARER",
          });
        }
        if (newEvents.length > 0) {
          await prisma.renewalEvent.createMany({ data: newEvents });
        }
        updates.nb_renouvellements = nb_renouvellements;
      } else if (nb_renouvellements < currentMaxIndex) {
        // Réduire : annuler les renouvellements d'index > nb_renouvellements
        const toAnnul = cycle.renewals.filter((r) => r.index > nb_renouvellements);
        if (toAnnul.length > 0) {
          await prisma.renewalEvent.updateMany({
            where: { id: { in: toAnnul.map((r) => r.id) } },
            data: { statut: "ANNULE" },
          });
        }
        updates.nb_renouvellements = nb_renouvellements;
      }
    }

    // --- Opérateur créateur (superadmin uniquement) ---
    if (created_operator_id !== undefined) {
      if (session.user.role !== UserRole.SUPERADMIN) {
        return NextResponse.json({ error: "Accès réservé au superadmin" }, { status: 403 });
      }
      updates.created_operator_id =
        created_operator_id === "" || created_operator_id == null ? null : created_operator_id;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.prescriptionCycle.update({
        where: { id: params.id },
        data: updates,
      });
    }

    const updated = await prisma.prescriptionCycle.findUnique({
      where: { id: params.id },
      include: {
        createdOperator: { select: { prenom: true } },
        renewals: { orderBy: { index: "asc" } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erreur mise à jour cycle:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 }
    );
  }
}
