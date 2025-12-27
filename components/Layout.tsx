"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@/lib/types";
import { useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          { href: "/admin/import", label: "Import Google Calendar" },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo et titre */}
            <div className="flex items-center flex-shrink-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                Pharmacie Saint-Laurent
              </h1>
            </div>

            {/* Menu desktop */}
            <div className="hidden md:flex md:flex-1 md:justify-center md:ml-6">
              <div className="flex space-x-4 lg:space-x-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center px-2 sm:px-3 py-2 border-b-2 text-xs sm:text-sm font-medium whitespace-nowrap ${
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

            {/* Actions utilisateur desktop */}
            <div className="hidden md:flex md:items-center md:space-x-3 md:ml-4">
              {isAdmin && (
                <a
                  href="/api/admin/export-csv"
                  download
                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap"
                >
                  Export CSV
                </a>
              )}
              <div className="flex items-center space-x-2">
                <span className="text-xs sm:text-sm text-gray-700 truncate max-w-[120px] sm:max-w-none">
                  {session?.user.email}
                </span>
                {isAdmin && (
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded whitespace-nowrap">
                    Admin
                  </span>
                )}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 whitespace-nowrap"
              >
                Déconnexion
              </button>
            </div>

            {/* Bouton hamburger mobile */}
            <div className="md:hidden flex items-center space-x-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-expanded="false"
              >
                <span className="sr-only">Ouvrir le menu</span>
                {mobileMenuOpen ? (
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Menu mobile */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      pathname === link.href
                        ? "bg-blue-50 text-blue-700 border-l-4 border-blue-500"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="px-2 pt-4 pb-3 border-t border-gray-200 space-y-2">
                {isAdmin && (
                  <a
                    href="/api/admin/export-csv"
                    download
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-base font-medium text-blue-600 hover:bg-blue-50"
                  >
                    Export CSV
                  </a>
                )}
                <div className="px-3 py-2">
                  <div className="text-sm font-medium text-gray-900">
                    {session?.user.email}
                  </div>
                  {isAdmin && (
                    <span className="mt-1 inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      Admin
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut({ callbackUrl: "/login" });
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

