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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 bg-white border-r border-gray-200">
          {/* Logo */}
          <div className="flex items-center h-16 px-4 border-b border-gray-200">
            <h1 className="text-lg font-bold text-gray-900">
              Pharmacie Saint-Laurent
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  pathname === link.href
                    ? "bg-blue-50 text-blue-700 border-l-4 border-blue-500"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 p-4 space-y-3">
            {isAdmin && (
              <a
                href="/api/admin/export-csv"
                download
                className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md"
              >
                Export CSV
              </a>
            )}
            <div className="px-3 py-2">
              <div className="text-sm font-medium text-gray-900 truncate">
                {session?.user.email}
              </div>
              {isAdmin && (
                <span className="mt-1 inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                  Admin
                </span>
              )}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-16 px-4">
          <h1 className="text-lg font-bold text-gray-900">
            Pharmacie Saint-Laurent
          </h1>
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

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white shadow-xl">
              <div className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2 text-base font-medium rounded-md ${
                      pathname === link.href
                        ? "bg-blue-50 text-blue-700 border-l-4 border-blue-500"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="border-t border-gray-200 p-4 space-y-2">
                {isAdmin && (
                  <a
                    href="/api/admin/export-csv"
                    download
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center px-3 py-2 text-base font-medium text-blue-600 hover:bg-blue-50 rounded-md"
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
                  className="w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-md"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:ml-0">
        <main className="flex-1 py-4 sm:py-6 px-4 sm:px-6 lg:px-8 md:mt-0 mt-16">
          {children}
        </main>
      </div>

