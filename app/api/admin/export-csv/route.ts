import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/types";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const patients = await prisma.patient.findMany({
    include: {
      cycles: {
        include: {
          renewals: true,
        },
      },
    },
    orderBy: { date_recrutement: "desc" },
  });

  // Générer le CSV
  const headers = [
    "ID",
    "Nom",
    "Prénom",
    "Téléphone",
    "Date recrutement",
    "Consentement",
    "Actif",
    "Nombre de cycles",
    "Total renouvellements",
  ];

  const rows = patients.map((patient) => {
    const totalRenewals = patient.cycles.reduce(
      (sum, cycle) => sum + cycle.renewals.length,
      0
    );

    return [
      patient.id,
      patient.nom,
      patient.prenom,
      patient.telephone_normalise,
      patient.date_recrutement.toISOString().split("T")[0],
      patient.consentement ? "Oui" : "Non",
      patient.actif ? "Oui" : "Non",
      patient.cycles.length.toString(),
      totalRenewals.toString(),
    ];
  });

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="patients-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}

