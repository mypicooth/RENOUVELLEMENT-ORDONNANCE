import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function escapeCsv(value: string): string {
  const s = String(value ?? "");
  if (/[,"\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Export global CSV : pour chaque opérateur, liste des patients (nom, prénom) qu'il a enregistrés.
 * Réservé au superadmin.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const isAdminOrSuperadmin =
    session.user.role === UserRole.ADMIN || session.user.role === UserRole.SUPERADMIN;
  if (!isAdminOrSuperadmin) {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  const patients = await prisma.patient.findMany({
    where: {},
    include: {
      registeredOperator: { select: { prenom: true } },
    },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });

  // Trier par opérateur (prénom) puis nom, prénom patient
  patients.sort((a, b) => {
    const opA = a.registeredOperator?.prenom ?? "zzz";
    const opB = b.registeredOperator?.prenom ?? "zzz";
    if (opA !== opB) return opA.localeCompare(opB, "fr");
    if (a.nom !== b.nom) return a.nom.localeCompare(b.nom, "fr");
    return a.prenom.localeCompare(b.prenom, "fr");
  });

  const headers = ["Opérateur", "Nom", "Prénom", "Téléphone", "Date recrutement", "Actif"];
  const rows = patients.map((p) => [
    escapeCsv(p.registeredOperator?.prenom ?? "Non attribué"),
    escapeCsv(p.nom),
    escapeCsv(p.prenom),
    escapeCsv(p.telephone_normalise),
    escapeCsv(format(p.date_recrutement, "dd/MM/yyyy", { locale: fr })),
    p.actif ? "Oui" : "Non",
  ]);

  const bom = "\uFEFF";
  const csv = bom + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="patients-par-operateur.csv"',
    },
  });
}
