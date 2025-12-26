import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { patientId, dateTheorique } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: "patientId requis" },
        { status: 400 }
      );
    }

    // Vérifier que le patient existe
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Patient introuvable" },
        { status: 404 }
      );
    }

    // Créer un cycle temporaire pour ce renouvellement unique
    const today = dateTheorique ? new Date(dateTheorique) : new Date();
    const cycle = await prisma.prescriptionCycle.create({
      data: {
        patient_id: patientId,
        date_premiere_delivrance: today,
        nb_renouvellements: 0,
        intervalle_jours: 21,
        created_by: session.user.id,
      },
    });

    // Créer le renouvellement pour aujourd'hui
    const renewal = await prisma.renewalEvent.create({
      data: {
        prescription_cycle_id: cycle.id,
        index: 0,
        date_theorique: startOfDay(today),
        statut: "A_PREPARER",
      },
      include: {
        prescriptionCycle: {
          include: {
            patient: true,
          },
        },
      },
    });

    return NextResponse.json(renewal);
  } catch (error) {
    console.error("Erreur création renouvellement rapide:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création" },
      { status: 500 }
    );
  }
}




