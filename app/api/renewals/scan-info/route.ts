import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * Endpoint pour récupérer les informations d'un renouvellement avant confirmation
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const renewalId = searchParams.get("renewalId");
    const type = searchParams.get("type");

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
            patient: true,
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

    const patient = renewal.prescriptionCycle.patient;
    const dateDelivrance = format(new Date(), "dd/MM/yyyy", { locale: fr });

    return NextResponse.json({
      success: true,
      renewal: {
        id: renewal.id,
        index: renewal.index,
        date_theorique: renewal.date_theorique,
        statut: renewal.statut,
        type: type,
      },
      patient: {
        id: patient.id,
        nom: patient.nom,
        prenom: patient.prenom,
      },
      dateDelivrance: dateDelivrance,
      numeroRenouvellement: renewal.index,
    });
  } catch (error) {
    console.error("Erreur récupération info renouvellement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des informations" },
      { status: 500 }
    );
  }
}

