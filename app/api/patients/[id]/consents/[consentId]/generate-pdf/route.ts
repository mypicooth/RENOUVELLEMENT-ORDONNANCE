import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateConsentPDF } from "@/lib/pdf/consentPdfGenerator";

// POST : Générer et stocker le PDF d'un consentement
export async function POST(
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

    // Générer le PDF
    const pdfData = {
      patientLastName: consent.patient.nom,
      patientFirstName: consent.patient.prenom,
      patientDOB: "", // TODO: Ajouter date de naissance si nécessaire
      patientPhone: consent.patient.telephone_normalise,
      patientEmail: "",
      todayDate: consent.today_date,
      endDate: consent.end_date || "jusqu'à révocation",
      signatureImage: consent.signature_data || undefined,
      consentId: consent.id,
    };

    const pdfBytes = await generateConsentPDF(pdfData);

    // Convertir en base64 pour stockage
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
    const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;

    // Mettre à jour le consentement avec l'URL du document
    // Pour l'instant, on stocke en base64 dans document_url
    // En production, vous pourriez utiliser un service de stockage (S3, etc.)
    await prisma.patientConsent.update({
      where: { id: params.consentId },
      data: {
        document_url: pdfDataUrl,
      },
    });

    return NextResponse.json({
      success: true,
      message: "PDF généré avec succès",
    });
  } catch (error) {
    console.error("Erreur génération PDF:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du PDF" },
      { status: 500 }
    );
  }
}

