import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Liste des utilisateurs actifs (opérateurs) pour sélection dans les formulaires.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { actif: true },
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
    },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      label: [u.prenom, u.nom].filter(Boolean).join(" ") || u.email,
      email: u.email,
    }))
  );
}
