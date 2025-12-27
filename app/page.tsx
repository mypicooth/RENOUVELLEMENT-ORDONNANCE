"use client";

import { useEffect, useState, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { RenewalEventStatus } from "@/lib/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "next/navigation";

interface RenewalEvent {
  id: string;
  index: number;
  date_theorique: string;
  statut: RenewalEventStatus;
  date_sms?: string | null;
  prescriptionCycle: {
    patient: {
      id: string;
      nom: string;
      prenom: string;
      telephone_normalise: string;
      notes?: string;
      consentement?: boolean;
    };
  };
}

const STATUT_LABELS: Record<RenewalEventStatus, string> = {
  A_PREPARER: "À préparer",
  EN_PREPARATION: "En préparation",
  PRET: "Prêt",
  SMS_ENVOYE: "SMS envoyé",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

const STATUT_COLORS: Record<RenewalEventStatus, string> = {
  A_PREPARER: "bg-yellow-100 text-yellow-800",
  EN_PREPARATION: "bg-blue-100 text-blue-800",
  PRET: "bg-green-100 text-green-800",
  SMS_ENVOYE: "bg-purple-100 text-purple-800",
  TERMINE: "bg-gray-100 text-gray-800",
  ANNULE: "bg-red-100 text-red-800",
};

interface SmsTemplate {
  id: string;
  code: string;
  libelle: string;
  message: string;
}

export default function HomePage() {
  const router = useRouter();
  const [renewals, setRenewals] = useState<RenewalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, string>>({});
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [selectedRenewals, setSelectedRenewals] = useState<Set<string>>(new Set());
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

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

  const loadTodayRenewals = useCallback(async () => {
    setLoading(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const res = await fetch(`/api/renewals?date=${today}`);
      if (res.ok) {
        const data = await res.json();
        setRenewals(data);
      }
    } catch (error) {
      console.error("Erreur chargement planning:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodayRenewals();
    loadSmsTemplates();
  }, [loadTodayRenewals, loadSmsTemplates]);

  const updateStatut = async (id: string, newStatut: RenewalEventStatus) => {
    try {
      const res = await fetch("/api/renewals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, statut: newStatut }),
      });
      if (res.ok) {
        loadTodayRenewals();
      }
    } catch (error) {
      console.error("Erreur mise à jour statut:", error);
      alert("Erreur lors de la mise à jour du statut");
    }
  };

  const sendSms = async (renewalId: string, templateId?: string) => {
    const renewal = renewals.find((r) => r.id === renewalId);
    if (renewal && !renewal.prescriptionCycle?.patient?.consentement) {
      alert("Le patient n&apos;a pas donné son consentement pour l&apos;envoi de SMS");
      return;
    }

    const finalTemplateId = templateId || selectedTemplates[renewalId];
    
    if (!confirm("Envoyer un SMS au patient ?")) return;

    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          renewalEventId: renewalId,
          templateId: finalTemplateId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("SMS envoyé avec succès");
        loadTodayRenewals();
      } else {
        alert(`Erreur: ${data.error}`);
      }
    } catch (error) {
      console.error("Erreur envoi SMS:", error);
      alert("Erreur lors de l&apos;envoi du SMS");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBulkAction = async () => {
    if (!selectedAction) {
      alert("Veuillez sélectionner une action");
      return;
    }

    const selected = Array.from(selectedRenewals);
    if (selected.length === 0) {
      alert("Aucun renouvellement sélectionné");
      return;
    }

    // Extraire les patientIds uniques depuis les renouvellements sélectionnés
    const selectedRenewalObjects = renewals.filter((r) => selected.includes(r.id));
    const patientIds = Array.from(new Set(selectedRenewalObjects.map((r) => r.prescriptionCycle.patient.id)));

    if (selectedAction === "SMS") {
      if (!selectedTemplateId) {
        alert("Veuillez sélectionner un template SMS");
        return;
      }
      if (!confirm(`Envoyer un SMS à ${patientIds.length} patient(s) ?`)) {
        return;
      }
    } else if (selectedAction === "NE_PAS_RENOUVELLER") {
      if (!confirm(`Ne plus renouveler pour ${patientIds.length} patient(s) ?\n\nLes cycles actifs seront annulés.`)) {
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
          patientIds: patientIds,
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

      setSelectedRenewals(new Set());
      setSelectedAction("");
      setSelectedTemplateId("");
      loadTodayRenewals();
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
        <div>
          {/* En-tête d'impression */}
          <div className="hidden print:block print:mb-4 print:border-b print:border-gray-300 print:pb-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Pharmacie Saint Laurent
              </h1>
              <p className="text-sm text-gray-600 mb-1">
                73 rue Romain Rolland, 97419 La Possession
              </p>
              <h2 className="text-xl font-semibold text-gray-900 mt-2">
                Planning du jour
              </h2>
              <p className="text-sm text-gray-600">
                {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 no-print">
                Planning du jour
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500 no-print">
                {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 no-print"
              >
                🖨️ Imprimer
              </button>
              <button
                onClick={() => router.push("/planning/semaine")}
                className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 no-print"
              >
                Voir la semaine
              </button>
            </div>
          </div>

          {/* Barre d'actions en bloc */}
          {selectedRenewals.size > 0 && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 no-print">
              <div className="flex flex-col gap-4">
                <div className="text-sm font-medium text-blue-900">
                  {selectedRenewals.size} renouvellement(s) sélectionné(s)
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
                        setSelectedTemplateId("");
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={bulkActionLoading}
                    >
                      <option value="">-- Choisir une action --</option>
                      <option value="SMS">📱 Envoyer SMS</option>
                      <option value="NE_PAS_RENOUVELLER">🚫 Ne pas renouveler</option>
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
                        setSelectedRenewals(new Set());
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
          ) : renewals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun renouvellement prévu aujourd&apos;hui
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-12">
                      <input
                        type="checkbox"
                        checked={selectedRenewals.size === renewals.length && renewals.length > 0}
                        onChange={() => {
                          if (selectedRenewals.size === renewals.length) {
                            setSelectedRenewals(new Set());
                          } else {
                            setSelectedRenewals(new Set(renewals.map((r) => r.id)));
                          }
                        }}
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
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Statut
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap hidden md:table-cell">
                      Consentement
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">
                      SMS envoyé
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap hidden xl:table-cell">
                      Notes
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {renewals.map((renewal) => (
                    <tr key={renewal.id} className={selectedRenewals.has(renewal.id) ? "bg-blue-50" : ""}>
                      <td className="px-2 sm:px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedRenewals.has(renewal.id)}
                          onChange={() => {
                            const newSelected = new Set(selectedRenewals);
                            if (newSelected.has(renewal.id)) {
                              newSelected.delete(renewal.id);
                            } else {
                              newSelected.add(renewal.id);
                            }
                            setSelectedRenewals(newSelected);
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        <button
                          onClick={() => router.push(`/patients/${renewal.prescriptionCycle.patient.id}`)}
                          className="text-blue-600 hover:text-blue-900 no-print font-semibold hover:underline"
                          title="Voir la fiche patient"
                        >
                          {renewal.prescriptionCycle.patient.nom}
                        </button>
                        <span className="print-only">{renewal.prescriptionCycle.patient.nom}</span>
                      </td>
                      <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => router.push(`/patients/${renewal.prescriptionCycle.patient.id}`)}
                          className="text-blue-600 hover:text-blue-900 no-print hover:underline"
                          title="Voir la fiche patient"
                        >
                          {renewal.prescriptionCycle.patient.prenom}
                        </button>
                        <span className="print-only">{renewal.prescriptionCycle.patient.prenom}</span>
                      </td>
                      <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                        {renewal.prescriptionCycle.patient.telephone_normalise}
                      </td>
                      <td className="px-2 sm:px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            STATUT_COLORS[renewal.statut]
                          }`}
                        >
                          {STATUT_LABELS[renewal.statut]}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-3 whitespace-nowrap hidden md:table-cell">
                        {renewal.prescriptionCycle?.patient?.consentement ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            ✓ Oui
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            ✗ Non
                          </span>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                        {renewal.date_sms ? (
                          <div>
                            <div className="font-medium">
                              {format(new Date(renewal.date_sms), "dd/MM/yyyy", { locale: fr })}
                            </div>
                            <div className="text-xs text-gray-600">
                              {format(new Date(renewal.date_sms), "HH:mm", { locale: fr })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-sm text-gray-500 hidden xl:table-cell">
                        {renewal.prescriptionCycle.patient.notes || "-"}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-sm font-medium">
                        <div className="space-y-2 no-print">
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => router.push(`/patients/${renewal.prescriptionCycle.patient.id}`)}
                              className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded hover:bg-indigo-200"
                              title="Voir la fiche patient"
                            >
                              👤 Fiche
                            </button>
                            {renewal.statut === "A_PREPARER" && (
                              <button
                                onClick={() =>
                                  updateStatut(renewal.id, "EN_PREPARATION")
                                }
                                className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
                              >
                                Préparer
                              </button>
                            )}
                            {renewal.statut === "EN_PREPARATION" && (
                              <button
                                onClick={() => updateStatut(renewal.id, "PRET")}
                                className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200"
                              >
                                Marquer Prêt
                              </button>
                            )}
                            {["PRET", "SMS_ENVOYE"].includes(renewal.statut) && (
                              <button
                                onClick={() => updateStatut(renewal.id, "TERMINE")}
                                className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                              >
                                Terminer
                              </button>
                            )}
                          </div>

                          {renewal.prescriptionCycle?.patient?.consentement && (
                            <div className="flex gap-2 items-center">
                              <select
                                value={selectedTemplates[renewal.id] || ""}
                                onChange={(e) =>
                                  setSelectedTemplates({
                                    ...selectedTemplates,
                                    [renewal.id]: e.target.value,
                                  })
                                }
                                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Template par défaut</option>
                                {smsTemplates.map((template) => (
                                  <option key={template.id} value={template.id}>
                                    {template.libelle}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => sendSms(renewal.id)}
                                className="px-3 py-1 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-700"
                                title="Envoyer SMS"
                              >
                                📱
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="print-only text-xs text-gray-600">
                          {STATUT_LABELS[renewal.statut]}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
