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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && requiredRole) {
      if (session.user.role !== requiredRole && session.user.role !== UserRole.ADMIN) {
        router.push("/");
      }
    }
  }, [session, status, router, requiredRole]);

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

  if (requiredRole && session?.user.role !== requiredRole && session?.user.role !== UserRole.ADMIN) {
    return null;
  }

  return <>{children}</>;
}

