import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/lib/types";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

/**
 * Callback OAuth2 pour Google Calendar
 * Stocke les tokens dans la session ou en base de données
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.ADMIN) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(new URL("/admin/import?error=no_code", request.url));
  }

  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || 
    `${process.env.NEXTAUTH_URL || request.nextUrl.origin}/api/admin/google-calendar/callback`;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // Créer une réponse avec redirection
    const response = NextResponse.redirect(
      new URL("/admin/import?google_auth=success", request.url)
    );

    // Stocker les tokens dans des cookies sécurisés (HttpOnly, Secure en production)
    if (tokens.access_token) {
      response.cookies.set("google_access_token", tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60, // 1 heure
        path: "/",
      });
    }

    if (tokens.refresh_token) {
      response.cookies.set("google_refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 jours
        path: "/",
      });
    }
    
    return response;
  } catch (error: any) {
    console.error("Erreur OAuth callback:", error);
    return NextResponse.redirect(
      new URL(`/admin/import?error=${encodeURIComponent(error.message || "oauth_error")}`, request.url)
    );
  }
}

