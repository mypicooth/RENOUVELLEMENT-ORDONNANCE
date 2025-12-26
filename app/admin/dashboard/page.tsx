"use client";

import { useEffect, useState, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { UserRole } from "@/lib/types";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from "date-fns";
import { fr } from "date-fns/locale";

interface KpiData {
  today: {
    total: number;
    aPreparer: number;
    enPreparation: number;
    pret: number;
    smsEnvoye: number;
    termine: number;
  };
  week: {
    total: number;
    smsEnvoyes: number;
    termines: number;
  };
  month: {
    total: number;
    nouveauxPatients: number;
    nouveauxCycles: number;
    smsEnvoyes: number;
  };
  patients: {
    total: number;
    avecConsentement: number;
    sansConsentement: number;
  };
  cycles: {
    actifs: number;
    termines: number;
    annules: number;
  };
}

export default function AdminDashboardPage() {
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");

  const loadKpiData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/kpi?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setKpiData(data);
      }
    } catch (error) {
      console.error("Erreur chargement KPI:", error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadKpiData();
  }, [loadKpiData]);

  if (loading || !kpiData) {
    return (
      <ProtectedRoute requiredRole={UserRole.ADMIN}>
        <Layout>
          <div className="text-center py-8">Chargement des KPI...</div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole={UserRole.ADMIN}>
      <Layout>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Pharmacien Titulaire</h1>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setPeriod("today")}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  period === "today"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Aujourd&apos;hui
              </button>
              <button
                onClick={() => setPeriod("week")}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  period === "week"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Semaine
              </button>
              <button
                onClick={() => setPeriod("month")}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  period === "month"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Mois
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Renouvellements aujourd'hui */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Renouvellements {period === "today" ? "aujourd'hui" : period === "week" ? "cette semaine" : "ce mois"}</h3>
              <p className="text-3xl font-bold text-gray-900">
                {period === "today" ? kpiData.today.total : period === "week" ? kpiData.week.total : kpiData.month.total}
              </p>
            </div>

            {/* SMS envoyés */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">SMS envoyés</h3>
              <p className="text-3xl font-bold text-purple-600">
                {period === "today" ? kpiData.today.smsEnvoye : period === "week" ? kpiData.week.smsEnvoyes : kpiData.month.smsEnvoyes}
              </p>
            </div>

            {/* Terminés */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Terminés</h3>
              <p className="text-3xl font-bold text-green-600">
                {period === "today" ? kpiData.today.termine : period === "week" ? kpiData.week.termines : 0}
              </p>
            </div>

            {/* Nouveaux patients */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                {period === "month" ? "Nouveaux patients" : "Total patients"}
              </h3>
              <p className="text-3xl font-bold text-blue-600">
                {period === "month" ? kpiData.month.nouveauxPatients : kpiData.patients.total}
              </p>
            </div>
          </div>

          {/* Détails aujourd'hui */}
          {period === "today" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-yellow-50 rounded-lg shadow p-6 border-l-4 border-yellow-400">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">À préparer</h3>
                <p className="text-2xl font-bold text-yellow-900">{kpiData.today.aPreparer}</p>
              </div>
              <div className="bg-blue-50 rounded-lg shadow p-6 border-l-4 border-blue-400">
                <h3 className="text-sm font-medium text-blue-800 mb-2">En préparation</h3>
                <p className="text-2xl font-bold text-blue-900">{kpiData.today.enPreparation}</p>
              </div>
              <div className="bg-green-50 rounded-lg shadow p-6 border-l-4 border-green-400">
                <h3 className="text-sm font-medium text-green-800 mb-2">Prêts</h3>
                <p className="text-2xl font-bold text-green-900">{kpiData.today.pret}</p>
              </div>
            </div>
          )}

          {/* Statistiques patients */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistiques Patients</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500">Total patients</p>
                <p className="text-2xl font-bold text-gray-900">{kpiData.patients.total}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Avec consentement SMS</p>
                <p className="text-2xl font-bold text-green-600">{kpiData.patients.avecConsentement}</p>
                <p className="text-xs text-gray-600">
                  {kpiData.patients.total > 0
                    ? Math.round((kpiData.patients.avecConsentement / kpiData.patients.total) * 100)
                    : 0}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Sans consentement</p>
                <p className="text-2xl font-bold text-red-600">{kpiData.patients.sansConsentement}</p>
              </div>
            </div>
          </div>

          {/* Statistiques cycles */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistiques Cycles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500">Cycles actifs</p>
                <p className="text-2xl font-bold text-blue-600">{kpiData.cycles.actifs}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Cycles terminés</p>
                <p className="text-2xl font-bold text-gray-600">{kpiData.cycles.termines}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Cycles annulés</p>
                <p className="text-2xl font-bold text-red-600">{kpiData.cycles.annules}</p>
              </div>
            </div>
          </div>

          {/* Statistiques mensuelles */}
          {period === "month" && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ce mois</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Nouveaux cycles</p>
                  <p className="text-2xl font-bold text-blue-600">{kpiData.month.nouveauxCycles}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">SMS envoyés</p>
                  <p className="text-2xl font-bold text-purple-600">{kpiData.month.smsEnvoyes}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total renouvellements</p>
                  <p className="text-2xl font-bold text-gray-900">{kpiData.month.total}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

