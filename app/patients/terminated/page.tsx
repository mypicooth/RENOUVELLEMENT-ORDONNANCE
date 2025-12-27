"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { UserRole } from "@/lib/types";

interface Patient {
  id: string;
  nom: string;
  prenom: string;
  telephone_normalise: string;
  date_recrutement: string;
  consentement: boolean;
  actif: boolean;
  cycles: Array<{
    id: string;
    date_premiere_delivrance: string;
    renewals: Array<{
      id: string;
      index: number;
      date_theorique: string;
      statut: string;
    }>;
  }>;
}

export default function TerminatedPatientsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const isAdmin = session?.user.role === UserRole.ADMIN;

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/patients/terminated");
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (error) {
      console.error("Erreur chargement patients terminés:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const toggleSelectPatient = (patientId: string) => {
    const newSelected = new Set(selectedPatients);
    if (newSelected.has(patientId)) {
      newSelected.delete(patientId);
    } else {
      newSelected.add(patientId);
    }
    setSelectedPatients(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedPatients.size === patients.length) {
      setSelectedPatients(new Set());
    } else {
      setSelectedPatients(new Set(patients.map((p) => p.id)));
    }
  };

  const handleBulkSendSms = async () => {
    const selected = Array.from(selectedPatients);
    const patientsWithConsent = patients.filter(
      (p) => selected.includes(p.id) && p.consentement
    );

    if (patientsWithConsent.length === 0) {
      alert("Aucun patient sélectionné avec consentement SMS");
      return;
    }

    if (!confirm(`Envoyer un SMS à ${patientsWithConsent.length} patient(s) ?`)) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const results: Array<{ success: boolean; patientName: string; error?: string }> = [];

      for (const patient of patientsWithConsent) {
        try {
          // Trouver le dernier renouvellement terminé pour envoyer un SMS de suivi
          const lastRenewal = patient.cycles
            ?.flatMap((cycle) => cycle.renewals || [])
            .filter((r) => r.statut === "TERMINE")
            .sort((a, b) => new Date(b.date_theorique).getTime() - new Date(a.date_theorique).getTime())[0];

          if (lastRenewal) {
            const smsRes = await fetch("/api/sms/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ renewalEventId: lastRenewal.id }),
            });

            const smsData = await smsRes.json();
            if (smsData.success) {
              results.push({
                success: true,
                patientName: `${patient.prenom} ${patient.nom}`,
              });
            } else {
              results.push({
                success: false,
                patientName: `${patient.prenom} ${patient.nom}`,
                error: smsData.error || "Erreur inconnue",
              });
            }
          } else {
            results.push({
              success: false,
              patientName: `${patient.prenom} ${patient.nom}`,
              error: "Aucun renouvellement trouvé",
            });
          }
        } catch (error) {
          results.push({
            success: false,
            patientName: `${patient.prenom} ${patient.nom}`,
            error: error instanceof Error ? error.message : "Erreur inconnue",
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.length - successCount;

      if (failCount > 0) {
        const failedPatients = results
          .filter((r) => !r.success)
          .map((r) => `- ${r.patientName}: ${r.error || "Erreur"}`)
          .join("\n");
        alert(`Résultats :\n${successCount} succès\n${failCount} échec(s)\n\nÉchecs :\n${failedPatients}`);
      } else {
        alert(`✅ ${successCount} SMS envoyé(s) avec succès`);
      }

      setSelectedPatients(new Set());
      loadPatients();
    } catch (error) {
      console.error("Erreur envoi SMS en bloc:", error);
      alert("Erreur lors de l'envoi des SMS");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!isAdmin) {
      alert("Seuls les administrateurs peuvent supprimer des patients");
      return;
    }

    const selected = Array.from(selectedPatients);
    const selectedPatientsData = patients.filter((p) => selected.includes(p.id));

    if (selectedPatientsData.length === 0) {
      alert("Aucun patient sélectionné");
      return;
    }

    const firstConfirm = confirm(
      `⚠️ ATTENTION : Vous êtes sur le point de supprimer définitivement ${selectedPatientsData.length} patient(s) dont tous les renouvellements sont terminés.\n\nCette action est IRRÉVERSIBLE.\n\nÊtes-vous absolument sûr ?`
    );

    if (!firstConfirm) {
      return;
    }

    const secondConfirm = prompt(
      `Pour confirmer la suppression de ${selectedPatientsData.length} patient(s), tapez "SUPPRIMER" en majuscules :`
    );

    if (secondConfirm !== "SUPPRIMER") {
      alert("Suppression annulée");
      return;
    }

    setBulkActionLoading(true);
    try {
      const results: Array<{ success: boolean; patientName: string; error?: string }> = [];

      for (const patient of selectedPatientsData) {
        try {
          const res = await fetch(`/api/admin/anonymize/${patient.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ anonymize: false }),
          });

          if (res.ok) {
            results.push({
              success: true,
              patientName: `${patient.prenom} ${patient.nom}`,
            });
          } else {
            const errorData = await res.json();
            results.push({
              success: false,
              patientName: `${patient.prenom} ${patient.nom}`,
              error: errorData.error || "Erreur inconnue",
            });
          }
        } catch (error) {
          results.push({
            success: false,
            patientName: `${patient.prenom} ${patient.nom}`,
            error: error instanceof Error ? error.message : "Erreur inconnue",
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.length - successCount;

      if (failCount > 0) {
        const failedPatients = results
          .filter((r) => !r.success)
          .map((r) => `- ${r.patientName}: ${r.error || "Erreur"}`)
          .join("\n");
        alert(
          `Résultats de la suppression :\n${successCount} succès\n${failCount} échec(s)\n\nÉchecs :\n${failedPatients}`
        );
      } else {
        alert(`✅ ${successCount} patient(s) supprimé(s) avec succès`);
      }

      setSelectedPatients(new Set());
      loadPatients();
    } catch (error) {
      console.error("Erreur suppression en masse:", error);
      alert("Erreur lors de la suppression");
    } finally {
      setBulkActionLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="sm:flex sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Patients avec renouvellements terminés
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Liste des patients dont tous les renouvellements sont terminés
              </p>
            </div>
          </div>

          {/* Barre d'actions en bloc */}
          {selectedPatients.size > 0 && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm font-medium text-blue-900">
                  {selectedPatients.size} patient(s) sélectionné(s)
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handleBulkSendSms}
                    disabled={bulkActionLoading}
                    className="px-4 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bulkActionLoading ? "Envoi..." : "📱 Envoyer SMS"}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkActionLoading}
                      className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {bulkActionLoading ? "Suppression..." : "🗑️ Supprimer"}
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedPatients(new Set())}
                    disabled={bulkActionLoading}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : patients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun patient avec renouvellements terminés
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-12">
                      <input
                        type="checkbox"
                        checked={selectedPatients.size === patients.length && patients.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Nom
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Prénom
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">
                      Téléphone
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap hidden md:table-cell">
                      Date recrutement
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Consentement
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Dernier renouvellement
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {patients.map((patient) => {
                    const lastRenewal = patient.cycles
                      ?.flatMap((cycle) => cycle.renewals || [])
                      .filter((r) => r.statut === "TERMINE")
                      .sort((a, b) => new Date(b.date_theorique).getTime() - new Date(a.date_theorique).getTime())[0];

                    return (
                      <tr
                        key={patient.id}
                        className={selectedPatients.has(patient.id) ? "bg-blue-50" : ""}
                      >
                        <td className="px-2 sm:px-4 py-3 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedPatients.has(patient.id)}
                            onChange={() => toggleSelectPatient(patient.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {patient.nom}
                        </td>
                        <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {patient.prenom}
                        </td>
                        <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                          {patient.telephone_normalise}
                        </td>
                        <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                          {format(new Date(patient.date_recrutement), "dd/MM/yyyy", {
                            locale: fr,
                          })}
                        </td>
                        <td className="px-2 sm:px-4 py-3 whitespace-nowrap">
                          {patient.consentement ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Oui
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Non
                            </span>
                          )}
                        </td>
                        <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {lastRenewal
                            ? format(new Date(lastRenewal.date_theorique), "dd/MM/yyyy", {
                                locale: fr,
                              })
                            : "-"}
                        </td>
                        <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => router.push(`/patients/${patient.id}`)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Voir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

