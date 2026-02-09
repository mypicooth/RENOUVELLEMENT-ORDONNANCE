import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
          createdOperator: { select: { prenom: true } },
          renewals: {
            orderBy: { index: "asc" },
            include: {
              completedOperator: { select: { prenom: true } },
              completedBy: { select: { prenom: true, nom: true } },
            },
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
      
      // Vérifier si ce téléphone existe déjà pour un AUTRE patient
      // (on ne veut pas fusionner, juste avertir si nécessaire)
      const existingByPhone = await prisma.patient.findFirst({
        where: {
          telephone_normalise: phoneNormalized,
          actif: true,
          id: { not: params.id }, // Exclure le patient actuel
        },
      });

      // Si le téléphone existe déjà pour un autre patient, on met quand même à jour
      // mais on pourrait retourner un avertissement si nécessaire
      // Pour l'instant, on met simplement à jour sans fusionner
      updateData.telephone_normalise = phoneNormalized;
    }

    const patient = await prisma.patient.update({
      where: { id: params.id },
      data: updateData,
      include: {
        cycles: {
          include: {
            createdOperator: { select: { prenom: true } },
            renewals: {
              orderBy: { index: "asc" },
              include: {
                completedOperator: { select: { prenom: true } },
                completedBy: { select: { prenom: true, nom: true } },
              },
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

