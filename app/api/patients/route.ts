import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { normalizePhone } from "@/lib/phone";
import { createPrescriptionCycle } from "@/lib/prescription";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search");
  const actifParam = searchParams.get("actif");
  
  // Si actif n'est pas fourni, on ne filtre pas (tous les patients)
  // Si actif="true", on filtre actifs uniquement
  // Si actif="false", on filtre terminés uniquement
  const where: any = {};
  if (actifParam !== null) {
    where.actif = actifParam === "true";
  }
  if (search) {
    // SQLite ne supporte pas mode: "insensitive", on utilise contains
    where.OR = [
      { nom: { contains: search } },
      { prenom: { contains: search } },
      { telephone_normalise: { contains: search } },
    ];
  }

  try {
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
  } catch (error) {
    console.error("Erreur GET /api/patients:", error);
    const message =
      process.env.NODE_ENV === "development"
        ? String(error)
        : "Impossible de charger les patients. Vérifiez que les migrations ont été exécutées en production (voir MIGRATION-OPERATEURS-A-Z.md).";
    return NextResponse.json(
      { error: "Erreur serveur lors du chargement des patients", details: message },
      { status: 500 }
    );
  }
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
      operateur_id,
    } = body;

    // Validation
    if (!nom || !prenom || !telephone) {
      return NextResponse.json(
        { error: "Nom, prénom et téléphone requis" },
        { status: 400 }
      );
    }

    // Opérateur obligatoire (liste prénoms) : choisi au moment de l'enregistrement du patient
    const operatorId = operateur_id;
    if (!operatorId) {
      return NextResponse.json(
        { error: "Veuillez sélectionner l'opérateur qui enregistre ce patient" },
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

    // Vérifier si d'autres patients ont déjà ce numéro (informatif uniquement, on ne fusionne pas)
    const existingByPhone = await prisma.patient.findMany({
      where: {
        telephone_normalise: phoneNormalized,
        actif: true,
      },
    });

    // Vérifier aussi par nom de famille (pour détecter les doublons)
    const existingByName = await prisma.patient.findMany({
      where: {
        nom: {
          contains: nom.trim(),
          mode: "insensitive",
        },
        actif: true,
      },
      take: 5,
    }).catch(() => {
      // Fallback si mode insensitive n'est pas supporté
      return prisma.patient.findMany({
        where: {
          nom: {
            contains: nom.trim(),
          },
          actif: true,
        },
        take: 5,
      });
    });

    // Toujours créer un nouveau patient (plus de fusion par téléphone : deux personnes peuvent partager le même numéro)
    const patient = await prisma.patient.create({
      data: {
        nom,
        prenom,
        telephone_normalise: phoneNormalized,
        consentement,
        notes,
        ...(operatorId && { registered_operator_id: operatorId }),
      } as Prisma.PatientUncheckedCreateInput,
    });

    // Retourner les doublons éventuels (même nom) et les autres patients avec le même téléphone (information)
    const response: any = { patient };
    if (existingByName.length > 0) {
      response.duplicates = existingByName.map((p) => ({
        id: p.id,
        nom: p.nom,
        prenom: p.prenom,
        telephone_normalise: p.telephone_normalise,
      }));
    }
    if (existingByPhone.length > 0) {
      response.samePhonePatients = existingByPhone.map((p) => ({
        id: p.id,
        nom: p.nom,
        prenom: p.prenom,
      }));
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
        ...(response.duplicates ? { duplicates: response.duplicates } : {}),
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Erreur création patient:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du patient" },
      { status: 500 }
    );
  }
}

