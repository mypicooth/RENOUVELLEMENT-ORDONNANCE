"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserRole } from "@/lib/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const hasAccess = requiredRole
    ? session?.user.role === requiredRole ||
      (requiredRole === UserRole.ADMIN && session?.user.role === UserRole.SUPERADMIN)
    : true;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && requiredRole && !hasAccess) {
      router.push("/");
    }
  }, [session, status, router, requiredRole, hasAccess]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (requiredRole && !hasAccess) {
    return null;
  }

  return <>{children}</>;
}

