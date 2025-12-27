"use client";

import { useEffect, useState, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { RenewalEventStatus } from "@/lib/types";
import { format, startOfWeek, addDays, eachDayOfInterval, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";

interface RenewalEvent {
  id: string;
  index: number;
  date_theorique: string;
  statut: RenewalEventStatus;
  date_sms?: string | null;
  prescriptionCycle: {
    patient: {
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

export default function PlanningSemainePage() {
  const [renewals, setRenewals] = useState<RenewalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
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

  const loadWeekRenewals = useCallback(async () => {
    setLoading(true);
    try {
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);

      // Charger tous les renouvellements de la semaine
      const promises = eachDayOfInterval({ start: weekStart, end: weekEnd }).map(
        (day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          return fetch(`/api/renewals?date=${dateStr}`).then((res) => res.json());
        }
      );

      const results = await Promise.all(promises);
      const allRenewals = results.flat();
      setRenewals(allRenewals);
    } catch (error) {
      console.error("Erreur chargement planning:", error);
    } finally {
      setLoading(false);
    }
  }, [currentWeek]);

  useEffect(() => {
    loadWeekRenewals();
    loadSmsTemplates();
  }, [loadWeekRenewals, loadSmsTemplates]);

  const updateStatut = async (id: string, newStatut: RenewalEventStatus) => {
    try {
      const res = await fetch("/api/renewals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, statut: newStatut }),
      });
      if (res.ok) {
        loadWeekRenewals();
      }
    } catch (error) {
      console.error("Erreur mise à jour statut:", error);
      alert("Erreur lors de la mise à jour du statut");
    }
  };

  const sendSms = async (renewalId: string, templateId?: string) => {
    // Trouver le renouvellement pour vérifier le consentement
    const renewal = renewals.find((r) => r.id === renewalId);
    if (renewal && !renewal.prescriptionCycle?.patient?.consentement) {
      alert("Le patient n'a pas donné son consentement pour l'envoi de SMS");
      return;
    }

    const finalTemplateId = templateId || selectedTemplates[renewalId];
    
    // Vérifier si c'est une date future
    const renewalDate = renewal ? new Date(renewal.date_theorique) : null;
    const isFutureDate = renewalDate && renewalDate > new Date();
    const confirmMessage = isFutureDate 
      ? `Envoyer un SMS en avance pour le ${format(renewalDate!, "dd/MM/yyyy", { locale: fr })} ?`
      : "Envoyer un SMS au patient ?";
    
    if (!confirm(confirmMessage)) return;

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
        loadWeekRenewals();
      } else {
        alert(`Erreur: ${data.error}`);
      }
    } catch (error) {
      console.error("Erreur envoi SMS:", error);
      alert("Erreur lors de l'envoi du SMS");
    }
  };

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  });

  const renewalsByDay = weekDays.reduce((acc, day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    acc[dayStr] = renewals.filter((r) => {
      const renewalDate = format(new Date(r.date_theorique), "yyyy-MM-dd");
      return renewalDate === dayStr;
    });
    return acc;
  }, {} as Record<string, RenewalEvent[]>);

  const handlePrint = () => {
    window.print();
  };

  // Vérifier si la semaine contient des dates futures
  const hasFutureDates = weekDays.some(day => day > new Date());

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-4 sm:px-6 lg:px-8">
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
                Planning de la semaine
              </h2>
              <p className="text-sm text-gray-600">
                {format(weekStart, "d MMMM", { locale: fr })} -{" "}
                {format(addDays(weekStart, 6), "d MMMM yyyy", { locale: fr })}
              </p>
            </div>
          </div>

          <div className="sm:flex sm:items-center sm:justify-between mb-6 no-print">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Planning semaine
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-sm text-gray-500">
                  {format(weekStart, "d MMMM", { locale: fr })} -{" "}
                  {format(addDays(weekStart, 6), "d MMMM yyyy", { locale: fr })}
                </p>
                {hasFutureDates && (
                  <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded" title="Cette semaine contient des dates futures. Vous pouvez préparer et envoyer les SMS en avance.">
                    ⏩ Dates futures disponibles
                  </span>
                )}
              </div>
            </div>
            <div className="mt-4 sm:mt-0 flex gap-2">
              <button
                onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 no-print"
              >
                Semaine précédente
              </button>
              <button
                onClick={() => setCurrentWeek(new Date())}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 no-print"
              >
                Aujourd&apos;hui
              </button>
              <button
                onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 no-print"
              >
                Semaine suivante
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 no-print"
              >
                🖨️ Imprimer
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
              {weekDays.map((day) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const dayRenewals = renewalsByDay[dayStr] || [];
                const isToday = isSameDay(day, new Date());
                const isFuture = day > new Date();

                return (
                  <div
                    key={dayStr}
                    className={`bg-white shadow rounded-lg p-4 ${
                      isToday ? "ring-2 ring-blue-500" : ""
                    } ${isFuture ? "border-l-4 border-l-blue-400" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`text-sm font-semibold ${
                          isToday ? "text-blue-600" : "text-gray-900"
                        }`}
                      >
                        {format(day, "EEEE d", { locale: fr })}
                      </div>
                      {isFuture && (
                        <span className="text-xs text-blue-600" title="Date future">⏩</span>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-2">
                      {dayRenewals.length}
                    </div>
                    <button
                      onClick={() => setSelectedDate(day)}
                      className="text-xs text-blue-600 hover:text-blue-800 no-print"
                    >
                      Voir détails
                    </button>
                    {selectedDate && isSameDay(selectedDate, day) && (
                      <div className="mt-2 space-y-1 text-xs">
                        {dayRenewals.slice(0, 3).map((r) => (
                          <div key={r.id} className="text-gray-600">
                            {r.prescriptionCycle.patient.prenom}{" "}
                            {r.prescriptionCycle.patient.nom}
                          </div>
                        ))}
                        {dayRenewals.length > 3 && (
                          <div className="text-gray-600">
                            +{dayRenewals.length - 3} autres
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {selectedDate && (
            <div className="mt-6 bg-white shadow rounded-lg p-6 print-page">
              <div className="flex items-center justify-between mb-4 no-print">
                <h2 className="text-lg font-semibold">
                  {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
                </h2>
                {selectedDate > new Date() && (
                  <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded" title="Vous pouvez préparer et envoyer les SMS en avance pour cette date">
                    ⏩ Date future
                  </span>
                )}
              </div>
              {/* En-tête pour l'impression du tableau de détails */}
              <div className="hidden print:block print:mb-4 print:border-b print:border-gray-300 print:pb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Détails - {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
                </h2>
              </div>
              <div className="overflow-x-auto">
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider no-print">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {renewalsByDay[format(selectedDate, "yyyy-MM-dd")]?.map(
                      (renewal) => {
                        const renewalDate = new Date(renewal.date_theorique);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        renewalDate.setHours(0, 0, 0, 0);
                        const isFutureDate = renewalDate > today;

                        return (
                          <tr key={renewal.id}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              <div className="flex items-center gap-2">
                                {renewal.prescriptionCycle.patient.nom}
                                {isFutureDate && (
                                  <span className="px-1.5 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded" title={`Date future: ${format(renewalDate, "dd/MM/yyyy", { locale: fr })}`}>
                                    ⏩
                                  </span>
                                )}
                              </div>
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
                            <td className="px-4 py-3 text-sm font-medium no-print">
                              <div className="space-y-2">
                                {/* Actions de statut */}
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

                                {/* Sélecteur template SMS et bouton d'envoi */}
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
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
