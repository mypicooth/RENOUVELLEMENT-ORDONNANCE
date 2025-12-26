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

  const templates = await prisma.smsTemplate.findMany({
    orderBy: { code: "asc" },
  });

  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { code, libelle, message, actif } = body;

    if (!code || !libelle || !message) {
      return NextResponse.json(
        { error: "Code, libellé et message requis" },
        { status: 400 }
      );
    }

    if (message.length > 160) {
      return NextResponse.json(
        { error: "Le message ne doit pas dépasser 160 caractères" },
        { status: 400 }
      );
    }

    const template = await prisma.smsTemplate.create({
      data: {
        code: code.toUpperCase(),
        libelle,
        message,
        actif: actif !== false,
      },
    });

    return NextResponse.json(template);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Un template avec ce code existe déjà" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Erreur lors de la création" },
      { status: 500 }
    );
  }
}

