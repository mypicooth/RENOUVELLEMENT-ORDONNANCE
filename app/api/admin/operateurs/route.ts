import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/types";

/**
 * Liste des opérateurs (prénom uniquement). Réservé au SUPERADMIN.
 * Les opérateurs n'ont pas de compte : tout le monde se connecte avec le même compte et choisit son prénom à l'enregistrement du patient.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (session.user.role !== UserRole.SUPERADMIN) {
    return NextResponse.json({ error: "Accès réservé au superadmin" }, { status: 403 });
  }

  const operators = await prisma.operator.findMany({
    orderBy: { prenom: "asc" },
    select: {
      id: true,
      prenom: true,
      actif: true,
      createdAt: true,
    },
  });

  return NextResponse.json(operators);
}

/**
 * Créer un opérateur (prénom uniquement). Réservé au SUPERADMIN.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (session.user.role !== UserRole.SUPERADMIN) {
    return NextResponse.json({ error: "Accès réservé au superadmin" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const prenom = body.prenom?.trim();

    if (!prenom) {
      return NextResponse.json(
        { error: "Le prénom est requis" },
        { status: 400 }
      );
    }

    const operator = await prisma.operator.create({
      data: { prenom },
    });

    return NextResponse.json({
      id: operator.id,
      prenom: operator.prenom,
      actif: operator.actif,
    });
  } catch (error) {
    console.error("Erreur création opérateur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création" },
      { status: 500 }
    );
  }
}
