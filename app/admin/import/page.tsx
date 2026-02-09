"use client";

import React, { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { UserRole } from "@/lib/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ImportResult {
  message: string;
  results: {
    success: number;
    errors: number;
    details: Array<{
      patient: string;
      status: string;
      error?: string;
      firstRenewalDate?: string;
      nbOccurrences?: number;
    }>;
  };
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Veuillez sélectionner un fichier");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/import-google-calendar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'import");
        return;
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'import");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRole={UserRole.ADMIN}>
      <Layout>
        <div className="px-4 sm:px-6 lg:px-8 max-w-3xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Import</h1>
            <p className="mt-2 text-sm text-gray-600">
              Importez vos renouvellements depuis un fichier .ics (iCalendar) ou .csv
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="file"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Fichier (.ics ou .csv)
                </label>
                <input
                  id="file"
                  type="file"
                  accept=".ics,.csv"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Formats acceptés : .ics (iCalendar) ou .csv
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !file}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Import en cours..." : "Importer"}
              </button>
            </form>

            {result && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4 no-print">
                  <div
                    className={`p-4 rounded-md ${
                      result.results.errors === 0
                        ? "bg-green-50 border border-green-200 text-green-800"
                        : "bg-yellow-50 border border-yellow-200 text-yellow-800"
                    }`}
                  >
                    <p className="font-semibold">{result.message}</p>
                    <p className="text-sm mt-1">
                      {result.results.success} importés | {result.results.errors} erreurs
                    </p>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    🖨️ Imprimer
                  </button>
                </div>
                <div className="print-only mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Résultats de l&apos;import</h2>
                  <p className="text-sm text-gray-700">
                    {result.message} - {new Date().toLocaleDateString("fr-FR")}
                  </p>
                </div>

                {result.results.details.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                            Patient
                          </th>
                          <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                            Statut
                          </th>
                          <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap hidden sm:table-cell">
                            Date R0
                          </th>
                          <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap hidden md:table-cell">
                            Occurrences
                          </th>
                          <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                            Erreur
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {result.results.details.map((detail, index) => (
                          <tr key={index}>
                            <td className="px-2 sm:px-3 py-2 text-gray-900">
                              {detail.patient}
                            </td>
                            <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                              {detail.status === "Importé" ? (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  {detail.status}
                                </span>
                              ) : detail.status === "Ignoré" ? (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                  {detail.status}
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                  {detail.status}
                                </span>
                              )}
                            </td>
                            <td className="px-2 sm:px-3 py-2 text-gray-600 text-xs hidden sm:table-cell">
                              {detail.firstRenewalDate
                                ? format(new Date(detail.firstRenewalDate), "dd/MM/yyyy", { locale: fr })
                                : "-"}
                            </td>
                            <td className="px-2 sm:px-3 py-2 text-gray-600 text-xs hidden md:table-cell">
                              {detail.nbOccurrences !== undefined ? detail.nbOccurrences : "-"}
                            </td>
                            <td className="px-2 sm:px-3 py-2 text-gray-600 text-xs">
                              {detail.error || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
