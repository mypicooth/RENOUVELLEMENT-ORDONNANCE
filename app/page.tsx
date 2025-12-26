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

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="sm:flex sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Planning du jour
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex gap-2">
              <button
                onClick={() => router.push("/planning/semaine")}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Voir la semaine
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : renewals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun renouvellement prévu aujourd&apos;hui
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prénom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Téléphone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Consentement
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SMS envoyé
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {renewals.map((renewal) => (
                    <tr key={renewal.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        <button
                          onClick={() => router.push(`/patients/${renewal.prescriptionCycle.patient.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {renewal.prescriptionCycle.patient.nom}
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {renewal.prescriptionCycle.patient.prenom}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {renewal.prescriptionCycle.patient.telephone_normalise}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            STATUT_COLORS[renewal.statut]
                          }`}
                        >
                          {STATUT_LABELS[renewal.statut]}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
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
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
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
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {renewal.prescriptionCycle.patient.notes || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        <div className="space-y-2">
                          <div className="flex gap-2 flex-wrap">
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
