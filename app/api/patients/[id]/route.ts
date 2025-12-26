import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: {
      cycles: {
        include: {
          renewals: {
            orderBy: { index: "asc" },
          },
        },
        orderBy: { created_at: "desc" },
      },
    },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }

  return NextResponse.json(patient);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nom, prenom, telephone, consentement, notes } = body;

    const updateData: any = {};
    
    if (nom !== undefined) updateData.nom = nom;
    if (prenom !== undefined) updateData.prenom = prenom;
    if (consentement !== undefined) updateData.consentement = consentement;
    if (notes !== undefined) updateData.notes = notes;

    // Si le téléphone est fourni, le normaliser
    if (telephone) {
      const phoneNormalized = normalizePhone(telephone);
      if (!phoneNormalized) {
        return NextResponse.json(
          { error: "Numéro de téléphone invalide" },
          { status: 400 }
        );
      }
      updateData.telephone_normalise = phoneNormalized;
    }

    const patient = await prisma.patient.update({
      where: { id: params.id },
      data: updateData,
      include: {
        cycles: {
          include: {
            renewals: {
              orderBy: { index: "asc" },
            },
          },
          orderBy: { created_at: "desc" },
        },
      },
    });

    return NextResponse.json(patient);
  } catch (error) {
    console.error("Erreur mise à jour patient:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 }
    );
  }
}

