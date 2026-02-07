import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/types";
import { startOfMonth, endOfMonth } from "date-fns";

/**
 * Statistiques des renouvellements par opérateur pour un mois donné.
 * Utilisé pour le suivi des primes (objectif de renouvellements par employé).
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (session.user.role !== UserRole.SUPERADMIN) {
    return NextResponse.json({ error: "Accès réservé au superadmin" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const monthParam = searchParams.get("month"); // YYYY-MM

  let start: Date;
  let end: Date;

  if (monthParam) {
    const [y, m] = monthParam.split("-").map(Number);
    if (!y || !m || m < 1 || m > 12) {
      return NextResponse.json(
        { error: "Paramètre month invalide (attendu: YYYY-MM)" },
        { status: 400 }
      );
    }
    start = startOfMonth(new Date(y, m - 1, 1));
    end = endOfMonth(start);
  } else {
    const now = new Date();
    start = startOfMonth(now);
    end = endOfMonth(now);
  }

  // Renouvellements terminés dans la période, avec l'opérateur qui a scanné
  const renewals = await prisma.renewalEvent.findMany({
    where: {
      statut: "TERMINE",
      date_termine: {
        gte: start,
        lte: end,
      },
    },
    select: {
      completed_by: true,
      completedBy: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
        },
      },
    },
  });

  // Grouper par opérateur
  const byOperator = new Map<
    string,
    { userId: string; name: string; email: string; count: number }
  >();

  for (const r of renewals) {
    const key = r.completed_by ?? "__non_attribue__";
    const name = r.completedBy
      ? [r.completedBy.prenom, r.completedBy.nom].filter(Boolean).join(" ") || r.completedBy.email
      : "Non attribué";
    const email = r.completedBy?.email ?? "";
    const userId = r.completed_by ?? "";

    if (!byOperator.has(key)) {
      byOperator.set(key, { userId, name, email, count: 0 });
    }
    byOperator.get(key)!.count += 1;
  }

  const stats = Array.from(byOperator.values()).sort((a, b) => b.count - a.count);

  return NextResponse.json({
    month: monthParam || `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
    start: start.toISOString(),
    end: end.toISOString(),
    stats,
  });
}
