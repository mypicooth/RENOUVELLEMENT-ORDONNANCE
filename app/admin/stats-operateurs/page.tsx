"use client";

import { useEffect, useState, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { UserRole } from "@/lib/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface OperatorStat {
  userId: string;
  name: string;
  email: string;
  count: number;
}

interface StatsResponse {
  month: string;
  start: string;
  end: string;
  stats: OperatorStat[];
}

const OBJECTIF_PRIME_KEY = "stats-operateurs-objectif-prime";

export default function StatsOperateursPage() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return format(now, "yyyy-MM");
  });
  const [objectifPrime, setObjectifPrime] = useState(() => {
    if (typeof window === "undefined") return 50;
    return Number(localStorage.getItem(OBJECTIF_PRIME_KEY)) || 50;
  });

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stats-operateurs?month=${month}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setData(null);
      }
    } catch (error) {
      console.error("Erreur chargement stats:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleObjectifChange = (value: number) => {
    setObjectifPrime(value);
    if (typeof window !== "undefined") {
      localStorage.setItem(OBJECTIF_PRIME_KEY, String(value));
    }
  };

  const monthDisplay = data?.month
    ? format(new Date(data.month + "-01"), "MMMM yyyy", { locale: fr })
    : month;

  return (
    <ProtectedRoute requiredRole={UserRole.SUPERADMIN}>
      <Layout>
        <div className="px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Stats par opérateur
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Créations de renouvellement (ordonnances) par opérateur par mois — pour suivi des primes.
            Uniquement les créations (nouveau patient ou nouvelle ordonnance), pas les scans.
          </p>

          <div className="flex flex-wrap items-center gap-4 mb-6">
            <a
              href="/api/admin/stats-operateurs/export"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              download
            >
              📥 Extract global (patients par opérateur, CSV)
            </a>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mois
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="block border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Objectif créations (prime)
              </label>
              <input
                type="number"
                min={1}
                value={objectifPrime}
                onChange={(e) => handleObjectifChange(Number(e.target.value) || 50)}
                className="block w-28 border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {loading && (
            <div className="text-center py-8 text-gray-500">
              Chargement…
            </div>
          )}

          {!loading && data && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">
                  {monthDisplay.charAt(0).toUpperCase() + monthDisplay.slice(1)}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Créations d’ordonnances (nouveau patient ou nouvelle ordonnance) — opérateur sélectionné à la création.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Opérateur
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Créations
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Prime
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.stats.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                          Aucune création pour ce mois (ou opérateur non renseigné).
                        </td>
                      </tr>
                    ) : (
                      data.stats.map((row) => {
                        const atteint = row.count >= objectifPrime;
                        return (
                          <tr key={row.userId || row.name} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className="font-medium text-gray-900">{row.name}</span>
                              {row.email && (
                                <span className="block text-xs text-gray-500">{row.email}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {row.count}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {atteint ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Objectif atteint
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">
                                  {objectifPrime - row.count} restant(s)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && !data && (
            <div className="text-center py-8 text-gray-500">
              Impossible de charger les statistiques.
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
