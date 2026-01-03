"use client";

import { useEffect, useState, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { RenewalEventStatus } from "@/lib/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
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
  const [showQRCodes, setShowQRCodes] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [showOldRenewals, setShowOldRenewals] = useState(false);

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

  const loadRenewalsByDate = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/renewals?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setRenewals(data);
      }
    } catch (error) {
      console.error("Erreur chargement renouvellements:", error);
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

  const printQRCode = async (renewal: RenewalEvent) => {
    try {
      // Vérifier si c'est le dernier renouvellement
      const isLastRenewal = renewal.index === renewal.prescriptionCycle.nb_renouvellements;
      
      const qrCodeData = JSON.stringify({
        renewalId: renewal.id,
        type: isLastRenewal ? "RENEWAL_END" : "RENEWAL",
      });

      // Générer le QR code en image
      const QRCodeLib = await import("qrcode");
      const qrCodeDataUrl = await QRCodeLib.default.toDataURL(qrCodeData, {
        width: 200,
        margin: 0,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      // Créer une nouvelle fenêtre pour l'impression
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Veuillez autoriser les pop-ups pour imprimer");
        return;
      }

      const dateText = format(new Date(renewal.date_theorique), "dd/MM/yyyy", { locale: fr });
      const dateDelivranceText = renewal.date_delivrance 
        ? format(new Date(renewal.date_delivrance), "dd/MM/yyyy", { locale: fr })
        : null;

      // Créer le contenu HTML pour l'impression
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR Code - ${renewal.prescriptionCycle.patient.nom}</title>
            <style>
              @page {
                size: 55mm 25mm;
                margin: 0;
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                margin: 0;
                padding: 1.5mm;
                width: 55mm;
                height: 25mm;
                font-family: Arial, sans-serif;
                display: flex;
                align-items: center;
                gap: 1.5mm;
                overflow: hidden;
              }
              .qr-container {
                flex-shrink: 0;
                width: 18mm;
                height: 18mm;
              }
              .qr-container img {
                width: 100%;
                height: 100%;
                object-fit: contain;
              }
              .info-container {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
                font-size: 10px;
                line-height: 1.3;
                min-width: 0;
                height: 100%;
              }
              .nom {
                font-weight: bold;
                font-size: 15px;
                text-transform: uppercase;
                line-height: 1.1;
                margin-bottom: 0.5mm;
                word-wrap: break-word;
                overflow-wrap: break-word;
              }
              .prenom {
                font-weight: bold;
                font-size: 15px;
                line-height: 1.1;
                margin-bottom: 0.5mm;
                word-wrap: break-word;
                overflow-wrap: break-word;
              }
              .date {
                font-size: 12px;
                color: #666;
                font-weight: bold;
                margin-top: 0.2mm;
                margin-bottom: 0.2mm;
                line-height: 1.1;
              }
              .date-delivrance {
                font-size: 12px;
                color: #0066cc;
                font-weight: bold;
                margin-top: 0.2mm;
                margin-bottom: 0.2mm;
                line-height: 1.1;
              }
              .renouvellement {
                font-size: 12px;
                color: #999;
                font-weight: bold;
                margin-top: 0.2mm;
                line-height: 1.1;
              }
              .note-derniere {
                font-size: 10px;
                color: #d32f2f;
                font-weight: bold;
                margin-top: 0.3mm;
                line-height: 1.0;
              }
              @media print {
                body {
                  margin: 0;
                  padding: 2mm;
                }
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <img src="${qrCodeDataUrl}" alt="QR Code" />
            </div>
            <div class="info-container">
              <div class="nom">${renewal.prescriptionCycle.patient.nom.toUpperCase()}</div>
              <div class="prenom">${renewal.prescriptionCycle.patient.prenom}</div>
              <div class="date">${dateText}</div>
              ${dateDelivranceText ? `<div class="date-delivrance">✓ Délivré: ${dateDelivranceText}</div>` : ''}
              <div class="renouvellement">R${renewal.index}</div>
              ${isLastRenewal ? '<div class="note-derniere">⚠️ DERNIÈRE ORDO</div>' : ''}
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.onafterprint = function() {
                    window.close();
                  };
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error("Erreur impression QR code:", error);
      alert("Erreur lors de l'impression du QR code");
    }
  };

  const generateQRCodePDF = async (renewal: RenewalEvent) => {
    try {
      setGeneratingPDF(renewal.id);
      
      // Créer un nouveau document PDF
      const pdfDoc = await PDFDocument.create();
      
      // Dimensions en points (1mm = 2.83465 points)
      const widthMM = 55;
      const heightMM = 25;
      const widthPt = widthMM * 2.83465;
      const heightPt = heightMM * 2.83465;
      
      // Créer une page avec les dimensions exactes
      const page = pdfDoc.addPage([widthPt, heightPt]);
      
      // Vérifier si c'est le dernier renouvellement
      const isLastRenewal = renewal.index === renewal.prescriptionCycle.nb_renouvellements;
      
      // Générer le QR code
      const qrCodeData = JSON.stringify({
        renewalId: renewal.id,
        type: isLastRenewal ? "RENEWAL_END" : "RENEWAL",
      });
      
      // Utiliser qrcode pour générer le QR code en image
      const QRCodeLib = await import("qrcode");
      const qrCodeDataUrl = await QRCodeLib.default.toDataURL(qrCodeData, {
        width: 200,
        margin: 0,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      
      // Convertir la data URL en image PNG
      const imageBytes = await fetch(qrCodeDataUrl).then((res) => res.arrayBuffer());
      const qrImage = await pdfDoc.embedPng(imageBytes);
      
      // Dimensions du QR code dans le PDF (environ 20mm de hauteur)
      const qrSizeMM = 20;
      const qrSizePt = qrSizeMM * 2.83465;
      const marginMM = 2;
      const marginPt = marginMM * 2.83465;
      
      // Dessiner le QR code
      page.drawImage(qrImage, {
        x: marginPt,
        y: heightPt - marginPt - qrSizePt,
        width: qrSizePt,
        height: qrSizePt,
      });
      
      // Ajouter le texte du patient
      const baseFontSize = 16; // Taille de base augmentée
      const textX = marginPt + qrSizePt + marginPt;
      const textY = heightPt - marginPt;
      
      // Charger les polices
      const helveticaBold = await pdfDoc.embedFont("Helvetica-Bold");
      const helvetica = await pdfDoc.embedFont("Helvetica");
      
      // Nom en majuscules (agrandi et en gras) - même hauteur que le QR code
      const nomSize = baseFontSize;
      page.drawText(renewal.prescriptionCycle.patient.nom.toUpperCase(), {
        x: textX,
        y: textY - nomSize * 0.8,
        size: nomSize,
        color: rgb(0, 0, 0),
        font: helveticaBold,
      });
      
      // Prénom (agrandi et en gras)
      const prenomSize = baseFontSize;
      page.drawText(renewal.prescriptionCycle.patient.prenom, {
        x: textX,
        y: textY - nomSize * 1.8,
        size: prenomSize,
        color: rgb(0, 0, 0),
        font: helveticaBold,
      });
      
      // Date théorique (légèrement réduite pour faire de la place)
      const dateText = format(new Date(renewal.date_theorique), "dd/MM/yyyy", { locale: fr });
      const dateSize = baseFontSize * 0.85;
      page.drawText(dateText, {
        x: textX,
        y: textY - nomSize * 2.5,
        size: dateSize,
        color: rgb(0.4, 0.4, 0.4),
        font: helveticaBold,
      });
      
      // Date de délivrance (si disponible) - légèrement réduite
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
      
      // Numéro de renouvellement (légèrement réduit)
      const renouvellementSize = baseFontSize * 0.85;
      page.drawText(`R${renewal.index}`, {
        x: textX,
        y: textY - yOffset,
        size: renouvellementSize,
        color: rgb(0.3, 0.3, 0.3),
        font: helveticaBold,
      });
      
      // Note pour le dernier renouvellement (plus petite et compacte)
      if (isLastRenewal) {
        yOffset = yOffset + nomSize * 0.9;
        page.drawText("⚠️ DERNIÈRE ORDO", {
          x: textX,
          y: textY - yOffset,
          size: baseFontSize * 0.7,
          color: rgb(0.83, 0.18, 0.18), // #d32f2f
          font: helveticaBold,
        });
      }
      
      // Sauvegarder le PDF
      const pdfBytes = await pdfDoc.save();
      // Créer un nouveau Uint8Array pour garantir la compatibilité
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

  const generateAllQRCodesPDF = async () => {
    const renewalsToPrint = renewals.filter((r) => r.statut !== "ANNULE");
    
    if (renewalsToPrint.length === 0) {
      alert("Aucun renouvellement à imprimer");
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
      const helvetica = await pdfDoc.embedFont("Helvetica");
      
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
        
        const baseFontSize = 16; // Taille de base augmentée
        const textX = marginPt + qrSizePt + marginPt;
        const textY = heightPt - marginPt;
        
        // Nom en majuscules (agrandi et en gras) - même hauteur que le QR code
        const nomSize = baseFontSize;
        page.drawText(renewal.prescriptionCycle.patient.nom.toUpperCase(), {
          x: textX,
          y: textY - nomSize * 0.8,
          size: nomSize,
          color: rgb(0, 0, 0),
          font: helveticaBold,
        });
        
        // Prénom (agrandi et en gras)
        const prenomSize = baseFontSize;
        page.drawText(renewal.prescriptionCycle.patient.prenom, {
          x: textX,
          y: textY - nomSize * 1.8,
          size: prenomSize,
          color: rgb(0, 0, 0),
          font: helveticaBold,
        });
        
        // Date théorique (légèrement réduite pour faire de la place)
        const dateText = format(new Date(renewal.date_theorique), "dd/MM/yyyy", { locale: fr });
        const dateSize = baseFontSize * 0.85;
        page.drawText(dateText, {
          x: textX,
          y: textY - nomSize * 2.5,
          size: dateSize,
          color: rgb(0.4, 0.4, 0.4),
          font: helveticaBold,
        });
        
        // Date de délivrance (si disponible) - légèrement réduite
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
        
        // Numéro de renouvellement (légèrement réduit)
        const renouvellementSize = baseFontSize * 0.85;
        page.drawText(`R${renewal.index}`, {
          x: textX,
          y: textY - yOffset,
          size: renouvellementSize,
          color: rgb(0.3, 0.3, 0.3),
          font: helveticaBold,
        });
        
        // Note pour le dernier renouvellement (plus petite et compacte)
        if (isLastRenewal) {
          yOffset = yOffset + nomSize * 0.9;
          page.drawText("⚠️ DERNIÈRE ORDO", {
            x: textX,
            y: textY - yOffset,
            size: baseFontSize * 0.7,
            color: rgb(0.83, 0.18, 0.18), // #d32f2f
            font: helveticaBold,
          });
        }
      }
      
      const pdfBytes = await pdfDoc.save();
      // Créer un nouveau Uint8Array pour garantir la compatibilité
      const bytes = new Uint8Array(pdfBytes);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `QR_codes_${format(new Date(), "yyyy-MM-dd", { locale: fr })}.pdf`;
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
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handlePrint}
                className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 no-print"
              >
                🖨️ Imprimer
              </button>
              <button
                onClick={() => {
                  setShowQRCodes(!showQRCodes);
                  if (!showQRCodes) {
                    // Si on affiche les QR codes, charger les renouvellements du jour
                    loadTodayRenewals();
                    setShowOldRenewals(false);
                    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
                  }
                }}
                className="flex-1 sm:flex-none px-4 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 no-print"
              >
                {showQRCodes ? "Masquer QR codes" : "📱 Imprimer QR codes"}
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
                          {/* Boutons d'impression QR code */}
                          <div className="flex gap-1 mt-1">
                            <button
                              onClick={() => printQRCode(renewal)}
                              className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-300 rounded hover:bg-green-100"
                              title="Imprimer QR code (55x25mm)"
                            >
                              🖨️ QR
                            </button>
                            <button
                              onClick={() => generateQRCodePDF(renewal)}
                              disabled={generatingPDF === renewal.id}
                              className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Télécharger PDF QR code (55x25mm)"
                            >
                              {generatingPDF === renewal.id ? "..." : "📥 QR"}
                            </button>
                          </div>
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

          {/* Section d'impression des QR codes */}
          {showQRCodes && (
            <div className="mt-6 bg-white shadow rounded-lg p-6">
              <div className="mb-4 no-print">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className="text-lg font-semibold">
                    {showOldRenewals ? (
                      (() => {
                        const selected = new Date(selectedDate);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        selected.setHours(0, 0, 0, 0);
                        const isFuture = selected > today;
                        const isPast = selected < today;
                        const isToday = selected.getTime() === today.getTime();
                        
                        if (isFuture) {
                          return `Étiquettes QR codes du ${format(new Date(selectedDate), "dd/MM/yyyy", { locale: fr })} (à l'avance)`;
                        } else if (isPast) {
                          return `Étiquettes QR codes du ${format(new Date(selectedDate), "dd/MM/yyyy", { locale: fr })} (anciennes)`;
                        } else {
                          return `Étiquettes QR codes du ${format(new Date(selectedDate), "dd/MM/yyyy", { locale: fr })}`;
                        }
                      })()
                    ) : (
                      "Étiquettes QR codes du jour"
                    )}
                  </h2>
                  <button
                    onClick={generateAllQRCodesPDF}
                    disabled={generatingPDF === "all"}
                    className="px-4 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingPDF === "all" ? "Génération..." : "📥 Télécharger toutes les étiquettes (PDF)"}
                  </button>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="dateSelection"
                        checked={!showOldRenewals}
                        onChange={() => {
                          setShowOldRenewals(false);
                          loadTodayRenewals();
                          setSelectedDate(format(new Date(), "yyyy-MM-dd"));
                        }}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">Aujourd&apos;hui</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="dateSelection"
                        checked={showOldRenewals}
                        onChange={() => {
                          setShowOldRenewals(true);
                          loadRenewalsByDate(selectedDate);
                        }}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">Sélectionner une date</span>
                    </label>
                    {showOldRenewals && (
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                          setSelectedDate(e.target.value);
                          loadRenewalsByDate(e.target.value);
                        }}
                        className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    💡 Vous pouvez sélectionner une date passée pour imprimer les anciens QR codes ou une date future pour imprimer à l&apos;avance.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 print:qr-labels-grid">
                {renewals
                  .filter((r) => r.statut !== "ANNULE")
                  .map((renewal) => {
                    const isLastRenewal = renewal.index === renewal.prescriptionCycle.nb_renouvellements;
                    const qrCodeData = JSON.stringify({
                      renewalId: renewal.id,
                      type: isLastRenewal ? "RENEWAL_END" : "RENEWAL",
                    });

                    return (
                      <div
                        key={renewal.id}
                        className="border-2 border-gray-300 rounded p-2 bg-white print:border-black print:qr-label-print"
                      >
                        <div className="flex items-center gap-1 h-full">
                          <div className="flex-shrink-0">
                            <QRCodeSVG
                              value={qrCodeData}
                              size={60}
                              level="M"
                              includeMargin={false}
                            />
                          </div>
                          <div className="flex-1 text-[8px] leading-tight overflow-hidden">
                            <div className="font-semibold text-gray-900 truncate">
                              {renewal.prescriptionCycle.patient.nom.toUpperCase()}
                            </div>
                            <div className="text-gray-700 truncate">
                              {renewal.prescriptionCycle.patient.prenom}
                            </div>
                            <div className="text-[7px] text-gray-600 mt-0.5">
                              {format(new Date(renewal.date_theorique), "dd/MM/yyyy", { locale: fr })}
                            </div>
                            <div className="text-[7px] text-gray-500">
                              R{renewal.index}
                            </div>
                          </div>
                        </div>
                        <div className="mt-1 flex gap-1 no-print">
                          <button
                            onClick={() => printQRCode(renewal)}
                            className="flex-1 px-2 py-1 text-[8px] border border-green-300 rounded text-green-700 bg-green-50 hover:bg-green-100"
                            title="Imprimer directement"
                          >
                            🖨️ Imprimer
                          </button>
                          <button
                            onClick={() => generateQRCodePDF(renewal)}
                            disabled={generatingPDF === renewal.id}
                            className="flex-1 px-2 py-1 text-[8px] border border-blue-300 rounded text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Télécharger PDF"
                          >
                            {generatingPDF === renewal.id ? "..." : "📥 PDF"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
              {renewals.filter((r) => r.statut !== "ANNULE").length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  Aucun renouvellement à imprimer aujourd&apos;hui
                </p>
              )}
            </div>
          )}

        </div>
      </Layout>
    </ProtectedRoute>
  );
}
