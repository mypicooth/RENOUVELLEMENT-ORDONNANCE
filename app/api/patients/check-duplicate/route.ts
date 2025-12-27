import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Vérifie s'il existe des patients avec le même nom de famille
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const nom = searchParams.get("nom");

  if (!nom || nom.trim().length < 2) {
    return NextResponse.json([]);
  }

  try {
    // Rechercher les patients avec le même nom (insensible à la casse)
    const patients = await prisma.patient.findMany({
      where: {
        nom: {
          contains: nom.trim(),
          mode: "insensitive", // PostgreSQL supporte insensitive
        },
        actif: true,
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        telephone_normalise: true,
        date_recrutement: true,
      },
      orderBy: { date_recrutement: "desc" },
      take: 10, // Limiter à 10 résultats
    });

    return NextResponse.json(patients);
  } catch (error) {
    console.error("Erreur recherche doublons:", error);
    // En cas d'erreur (par exemple si PostgreSQL n'est pas disponible), essayer sans mode insensitive
    try {
      const patients = await prisma.patient.findMany({
        where: {
          nom: {
            contains: nom.trim(),
          },
          actif: true,
        },
        select: {
          id: true,
          nom: true,
          prenom: true,
          telephone_normalise: true,
          date_recrutement: true,
        },
        orderBy: { date_recrutement: "desc" },
        take: 10,
      });

      // Filtrer manuellement pour l'insensibilité à la casse
      const filtered = patients.filter((p) =>
        p.nom.toLowerCase().includes(nom.trim().toLowerCase())
      );

      return NextResponse.json(filtered);
    } catch (fallbackError) {
      console.error("Erreur recherche doublons (fallback):", fallbackError);
      return NextResponse.json([]);
    }
  }
}

