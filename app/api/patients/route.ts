import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { createPrescriptionCycle } from "@/lib/prescription";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search");
  const actif = searchParams.get("actif") !== "false";

  const where: any = { actif };
  if (search) {
    // SQLite ne supporte pas mode: "insensitive", on utilise contains
    where.OR = [
      { nom: { contains: search } },
      { prenom: { contains: search } },
      { telephone_normalise: { contains: search } },
    ];
  }

  const patients = await prisma.patient.findMany({
    where,
    include: {
      cycles: {
        include: {
          renewals: true,
        },
      },
    },
    orderBy: { date_recrutement: "desc" },
    take: 100,
  });

  return NextResponse.json(patients);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      nom,
      prenom,
      telephone,
      consentement,
      notes,
      date_premiere_delivrance,
      nb_renouvellements,
      intervalle_jours,
    } = body;

    // Validation
    if (!nom || !prenom || !telephone) {
      return NextResponse.json(
        { error: "Nom, prénom et téléphone requis" },
        { status: 400 }
      );
    }

    if (!consentement) {
      return NextResponse.json(
        { error: "Le consentement est obligatoire" },
        { status: 400 }
      );
    }

    // Normaliser le téléphone
    const phoneNormalized = normalizePhone(telephone);
    if (!phoneNormalized) {
      return NextResponse.json(
        { error: "Numéro de téléphone invalide" },
        { status: 400 }
      );
    }

    // Vérifier si le patient existe déjà
    const existing = await prisma.patient.findFirst({
      where: {
        telephone_normalise: phoneNormalized,
        actif: true,
      },
    });

    let patient;
    if (existing) {
      // Mettre à jour le patient existant
      patient = await prisma.patient.update({
        where: { id: existing.id },
        data: {
          nom,
          prenom,
          consentement,
          notes,
        },
      });
    } else {
      // Créer un nouveau patient
      patient = await prisma.patient.create({
        data: {
          nom,
          prenom,
          telephone_normalise: phoneNormalized,
          consentement,
          notes,
        },
      });
    }

    // Si date_premiere_delivrance et nb_renouvellements sont fournis, créer le cycle
    if (date_premiere_delivrance && nb_renouvellements !== undefined) {
      const cycle = await createPrescriptionCycle({
        patientId: patient.id,
        datePremiereDelivrance: new Date(date_premiere_delivrance),
        nbRenouvellements: parseInt(nb_renouvellements),
        intervalleJours: intervalle_jours ? parseInt(intervalle_jours) : 21,
        createdBy: session.user.id,
      });

      return NextResponse.json({
        patient,
        cycle,
      });
    }

    return NextResponse.json({ patient });
  } catch (error) {
    console.error("Erreur création patient:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du patient" },
      { status: 500 }
    );
  }
}

