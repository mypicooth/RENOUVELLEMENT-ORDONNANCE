import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendSmsToTextingHouse } from "@/lib/sms";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const { telephone } = body;

  if (!telephone) {
    return NextResponse.json({ error: "Numéro de téléphone requis" }, { status: 400 });
  }

  const phoneNormalized = normalizePhone(telephone);
  if (!phoneNormalized) {
    return NextResponse.json({ error: "Numéro de téléphone invalide" }, { status: 400 });
  }

  // Récupérer le template par défaut
  const template = await prisma.smsTemplate.findFirst({
    where: { code: "RENOUVELLEMENT_PRET", actif: true },
  });

  const message = template?.message ?? "Votre ordonnance est prête. Veuillez venir la récupérer à la pharmacie.";

  const result = await sendSmsToTextingHouse(phoneNormalized, message);

  return NextResponse.json(result);
}
