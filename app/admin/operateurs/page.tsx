"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { UserRole } from "@/lib/types";

interface Operateur {
  id: string;
  prenom: string;
  actif: boolean;
  createdAt: string;
}

export default function OperateursPage() {
  const [operators, setOperators] = useState<Operateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [prenom, setPrenom] = useState("");

  const loadOperators = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/operateurs");
      if (res.ok) {
        const data = await res.json();
        setOperators(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOperators();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!prenom.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/operateurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prenom: prenom.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de la création");
        return;
      }
      setPrenom("");
      loadOperators();
    } catch (e) {
      setError("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute requiredRole={UserRole.SUPERADMIN}>
      <Layout>
        <div className="px-4 sm:px-6 lg:px-8 max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Opérateurs
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Liste des prénoms affichés au moment de l&apos;enregistrement d&apos;un nouveau patient. Tout le monde se connecte avec le même compte ; chaque employé choisit son prénom à ce moment-là.
          </p>

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Nouvel opérateur
            </h2>
            <form onSubmit={handleSubmit} className="flex gap-4 items-end">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 flex-1">
                  {error}
                </div>
              )}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom *
                </label>
                <input
                  type="text"
                  required
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ex. Marie"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
              >
                {submitting ? "Ajout…" : "Ajouter"}
              </button>
            </form>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 px-6 py-4 border-b border-gray-200">
              Prénoms existants
            </h2>
            {loading ? (
              <div className="px-6 py-8 text-center text-gray-500">
                Chargement…
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Prénom
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {operators.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-6 py-6 text-center text-gray-500">
                          Aucun opérateur. Ajoutez un prénom ci-dessus.
                        </td>
                      </tr>
                    ) : (
                      operators.map((op) => (
                        <tr key={op.id}>
                          <td className="px-6 py-3 text-sm font-medium text-gray-900">
                            {op.prenom}
                          </td>
                          <td className="px-6 py-3 text-sm">
                            {op.actif ? (
                              <span className="text-green-600">Actif</span>
                            ) : (
                              <span className="text-gray-400">Inactif</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
