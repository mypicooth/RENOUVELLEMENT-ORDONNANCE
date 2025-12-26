import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { anonymize } = body;

    if (anonymize) {
      // Anonymiser le patient
      await prisma.patient.update({
        where: { id: params.id },
        data: {
          nom: "ANONYME",
          prenom: "ANONYME",
          telephone_normalise: "00000000000",
          notes: null,
          actif: false,
        },
      });
    } else {
      // Supprimer complètement
      await prisma.patient.update({
        where: { id: params.id },
        data: {
          actif: false,
        },
      });

      // Supprimer les cycles et renouvellements associés
      const cycles = await prisma.prescriptionCycle.findMany({
        where: { patient_id: params.id },
      });

      for (const cycle of cycles) {
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

      await prisma.patient.delete({
        where: { id: params.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur anonymisation:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'anonymisation" },
      { status: 500 }
    );
  }
}

