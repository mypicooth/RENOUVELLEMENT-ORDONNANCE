import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Récupère tous les patients dont tous les renouvellements sont terminés
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    // Récupérer tous les patients actifs avec leurs cycles et renouvellements
    const patients = await prisma.patient.findMany({
      where: { actif: true },
      include: {
        cycles: {
          include: {
            renewals: {
              where: {
                statut: {
                  not: "ANNULE",
                },
              },
              orderBy: { index: "asc" },
            },
          },
        },
      },
    });

    // Filtrer les patients dont tous les renouvellements sont terminés
    const terminatedPatients = patients.filter((patient) => {
      // Si le patient n'a pas de cycles, il n'est pas terminé
      if (!patient.cycles || patient.cycles.length === 0) {
        return false;
      }

      // Vérifier que tous les renouvellements de tous les cycles sont terminés
      return patient.cycles.every((cycle) => {
        if (!cycle.renewals || cycle.renewals.length === 0) {
          return false;
        }
        // Tous les renouvellements doivent être TERMINE
        return cycle.renewals.every((renewal) => renewal.statut === "TERMINE");
      });
    });

    return NextResponse.json(terminatedPatients);
  } catch (error) {
    console.error("Erreur récupération patients terminés:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    );
  }
}

