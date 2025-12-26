import { prisma } from "./prisma";
import { addDays } from "date-fns";

/**
 * Crée un cycle de prescription avec génération automatique des RenewalEvents
 */
export async function createPrescriptionCycle(params: {
  patientId: string;
  datePremiereDelivrance: Date;
  nbRenouvellements: number;
  intervalleJours?: number;
  createdBy: string;
}) {
  const { patientId, datePremiereDelivrance, nbRenouvellements, intervalleJours = 21, createdBy } = params;

  // Créer le cycle
  const cycle = await prisma.prescriptionCycle.create({
    data: {
      patient_id: patientId,
      date_premiere_delivrance: datePremiereDelivrance,
      nb_renouvellements: nbRenouvellements,
      intervalle_jours: intervalleJours,
      created_by: createdBy,
    },
  });

  // Générer tous les RenewalEvents
  // index 0 = R0 (date_premiere_delivrance)
  // index 1 = R1 (R0 + 21 jours)
  // index 2 = R2 (R1 + 21 jours)
  // etc.
  const events = [];
  for (let i = 0; i <= nbRenouvellements; i++) {
    const dateTheorique = addDays(datePremiereDelivrance, i * intervalleJours);
    events.push({
      prescription_cycle_id: cycle.id,
      index: i,
      date_theorique: dateTheorique,
      statut: i === 0 ? "TERMINE" : "A_PREPARER", // R0 est déjà terminé
    });
  }

  await prisma.renewalEvent.createMany({
    data: events,
  });

  return prisma.prescriptionCycle.findUnique({
    where: { id: cycle.id },
    include: {
      patient: true,
      renewals: {
        orderBy: { index: "asc" },
      },
    },
  });
}




