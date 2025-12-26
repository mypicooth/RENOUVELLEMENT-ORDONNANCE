import { prisma } from "./prisma";
import { addDays, getDay, subDays } from "date-fns";

/**
 * Ajuste une date pour qu'elle tombe sur un jour ouvrable (lundi-samedi)
 * Si la date tombe un dimanche, on l'avance au lundi (préférence pour ne pas retarder)
 */
function adjustToWorkingDay(date: Date): Date {
  const dayOfWeek = getDay(date); // 0 = dimanche, 1 = lundi, ..., 6 = samedi
  
  if (dayOfWeek === 0) {
    // Dimanche : avancer au lundi (1 jour après)
    return addDays(date, 1);
  }
  
  return date;
}

/**
 * Crée un cycle de prescription avec génération automatique des RenewalEvents
 * Les dates sont ajustées pour éviter les dimanches (reculées au samedi)
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
  // index 1 = R1 (R0 + 21 jours, ajusté si dimanche)
  // index 2 = R2 (R1 + 21 jours, ajusté si dimanche)
  // etc.
  const events = [];
  for (let i = 0; i <= nbRenouvellements; i++) {
    let dateTheorique = addDays(datePremiereDelivrance, i * intervalleJours);
    
    // Ajuster la date si elle tombe un dimanche (sauf pour R0 qui garde sa date originale)
    if (i > 0) {
      dateTheorique = adjustToWorkingDay(dateTheorique);
    }
    
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




