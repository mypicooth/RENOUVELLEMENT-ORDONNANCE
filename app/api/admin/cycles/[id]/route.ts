import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/types";

/**
 * PATCH : attribuer ou modifier l'opérateur créateur d'un cycle (ordonnance).
 * Réservé au superadmin.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (session.user.role !== UserRole.SUPERADMIN) {
    return NextResponse.json({ error: "Accès réservé au superadmin" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { created_operator_id } = body;

    const cycle = await prisma.prescriptionCycle.findUnique({
      where: { id: params.id },
    });

    if (!cycle) {
      return NextResponse.json({ error: "Cycle introuvable" }, { status: 404 });
    }

    await prisma.prescriptionCycle.update({
      where: { id: params.id },
      data: {
        created_operator_id:
          created_operator_id === "" || created_operator_id == null
            ? null
            : created_operator_id,
      },
    });

    const updated = await prisma.prescriptionCycle.findUnique({
      where: { id: params.id },
      include: {
        createdOperator: { select: { prenom: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erreur mise à jour opérateur cycle:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 }
    );
  }
}
