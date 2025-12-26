import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { sendRenewalSms } from "@/lib/sms";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { renewalEventId, templateId, message } = body;

    if (!renewalEventId) {
      return NextResponse.json(
        { error: "renewalEventId requis" },
        { status: 400 }
      );
    }

    // Si un message personnalisé est fourni, valider sa longueur
    if (message && message.length > 160) {
      return NextResponse.json(
        { error: "Le message ne doit pas dépasser 160 caractères" },
        { status: 400 }
      );
    }

    const result = await sendRenewalSms({
      renewalEventId,
      templateId,
      message,
      userId: session.user.id,
    });

    if (result.success) {
      return NextResponse.json({ success: true, apiId: result.apiId });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Erreur envoi SMS:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}

