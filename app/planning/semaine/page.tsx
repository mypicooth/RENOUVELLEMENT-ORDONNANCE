"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { RenewalEventStatus } from "@/lib/types";
import { format, startOfWeek, addDays, eachDayOfInterval, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { PDFDocument, rgb } from "pdf-lib";

interface RenewalEvent {
  id: string;
  index: number;
  date_theorique: string;
  statut: RenewalEventStatus;
  date_sms?: string | null;
  date_delivrance?: string | null;
  prescriptionCycle: {
    nb_renouvellements: number;
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

export default function PlanningSemainePage() {
  const router = useRouter();
  const [renewals, setRenewals] = useState<RenewalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, string>>({});
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);

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

  const generateQRCodePDFForRenewal = async (renewal: RenewalEvent) => {
    try {
      setGeneratingPDF(renewal.id);
      
      const pdfDoc = await PDFDocument.create();
      const widthMM = 55;
      const heightMM = 25;
      const widthPt = widthMM * 2.83465;
      const heightPt = heightMM * 2.83465;
      
      const QRCodeLib = await import("qrcode");
      const helveticaBold = await pdfDoc.embedFont("Helvetica-Bold");
      
      const page = pdfDoc.addPage([widthPt, heightPt]);
      const isLastRenewal = renewal.index === renewal.prescriptionCycle.nb_renouvellements;
      
      const qrCodeData = JSON.stringify({
        renewalId: renewal.id,
        type: isLastRenewal ? "RENEWAL_END" : "RENEWAL",
      });
      
      const qrCodeDataUrl = await QRCodeLib.default.toDataURL(qrCodeData, {
        width: 200,
        margin: 0,
        color: { dark: "#000000", light: "#FFFFFF" },
      });
      
      const imageBytes = await fetch(qrCodeDataUrl).then((res) => res.arrayBuffer());
      const qrImage = await pdfDoc.embedPng(imageBytes);
      
      const qrSizeMM = 20;
      const qrSizePt = qrSizeMM * 2.83465;
      const marginMM = 2;
      const marginPt = marginMM * 2.83465;
      
      page.drawImage(qrImage, {
        x: marginPt,
        y: heightPt - marginPt - qrSizePt,
        width: qrSizePt,
        height: qrSizePt,
      });
      
      const baseFontSize = 16;
      const textX = marginPt + qrSizePt + marginPt;
      const textY = heightPt - marginPt;
      
      page.drawText(renewal.prescriptionCycle.patient.nom.toUpperCase(), {
        x: textX,
        y: textY - baseFontSize * 0.8,
        size: baseFontSize,
        color: rgb(0, 0, 0),
        font: helveticaBold,
      });
      
      page.drawText(renewal.prescriptionCycle.patient.prenom, {
        x: textX,
        y: textY - baseFontSize * 1.8,
        size: baseFontSize,
        color: rgb(0, 0, 0),
        font: helveticaBold,
      });
      
      const dateText = format(new Date(renewal.date_theorique), "dd/MM/yyyy", { locale: fr });
      page.drawText(dateText, {
        x: textX,
        y: textY - baseFontSize * 2.5,
        size: baseFontSize * 0.85,
        color: rgb(0.4, 0.4, 0.4),
        font: helveticaBold,
      });
      
      let yOffset = baseFontSize * 3.3;
      if (renewal.date_delivrance) {
        const dateDelivranceText = `Delivre: ${format(new Date(renewal.date_delivrance), "dd/MM/yyyy", { locale: fr })}`;
        page.drawText(dateDelivranceText, {
          x: textX,
          y: textY - yOffset,
          size: baseFontSize * 0.85,
          color: rgb(0, 0.4, 0.8),
          font: helveticaBold,
        });
        yOffset = baseFontSize * 4.1;
      }
      
      page.drawText(`R${renewal.index}`, {
        x: textX,
        y: textY - yOffset,
        size: baseFontSize * 0.85,
        color: rgb(0.3, 0.3, 0.3),
        font: helveticaBold,
      });
      
      if (isLastRenewal) {
        yOffset = yOffset + baseFontSize * 0.9;
        page.drawText("! DERNIERE ORDO", {
          x: textX,
          y: textY - yOffset,
          size: baseFontSize * 0.7,
          color: rgb(0.83, 0.18, 0.18),
          font: helveticaBold,
        });
      }
      
      const pdfBytes = await pdfDoc.save();
      const bytes = new Uint8Array(pdfBytes);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `QR_${renewal.prescriptionCycle.patient.nom}_${renewal.prescriptionCycle.patient.prenom}_R${renewal.index}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setGeneratingPDF(null);
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      alert("Erreur lors de la génération du PDF");
      setGeneratingPDF(null);
    }
  };

  const generateQRCodesPDF = async () => {
    if (!selectedDate) {
      alert("Veuillez sélectionner une date");
      return;
    }

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const renewalsToPrint = renewalsByDay[dateStr]?.filter((r) => r.statut !== "ANNULE") || [];
    
    if (renewalsToPrint.length === 0) {
      alert("Aucun renouvellement à imprimer pour cette date");
      return;
    }
    
    try {
      setGeneratingPDF("all");
      
      // Créer un nouveau document PDF
      const pdfDoc = await PDFDocument.create();
      
      // Dimensions en points (1mm = 2.83465 points)
      const widthMM = 55;
      const heightMM = 25;
      const widthPt = widthMM * 2.83465;
      const heightPt = heightMM * 2.83465;
      
      const QRCodeLib = await import("qrcode");
      
      // Charger les polices une seule fois
      const helveticaBold = await pdfDoc.embedFont("Helvetica-Bold");
      
      // Générer un PDF pour chaque renouvellement
      for (const renewal of renewalsToPrint) {
        const page = pdfDoc.addPage([widthPt, heightPt]);
        
        // Vérifier si c'est le dernier renouvellement
        const isLastRenewal = renewal.index === renewal.prescriptionCycle.nb_renouvellements;
        
        const qrCodeData = JSON.stringify({
          renewalId: renewal.id,
          type: isLastRenewal ? "RENEWAL_END" : "RENEWAL",
        });
        
        const qrCodeDataUrl = await QRCodeLib.default.toDataURL(qrCodeData, {
          width: 200,
          margin: 0,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        
        const imageBytes = await fetch(qrCodeDataUrl).then((res) => res.arrayBuffer());
        const qrImage = await pdfDoc.embedPng(imageBytes);
        
        const qrSizeMM = 20;
        const qrSizePt = qrSizeMM * 2.83465;
        const marginMM = 2;
        const marginPt = marginMM * 2.83465;
        
        page.drawImage(qrImage, {
          x: marginPt,
          y: heightPt - marginPt - qrSizePt,
          width: qrSizePt,
          height: qrSizePt,
        });
        
        const baseFontSize = 16;
        const textX = marginPt + qrSizePt + marginPt;
        const textY = heightPt - marginPt;
        
        // Nom en majuscules
        const nomSize = baseFontSize;
        page.drawText(renewal.prescriptionCycle.patient.nom.toUpperCase(), {
          x: textX,
          y: textY - nomSize * 0.8,
          size: nomSize,
          color: rgb(0, 0, 0),
          font: helveticaBold,
        });
        
        // Prénom
        const prenomSize = baseFontSize;
        page.drawText(renewal.prescriptionCycle.patient.prenom, {
          x: textX,
          y: textY - nomSize * 1.8,
          size: prenomSize,
          color: rgb(0, 0, 0),
          font: helveticaBold,
        });
        
        // Date théorique
        const dateText = format(new Date(renewal.date_theorique), "dd/MM/yyyy", { locale: fr });
        const dateSize = baseFontSize * 0.85;
        page.drawText(dateText, {
          x: textX,
          y: textY - nomSize * 2.5,
          size: dateSize,
          color: rgb(0.4, 0.4, 0.4),
          font: helveticaBold,
        });
        
        // Date de délivrance (si disponible)
        let yOffset = nomSize * 3.3;
        if (renewal.date_delivrance) {
          const dateDelivranceText = `✓ Délivré: ${format(new Date(renewal.date_delivrance), "dd/MM/yyyy", { locale: fr })}`;
          const delivranceSize = baseFontSize * 0.85;
          page.drawText(dateDelivranceText, {
            x: textX,
            y: textY - yOffset,
            size: delivranceSize,
            color: rgb(0, 0.4, 0.8),
            font: helveticaBold,
          });
          yOffset = nomSize * 4.1;
        }
        
        // Numéro de renouvellement
        const renouvellementSize = baseFontSize * 0.85;
        page.drawText(`R${renewal.index}`, {
          x: textX,
          y: textY - yOffset,
          size: renouvellementSize,
          color: rgb(0.3, 0.3, 0.3),
          font: helveticaBold,
        });
        
        // Note pour le dernier renouvellement
        if (isLastRenewal) {
          yOffset = yOffset + nomSize * 0.9;
          page.drawText("! DERNIERE ORDO", {
            x: textX,
            y: textY - yOffset,
            size: baseFontSize * 0.7,
            color: rgb(0.83, 0.18, 0.18),
            font: helveticaBold,
          });
        }
      }
      
      const pdfBytes = await pdfDoc.save();
      const bytes = new Uint8Array(pdfBytes);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `QR_codes_${dateStr}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setGeneratingPDF(null);
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      alert("Erreur lors de la génération du PDF");
      setGeneratingPDF(null);
    }
  };

  const handleBulkSendSms = async () => {
    const patientsWithConsent = renewals.filter(
      (r) => r.prescriptionCycle?.patient?.consentement
    );

    if (patientsWithConsent.length === 0) {
      alert("Aucun patient avec consentement SMS dans le planning de la semaine");
      return;
    }

    if (!confirm(`Envoyer un SMS à ${patientsWithConsent.length} patient(s) ?`)) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const results: Array<{ success: boolean; patientName: string; error?: string }> = [];

      for (const renewal of patientsWithConsent) {
        try {
          const smsRes = await fetch("/api/sms/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ renewalEventId: renewal.id }),
          });

          const smsData = await smsRes.json();
          if (smsData.success) {
            results.push({
              success: true,
              patientName: `${renewal.prescriptionCycle.patient.prenom} ${renewal.prescriptionCycle.patient.nom}`,
            });
          } else {
            results.push({
              success: false,
              patientName: `${renewal.prescriptionCycle.patient.prenom} ${renewal.prescriptionCycle.patient.nom}`,
              error: smsData.error || "Erreur inconnue",
            });
          }
        } catch (error) {
          results.push({
            success: false,
            patientName: `${renewal.prescriptionCycle.patient.prenom} ${renewal.prescriptionCycle.patient.nom}`,
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

      loadWeekRenewals();
    } catch (error) {
      console.error("Erreur envoi SMS en bloc:", error);
      alert("Erreur lors de l'envoi des SMS");
    } finally {
      setBulkActionLoading(false);
    }
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
              <button
                onClick={handleBulkSendSms}
                disabled={bulkActionLoading || renewals.filter((r) => r.prescriptionCycle?.patient?.consentement).length === 0}
                className="px-4 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed no-print"
              >
                {bulkActionLoading ? "Envoi..." : "📱 SMS de masse"}
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
                          <button
                            key={r.id}
                            onClick={() => router.push(`/patients/${r.prescriptionCycle.patient.id}`)}
                            className="text-blue-600 hover:text-blue-900 hover:underline w-full text-left"
                            title="Voir la fiche patient"
                          >
                            {r.prescriptionCycle.patient.prenom}{" "}
                            {r.prescriptionCycle.patient.nom}
                          </button>
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
                <div className="flex gap-2 items-center">
                  {selectedDate > new Date() && (
                    <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded" title="Vous pouvez préparer et envoyer les SMS en avance pour cette date">
                      ⏩ Date future
                    </span>
                  )}
                  <button
                    onClick={generateQRCodesPDF}
                    disabled={generatingPDF === "all" || !renewalsByDay[format(selectedDate, "yyyy-MM-dd")]?.filter((r) => r.statut !== "ANNULE").length}
                    className="px-4 py-2 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Imprimer les QR codes de cette date"
                  >
                    {generatingPDF === "all" ? "Génération..." : "📱 Imprimer QR codes"}
                  </button>
                </div>
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
                                <button
                                  onClick={() => router.push(`/patients/${renewal.prescriptionCycle.patient.id}`)}
                                  className="text-blue-600 hover:text-blue-900 hover:underline font-semibold no-print"
                                  title="Voir la fiche patient"
                                >
                                  {renewal.prescriptionCycle.patient.nom}
                                </button>
                                <span className="print-only">{renewal.prescriptionCycle.patient.nom}</span>
                                {isFutureDate && (
                                  <span className="px-1.5 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded no-print" title={`Date future: ${format(renewalDate, "dd/MM/yyyy", { locale: fr })}`}>
                                    ⏩
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              <button
                                onClick={() => router.push(`/patients/${renewal.prescriptionCycle.patient.id}`)}
                                className="text-blue-600 hover:text-blue-900 hover:underline no-print"
                                title="Voir la fiche patient"
                              >
                                {renewal.prescriptionCycle.patient.prenom}
                              </button>
                              <span className="print-only">{renewal.prescriptionCycle.patient.prenom}</span>
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
                                  <button
                                    onClick={() => router.push(`/patients/${renewal.prescriptionCycle.patient.id}`)}
                                    className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded hover:bg-indigo-200"
                                    title="Voir la fiche patient"
                                  >
                                    👤 Fiche
                                  </button>
                                  <button
                                    onClick={() => generateQRCodePDFForRenewal(renewal)}
                                    disabled={generatingPDF === renewal.id}
                                    className="px-3 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-300 rounded hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Imprimer le QR code"
                                  >
                                    {generatingPDF === renewal.id ? "..." : "📱 QR"}
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
