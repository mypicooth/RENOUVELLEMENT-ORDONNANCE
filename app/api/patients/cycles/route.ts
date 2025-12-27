import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createPrescriptionCycle } from "@/lib/prescription";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { patientId, date_premiere_delivrance, nb_renouvellements, intervalle_jours } = body;

    if (!patientId || !date_premiere_delivrance || nb_renouvellements === undefined) {
      return NextResponse.json(
        { error: "patientId, date_premiere_delivrance et nb_renouvellements requis" },
        { status: 400 }
      );
    }

    // Vérifier que le patient existe
    const { prisma } = await import("@/lib/prisma");
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Patient introuvable" },
        { status: 404 }
      );
    }

    // Réactiver le patient s'il est inactif
    if (!patient.actif) {
      await prisma.patient.update({
        where: { id: patientId },
        data: { actif: true },
      });
    }

    // Créer le nouveau cycle
    const cycle = await createPrescriptionCycle({
      patientId,
      datePremiereDelivrance: new Date(date_premiere_delivrance),
      nbRenouvellements: parseInt(nb_renouvellements),
      intervalleJours: intervalle_jours ? parseInt(intervalle_jours) : 21,
      createdBy: session.user.id,
    });

    return NextResponse.json(cycle);
  } catch (error) {
    console.error("Erreur création cycle:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du cycle" },
      { status: 500 }
    );
  }
}

