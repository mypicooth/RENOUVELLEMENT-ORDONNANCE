import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Liste des opérateurs (prénom uniquement) pour le formulaire nouveau patient.
 * Tous les utilisateurs connectés partagent le même compte ; le choix se fait à l'enregistrement du patient.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const operators = await prisma.operator.findMany({
    where: { actif: true },
    orderBy: { prenom: "asc" },
    select: { id: true, prenom: true },
  });

  return NextResponse.json(
    operators.map((o) => ({ id: o.id, label: o.prenom }))
  );
}
