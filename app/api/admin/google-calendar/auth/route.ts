import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/lib/types";
import { google } from "googleapis";

/**
 * Génère l'URL d'autorisation OAuth2 pour Google Calendar
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || 
    `${process.env.NEXTAUTH_URL || request.nextUrl.origin}/api/admin/google-calendar/callback`;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const scopes = [
    "https://www.googleapis.com/auth/calendar.readonly",
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent", // Force la demande de consentement pour obtenir le refresh_token
    state: session.user.id, // Utiliser l'ID utilisateur comme state pour sécurité
  });

  return NextResponse.json({ authUrl });
}

