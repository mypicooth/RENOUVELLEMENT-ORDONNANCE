import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// GET : Récupérer tous les consentements d'un patient
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const consents = await prisma.patientConsent.findMany({
      where: { patient_id: params.id },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            nom: true,
            prenom: true,
          },
        },
        revoker: {
          select: {
            id: true,
            email: true,
            nom: true,
            prenom: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(consents);
  } catch (error) {
    console.error("Erreur récupération consentements:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    );
  }
}

// POST : Créer un nouveau consentement
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { signatureImage, endDate, useRevocation } = body;

    // Récupérer le patient
    const patient = await prisma.patient.findUnique({
      where: { id: params.id },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Patient non trouvé" },
        { status: 404 }
      );
    }

    // Formater les dates
    const todayDate = format(new Date(), "dd/MM/yyyy", { locale: fr });
    const finalEndDate = useRevocation ? "jusqu'à révocation" : endDate;

    // Créer le consentement
    const consent = await prisma.patientConsent.create({
      data: {
        patient_id: params.id,
        consent_type: "ORDONNANCE_RETENTION",
        place: "LA POSSESSION",
        today_date: todayDate,
        end_date: finalEndDate,
        signature_data: signatureImage,
        signed_at: new Date(),
        created_by: session.user.id,
      },
      include: {
        patient: true,
        creator: {
          select: {
            id: true,
            email: true,
            nom: true,
            prenom: true,
          },
        },
      },
    });

    // Générer le PDF (sera fait côté serveur)
    // Pour l'instant, on retourne le consentement créé
    // Le PDF sera généré et stocké dans un prochain appel

    return NextResponse.json(consent);
  } catch (error) {
    console.error("Erreur création consentement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création" },
      { status: 500 }
    );
  }
}

