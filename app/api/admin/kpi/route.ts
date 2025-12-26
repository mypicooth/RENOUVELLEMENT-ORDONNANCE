import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/types";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const period = searchParams.get("period") || "today";

  try {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = endOfDay(now);

    if (period === "today") {
      startDate = startOfDay(now);
    } else if (period === "week") {
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
    } else {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    }

    // Renouvellements aujourd'hui
    const renewalsToday = await prisma.renewalEvent.findMany({
      where: {
        date_theorique: {
          gte: startOfDay(now),
          lte: endOfDay(now),
        },
        statut: {
          not: "ANNULE",
        },
      },
    });

    const todayStats = {
      total: renewalsToday.length,
      aPreparer: renewalsToday.filter((r) => r.statut === "A_PREPARER").length,
      enPreparation: renewalsToday.filter((r) => r.statut === "EN_PREPARATION").length,
      pret: renewalsToday.filter((r) => r.statut === "PRET").length,
      smsEnvoye: renewalsToday.filter((r) => r.statut === "SMS_ENVOYE").length,
      termine: renewalsToday.filter((r) => r.statut === "TERMINE").length,
    };

    // Renouvellements semaine
    const renewalsWeek = await prisma.renewalEvent.findMany({
      where: {
        date_theorique: {
          gte: startOfWeek(now, { weekStartsOn: 1 }),
          lte: endOfWeek(now, { weekStartsOn: 1 }),
        },
        statut: {
          not: "ANNULE",
        },
      },
    });

    const weekStats = {
      total: renewalsWeek.length,
      smsEnvoyes: renewalsWeek.filter((r) => r.date_sms !== null).length,
      termines: renewalsWeek.filter((r) => r.statut === "TERMINE").length,
    };

    // Renouvellements mois
    const renewalsMonth = await prisma.renewalEvent.findMany({
      where: {
        date_theorique: {
          gte: startOfMonth(now),
          lte: endOfMonth(now),
        },
        statut: {
          not: "ANNULE",
        },
      },
    });

    // Nouveaux patients ce mois
    const nouveauxPatients = await prisma.patient.count({
      where: {
        date_recrutement: {
          gte: startOfMonth(now),
          lte: endOfMonth(now),
        },
      },
    });

    // Nouveaux cycles ce mois
    const nouveauxCycles = await prisma.prescriptionCycle.count({
      where: {
        created_at: {
          gte: startOfMonth(now),
          lte: endOfMonth(now),
        },
      },
    });

    // SMS envoyés ce mois
    const smsLogsMonth = await prisma.smsLog.count({
      where: {
        sent_at: {
          gte: startOfMonth(now),
          lte: endOfMonth(now),
        },
        statut: "SUCCESS",
      },
    });

    const monthStats = {
      total: renewalsMonth.length,
      nouveauxPatients,
      nouveauxCycles,
      smsEnvoyes: smsLogsMonth,
    };

    // Statistiques patients
    const totalPatients = await prisma.patient.count({
      where: { actif: true },
    });

    const patientsAvecConsentement = await prisma.patient.count({
      where: {
        actif: true,
        consentement: true,
      },
    });

    const patientsStats = {
      total: totalPatients,
      avecConsentement: patientsAvecConsentement,
      sansConsentement: totalPatients - patientsAvecConsentement,
    };

    // Statistiques cycles
    const cyclesActifs = await prisma.prescriptionCycle.count({
      where: { statut: "ACTIF" },
    });

    const cyclesTermines = await prisma.prescriptionCycle.count({
      where: { statut: "TERMINE" },
    });

    const cyclesAnnules = await prisma.prescriptionCycle.count({
      where: { statut: "ANNULE" },
    });

    const cyclesStats = {
      actifs: cyclesActifs,
      termines: cyclesTermines,
      annules: cyclesAnnules,
    };

    return NextResponse.json({
      today: todayStats,
      week: weekStats,
      month: monthStats,
      patients: patientsStats,
      cycles: cyclesStats,
    });
  } catch (error) {
    console.error("Erreur calcul KPI:", error);
    return NextResponse.json(
      { error: "Erreur lors du calcul des KPI" },
      { status: 500 }
    );
  }
}




