import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, isToday } from "date-fns";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get("date");
  const statut = searchParams.get("statut");

  const targetDate = date ? new Date(date) : new Date();
  const start = startOfDay(targetDate);
  const end = endOfDay(targetDate);

  const where: any = {
    date_theorique: {
      gte: start,
      lte: end,
    },
    statut: {
      not: "ANNULE",
    },
  };

  if (statut) {
    where.statut = statut;
  }

  try {
    const renewals = await prisma.renewalEvent.findMany({
      where,
      include: {
        prescriptionCycle: {
          include: {
            patient: true,
          },
        },
      },
      orderBy: [
        { statut: "asc" },
        { date_theorique: "asc" },
      ],
    });

    return NextResponse.json(renewals || []);
  } catch (error) {
    console.error("Erreur récupération renouvellements:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, statut, date_theorique } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID requis" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (statut) {
      updateData.statut = statut;
      if (statut === "EN_PREPARATION") {
        updateData.date_preparation = new Date();
      } else if (statut === "TERMINE") {
        updateData.date_termine = new Date();
      }
    }
    
    if (date_theorique) {
      updateData.date_theorique = startOfDay(new Date(date_theorique));
    }

    const renewal = await prisma.renewalEvent.update({
      where: { id },
      data: updateData,
      include: {
        prescriptionCycle: {
          include: {
            patient: true,
          },
        },
      },
    });

    return NextResponse.json(renewal);
  } catch (error) {
    console.error("Erreur mise à jour renouvellement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 }
    );
  }
}

