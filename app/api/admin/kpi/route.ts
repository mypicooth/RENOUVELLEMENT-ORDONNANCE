import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/types";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const isAdminOrSuperadmin =
    session?.user?.role === UserRole.ADMIN || session?.user?.role === UserRole.SUPERADMIN;
  if (!session || !isAdminOrSuperadmin) {
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

    const startMonth = startOfMonth(now);
    const endMonth = endOfMonth(now);

    // Nouveaux cycles ce mois (toutes ordonnances confondues)
    const nouveauxCycles = await prisma.prescriptionCycle.count({
      where: {
        created_at: {
          gte: startMonth,
          lte: endMonth,
        },
      },
    });

    // Patients qui avaient déjà au moins un cycle avant ce mois (patients déjà suivis)
    const cyclesAvantMois = await prisma.prescriptionCycle.findMany({
      where: { created_at: { lt: startMonth } },
      select: { patient_id: true },
    });
    const patientIdsDejaSuivis = new Set(cyclesAvantMois.map((c) => c.patient_id));

    // Cycles créés ce mois (pour savoir quels patients ont eu une ordonnance ce mois)
    const cyclesCeMois = await prisma.prescriptionCycle.findMany({
      where: {
        created_at: { gte: startMonth, lte: endMonth },
      },
      select: { patient_id: true },
    });
    const patientIdsAvecCycleCeMois = new Set(cyclesCeMois.map((c) => c.patient_id));

    // Vrais nouveaux patients = première ordonnance ce mois (aucun cycle avant ce mois)
    const nouveauxPatients = [...patientIdsAvecCycleCeMois].filter(
      (pid) => !patientIdsDejaSuivis.has(pid)
    ).length;

    // Nouvelles ordonnances pour des patients déjà suivis (info distincte)
    const nouveauxCyclesPatientsExistants = cyclesCeMois.filter((c) =>
      patientIdsDejaSuivis.has(c.patient_id)
    ).length;

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
      nouveauxPatients, // vrais nouveaux (première ordonnance ce mois)
      nouveauxCycles, // toutes nouvelles ordonnances ce mois
      nouveauxCyclesPatientsExistants, // nouvelles ordonnances pour patients déjà suivis
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




