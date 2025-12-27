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
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [smsTemplates, setSmsTemplates] = useState<Array<{ id: string; code: string; libelle: string; message: string }>>([]);
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
    loadSmsTemplates();
  }, [loadPatients]);

  const loadSmsTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/templates-sms");
      if (res.ok) {
        const data = await res.json();
        setSmsTemplates(data);
      }
    } catch (error) {
      console.error("Erreur chargement templates SMS:", error);
    }
  }, []);

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

  const handleBulkAction = async () => {
    if (!selectedAction) {
      alert("Veuillez sélectionner une action");
      return;
    }

    const selected = Array.from(selectedPatients);
    if (selected.length === 0) {
      alert("Aucun patient sélectionné");
      return;
    }

    // Vérifications spécifiques par action
    if (selectedAction === "SMS") {
      if (!selectedTemplateId) {
        alert("Veuillez sélectionner un template SMS");
        return;
      }
      if (!confirm(`Envoyer un SMS à ${selected.length} patient(s) ?`)) {
        return;
      }
    } else if (selectedAction === "SUPPRIMER_CYCLE") {
      if (!isAdmin) {
        alert("Seuls les administrateurs peuvent supprimer des cycles");
        return;
      }
      if (!confirm(`⚠️ Supprimer les cycles de ${selected.length} patient(s) ?\n\nCette action est IRRÉVERSIBLE.`)) {
        return;
      }
    } else if (selectedAction === "SUPPRIMER_PATIENT") {
      if (!isAdmin) {
        alert("Seuls les administrateurs peuvent supprimer des patients");
        return;
      }
      const confirmText = prompt(
        `⚠️ ATTENTION : Vous êtes sur le point de supprimer définitivement ${selected.length} patient(s).\n\nCette action est IRRÉVERSIBLE.\n\nPour confirmer, tapez "SUPPRIMER" en majuscules :`
      );
      if (confirmText !== "SUPPRIMER") {
        return;
      }
    } else if (selectedAction === "NE_PAS_RENOUVELLER") {
      if (!confirm(`Ne plus renouveler pour ${selected.length} patient(s) ?\n\nLes cycles actifs seront annulés.`)) {
        return;
      }
    }

    setBulkActionLoading(true);
    try {
      const res = await fetch("/api/patients/bulk-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: selectedAction,
          patientIds: selected,
          templateId: selectedAction === "SMS" ? selectedTemplateId : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Erreur lors de l'action de masse");
        return;
      }

      const { summary, results } = data;
      const failedResults = results.filter((r: any) => !r.success);

      if (failedResults.length > 0) {
        const failedPatients = failedResults
          .map((r: any) => `- ${r.patientName}: ${r.error || "Erreur"}`)
          .join("\n");
        alert(
          `Résultats :\n${summary.success} succès\n${summary.failed} échec(s)\n\nÉchecs :\n${failedPatients}`
        );
      } else {
        alert(`✅ ${summary.success} action(s) effectuée(s) avec succès`);
      }

      setSelectedPatients(new Set());
      setSelectedAction("");
      setSelectedTemplateId("");
      loadPatients();
    } catch (error) {
      console.error("Erreur action de masse:", error);
      alert("Erreur lors de l'action de masse");
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
              <div className="flex flex-col gap-4">
                <div className="text-sm font-medium text-blue-900">
                  {selectedPatients.size} patient(s) sélectionné(s)
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Action
                    </label>
                    <select
                      value={selectedAction}
                      onChange={(e) => {
                        setSelectedAction(e.target.value);
                        setSelectedTemplateId(""); // Reset template quand on change d'action
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={bulkActionLoading}
                    >
                      <option value="">-- Choisir une action --</option>
                      <option value="SMS">📱 Envoyer SMS</option>
                      <option value="NE_PAS_RENOUVELLER">🚫 Ne pas renouveler</option>
                      {isAdmin && (
                        <>
                          <option value="SUPPRIMER_CYCLE">🗑️ Supprimer cycle</option>
                          <option value="SUPPRIMER_PATIENT">🗑️ Supprimer patient</option>
                        </>
                      )}
                    </select>
                  </div>
                  {selectedAction === "SMS" && (
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Template SMS
                      </label>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        disabled={bulkActionLoading}
                      >
                        <option value="">-- Choisir un template --</option>
                        {smsTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.libelle} ({template.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <button
                      onClick={handleBulkAction}
                      disabled={bulkActionLoading || !selectedAction || (selectedAction === "SMS" && !selectedTemplateId)}
                      className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {bulkActionLoading ? "Traitement..." : "Exécuter"}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPatients(new Set());
                        setSelectedAction("");
                        setSelectedTemplateId("");
                      }}
                      disabled={bulkActionLoading}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Annuler
                    </button>
                  </div>
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

