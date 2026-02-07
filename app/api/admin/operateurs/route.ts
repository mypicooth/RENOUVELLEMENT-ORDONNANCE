import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/types";
import { createUser } from "@/lib/auth";

/**
 * Liste des utilisateurs (opérateurs et admins). Réservé au SUPERADMIN.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (session.user.role !== UserRole.SUPERADMIN) {
    return NextResponse.json({ error: "Accès réservé au superadmin" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      role: true,
      actif: true,
      createdAt: true,
    },
  });

  return NextResponse.json(users);
}

/**
 * Créer un opérateur (compte STAFF). Réservé au SUPERADMIN.
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
    const { email, password, nom, prenom } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    const emailTrim = String(email).trim().toLowerCase();
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 6 caractères" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: emailTrim },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Un compte avec cet email existe déjà" },
        { status: 400 }
      );
    }

    const user = await createUser(
      emailTrim,
      password,
      UserRole.STAFF,
      nom?.trim() || null,
      prenom?.trim() || null
    );

    return NextResponse.json({
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
      actif: user.actif,
    });
  } catch (error) {
    console.error("Erreur création opérateur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du compte" },
      { status: 500 }
    );
  }
}
