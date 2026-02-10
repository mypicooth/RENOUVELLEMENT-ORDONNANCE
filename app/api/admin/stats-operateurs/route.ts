import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/types";
import { startOfMonth, endOfMonth } from "date-fns";

/**
 * Statistiques des créations de renouvellement (ordonnances) par opérateur pour un mois donné.
 * Uniquement les créations (nouveau patient ou nouvelle ordonnance), pas les scans.
 * Utilisé pour le suivi des primes (objectif par employé).
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const isAdminOrSuperadmin =
    session.user.role === UserRole.ADMIN || session.user.role === UserRole.SUPERADMIN;
  if (!isAdminOrSuperadmin) {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
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

  // Ordonnances (cycles) créées dans la période, par opérateur créateur
  const cyclesCreated = await prisma.prescriptionCycle.findMany({
    where: {
      created_at: {
        gte: start,
        lte: end,
      },
    },
    select: {
      created_operator_id: true,
      createdOperator: {
        select: { id: true, prenom: true },
      },
    },
  });

  const byCreator = new Map<
    string,
    { userId: string; name: string; email: string; count: number }
  >();

  for (const c of cyclesCreated) {
    const key = c.created_operator_id ?? "__non_attribue__";
    const name = c.createdOperator?.prenom ?? "Non attribué";
    const userId = c.created_operator_id ?? "";

    if (!byCreator.has(key)) {
      byCreator.set(key, { userId, name, email: "", count: 0 });
    }
    byCreator.get(key)!.count += 1;
  }

  const stats = Array.from(byCreator.values()).sort(
    (a, b) => b.count - a.count
  );

  return NextResponse.json({
    month: monthParam || `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
    start: start.toISOString(),
    end: end.toISOString(),
    stats,
  });
}
