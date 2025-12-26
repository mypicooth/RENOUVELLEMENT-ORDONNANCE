"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@/lib/types";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const isAdmin = session?.user.role === UserRole.ADMIN;

  const navLinks = [
    { href: "/", label: "Planning du jour" },
    { href: "/planning/semaine", label: "Planning semaine" },
    { href: "/patients", label: "Patients" },
    { href: "/patients/new", label: "Nouveau patient" },
    ...(isAdmin
      ? [
          { href: "/admin/dashboard", label: "Dashboard KPI" },
          { href: "/admin/templates-sms", label: "Templates SMS" },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  Pharmacie Saint-Laurent
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      pathname === link.href
                        ? "border-blue-500 text-gray-900"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {isAdmin && (
                <a
                  href="/api/admin/export-csv"
                  download
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Export CSV
                </a>
              )}
              <span className="text-sm text-gray-700">
                {session?.user.email}
                {isAdmin && (
                  <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                    Admin
                  </span>
                )}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

