import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateConsentPDF } from "@/lib/pdf/consentPdfGenerator";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// GET : Télécharger le PDF d'un consentement
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; consentId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const consent = await prisma.patientConsent.findUnique({
      where: { id: params.consentId },
      include: {
        patient: true,
      },
    });

    if (!consent || consent.patient_id !== params.id) {
      return NextResponse.json(
        { error: "Consentement non trouvé" },
        { status: 404 }
      );
    }

    // Si le PDF existe déjà, le retourner
    if (consent.document_url) {
      // TODO: Retourner le fichier depuis le stockage
      // Pour l'instant, on régénère
    }

    // Générer le PDF
    const pdfData = {
      patientLastName: consent.patient.nom,
      patientFirstName: consent.patient.prenom,
      patientDOB: "", // TODO: Ajouter date de naissance au modèle Patient si nécessaire
      patientPhone: consent.patient.telephone_normalise,
      patientEmail: "",
      todayDate: consent.today_date,
      endDate: consent.end_date || "jusqu'à révocation",
      signatureImage: consent.signature_data || undefined,
      consentId: consent.id,
    };

    const pdfBytes = await generateConsentPDF(pdfData);

    // Convertir Uint8Array en Buffer pour NextResponse
    const pdfBuffer = Buffer.from(pdfBytes);

    // Retourner le PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="autorisation-${consent.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Erreur génération PDF:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du PDF" },
      { status: 500 }
    );
  }
}

// PATCH : Révoquer un consentement
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; consentId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { reason } = body;

    const consent = await prisma.patientConsent.findUnique({
      where: { id: params.consentId },
    });

    if (!consent || consent.patient_id !== params.id) {
      return NextResponse.json(
        { error: "Consentement non trouvé" },
        { status: 404 }
      );
    }

    if (consent.revoked_at) {
      return NextResponse.json(
        { error: "Consentement déjà révoqué" },
        { status: 400 }
      );
    }

    const updated = await prisma.patientConsent.update({
      where: { id: params.consentId },
      data: {
        revoked_at: new Date(),
        revoked_reason: reason || null,
        revoked_by: session.user.id,
      },
      include: {
        revoker: {
          select: {
            id: true,
            email: true,
            nom: true,
            prenom: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erreur révocation consentement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la révocation" },
      { status: 500 }
    );
  }
}

