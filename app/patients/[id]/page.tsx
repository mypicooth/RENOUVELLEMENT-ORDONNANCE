"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { UserRole } from "@/lib/types";
import { QRCodeSVG } from "qrcode.react";
import { PDFDocument, rgb } from "pdf-lib";

interface Consent {
  id: string;
  consent_type: string;
  created_at: string;
  signed_at: string | null;
  today_date: string;
  end_date: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  document_url: string | null;
  creator: {
    email: string;
  };
  revoker: {
    email: string;
  } | null;
}

interface Patient {
  id: string;
  nom: string;
  prenom: string;
  telephone_normalise: string;
  date_recrutement: string;
  consentement: boolean;
  notes?: string;
  cycles: Array<{
    id: string;
    date_premiere_delivrance: string;
    nb_renouvellements: number;
    intervalle_jours?: number;
    statut: string;
    created_operator_id?: string | null;
    createdOperator?: { prenom: string } | null;
    renewals: Array<{
      id: string;
      index: number;
      date_theorique: string;
      statut: string;
      date_delivrance?: string | null;
      completedOperator?: { prenom: string } | null;
      completedBy?: { prenom: string; nom: string } | null;
    }>;
  }>;
}

const STATUT_LABELS: Record<string, string> = {
  A_PREPARER: "À préparer",
  EN_PREPARATION: "En préparation",
  PRET: "Prêt",
  SMS_ENVOYE: "SMS envoyé",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

const STATUT_COLORS: Record<string, string> = {
  A_PREPARER: "bg-yellow-100 text-yellow-800",
  EN_PREPARATION: "bg-blue-100 text-blue-800",
  PRET: "bg-green-100 text-green-800",
  SMS_ENVOYE: "bg-purple-100 text-purple-800",
  TERMINE: "bg-gray-100 text-gray-800",
  ANNULE: "bg-red-100 text-red-800",
};

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    telephone: "",
    consentement: false,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loadingConsents, setLoadingConsents] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showNewCycle, setShowNewCycle] = useState(false);
  const [creatingCycle, setCreatingCycle] = useState(false);
  const [operators, setOperators] = useState<Array<{ id: string; label: string }>>([]);
  const [newCycleOperatorId, setNewCycleOperatorId] = useState<string>("");
  const [newCycleData, setNewCycleData] = useState({
    date_premiere_delivrance: format(new Date(), "yyyy-MM-dd"),
    nb_renouvellements: "12",
    intervalle_jours: "21",
  });
  const [duplicatePatients, setDuplicatePatients] = useState<Array<{
    id: string;
    nom: string;
    prenom: string;
    telephone_normalise: string;
  }>>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [editingRenewal, setEditingRenewal] = useState<string | null>(null);
  const [renewalNewDate, setRenewalNewDate] = useState("");
  const [updatingRenewal, setUpdatingRenewal] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);
  const [savingCycleOperatorId, setSavingCycleOperatorId] = useState<string | null>(null);
  const [stoppingCycleId, setStoppingCycleId] = useState<string | null>(null);
  const [editingNbRenewalsCycleId, setEditingNbRenewalsCycleId] = useState<string | null>(null);
  const [nbRenewalsEditValue, setNbRenewalsEditValue] = useState("");
  const [savingNbRenewals, setSavingNbRenewals] = useState(false);
  const [sendingTestSms, setSendingTestSms] = useState(false);
  const [testSmsResult, setTestSmsResult] = useState<{ success: boolean; message: string } | null>(null);
  const isAdmin = session?.user.role === UserRole.ADMIN;
  const isSuperAdmin = session?.user.role === UserRole.SUPERADMIN;
  const canManageCycle = isAdmin || isSuperAdmin;

  useEffect(() => {
    if (isSuperAdmin) {
      (async () => {
        try {
          const res = await fetch("/api/operators");
          if (!res.ok) return;
          const data = await res.json();
          if (Array.isArray(data)) setOperators(data);
        } catch (e) {
          /* silencieux */
        }
      })();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!showNewCycle) return;
    (async () => {
      try {
        const res = await fetch("/api/operators");
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          setOperators(data);
          // Pré-sélection : si une seule option, on la choisit
          if (data.length === 1 && data[0]?.id) {
            setNewCycleOperatorId(data[0].id);
          }
        }
      } catch (e) {
        // silencieux : le formulaire affichera l'erreur si opérateur manquant
      }
    })();
  }, [showNewCycle]);

  const loadPatient = useCallback(async () => {
    if (!params.id) return;
    try {
      const res = await fetch(`/api/patients/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setPatient(data);
      }
    } catch (error) {
      console.error("Erreur chargement patient:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadPatient();
  }, [loadPatient]);

  const loadConsents = useCallback(async () => {
    if (!params.id) return;
    setLoadingConsents(true);
    try {
      const res = await fetch(`/api/patients/${params.id}/consents`);
      if (res.ok) {
        const data = await res.json();
        setConsents(data);
      }
    } catch (error) {
      console.error("Erreur chargement consentements:", error);
    } finally {
      setLoadingConsents(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (patient) {
      loadConsents();
    }
  }, [patient, loadConsents]);

  const generateQRCodePDFForRenewal = async (renewal: { id: string; index: number; date_theorique: string; date_delivrance?: string | null }, type: "RENEWAL" | "RENEWAL_END") => {
    if (!patient) return;
    
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
      
      const qrCodeData = JSON.stringify({
        renewalId: renewal.id,
        type: type,
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
      
      page.drawText(patient.nom.toUpperCase(), {
        x: textX,
        y: textY - baseFontSize * 0.8,
        size: baseFontSize,
        color: rgb(0, 0, 0),
        font: helveticaBold,
      });
      
      page.drawText(patient.prenom, {
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
        const dateDelivranceText = `✓ Délivré: ${format(new Date(renewal.date_delivrance), "dd/MM/yyyy", { locale: fr })}`;
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
      
      if (type === "RENEWAL_END") {
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
      link.download = `QR_${patient.nom}_${patient.prenom}_R${renewal.index}_${type === "RENEWAL_END" ? "FIN" : ""}.pdf`;
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

  const handleRevoke = async (consentId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir révoquer ce consentement ?")) {
      return;
    }

    const reason = prompt("Raison de la révocation (optionnel):") || null;

    setRevokingId(consentId);
    try {
      const res = await fetch(`/api/patients/${params.id}/consents/${consentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        loadConsents();
      } else {
        alert("Erreur lors de la révocation");
      }
    } catch (error) {
      console.error("Erreur révocation:", error);
      alert("Erreur lors de la révocation");
    } finally {
      setRevokingId(null);
    }
  };

  const handleDownloadPDF = async (consentId: string) => {
    try {
      const res = await fetch(`/api/patients/${params.id}/consents/${consentId}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `autorisation-${consentId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("Erreur lors du téléchargement");
      }
    } catch (error) {
      console.error("Erreur téléchargement:", error);
      alert("Erreur lors du téléchargement");
    }
  };

  useEffect(() => {
    if (patient) {
      setFormData({
        nom: patient.nom,
        prenom: patient.prenom,
        telephone: patient.telephone_normalise,
        consentement: patient.consentement,
        notes: patient.notes || "",
      });
    }
  }, [patient]);

  // Vérifier les doublons par nom de famille (pour l'édition)
  const checkDuplicates = useCallback(async (nom: string, currentPatientId: string) => {
    if (!nom || nom.trim().length < 2) {
      setDuplicatePatients([]);
      return;
    }

    setCheckingDuplicates(true);
    try {
      const res = await fetch(`/api/patients/check-duplicate?nom=${encodeURIComponent(nom.trim())}`);
      if (res.ok) {
        const duplicates = await res.json();
        // Filtrer le patient actuel de la liste des doublons
        const filtered = duplicates.filter((p: { id: string }) => p.id !== currentPatientId);
        setDuplicatePatients(filtered);
      }
    } catch (error) {
      console.error("Erreur vérification doublons:", error);
    } finally {
      setCheckingDuplicates(false);
    }
  }, []);

  // Debounce pour éviter trop de requêtes
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const handleNomChange = (value: string) => {
    setFormData({ ...formData, nom: value });
    
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    if (params.id) {
      debounceTimeout.current = setTimeout(() => {
        checkDuplicates(value, params.id as string);
      }, 500);
    }
  };

  const sendTestSms = async () => {
    if (!patient) return;
    setSendingTestSms(true);
    setTestSmsResult(null);
    try {
      const res = await fetch("/api/sms/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telephone: patient.telephone_normalise }),
      });
      const data = await res.json();
      if (data.success) {
        setTestSmsResult({ success: true, message: "SMS envoyé ✓" });
      } else {
        setTestSmsResult({ success: false, message: data.error || "Échec de l'envoi" });
      }
    } catch {
      setTestSmsResult({ success: false, message: "Erreur réseau" });
    } finally {
      setSendingTestSms(false);
    }
  };

  const handleSave = async () => {
    // Vérifier les doublons avant de sauvegarder
    if (duplicatePatients.length > 0) {
      const confirmMessage = `⚠️ Attention : ${duplicatePatients.length} autre(s) patient(s) avec le nom "${formData.nom}" existe(nt) déjà.\n\n` +
        duplicatePatients.map((p) => `- ${p.prenom} ${p.nom} (${p.telephone_normalise})`).join("\n") +
        `\n\nVoulez-vous vraiment continuer la modification ?`;
      
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        setPatient(data);
        setEditing(false);
        setDuplicatePatients([]); // Réinitialiser les doublons après sauvegarde
        alert("Patient mis à jour avec succès");
      } else {
        const error = await res.json();
        alert(`Erreur: ${error.error || "Erreur lors de la mise à jour"}`);
      }
    } catch (error) {
      console.error("Erreur mise à jour patient:", error);
      alert("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const handleAnonymize = async () => {
    if (!confirm("Anonymiser ce patient ? Les données seront remplacées par 'ANONYME'.")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/anonymize/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonymize: true }),
      });

      if (res.ok) {
        alert("Patient anonymisé avec succès");
        router.push("/patients");
      } else {
        alert("Erreur lors de l'anonymisation");
      }
    } catch (error) {
      alert("Erreur lors de l'anonymisation");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer définitivement ce patient et tous ses cycles ? Cette action est irréversible.")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/anonymize/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonymize: false }),
      });

      if (res.ok) {
        alert("Patient supprimé avec succès");
        router.push("/patients");
      } else {
        alert("Erreur lors de la suppression");
      }
    } catch (error) {
      alert("Erreur lors de la suppression");
    }
  };

  const handleCreateNewCycle = async () => {
    if (!newCycleData.date_premiere_delivrance || !newCycleData.nb_renouvellements) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (!newCycleOperatorId) {
      alert("Veuillez sélectionner l'opérateur qui crée cette ordonnance");
      return;
    }

    setCreatingCycle(true);
    try {
      const res = await fetch("/api/patients/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: params.id,
          date_premiere_delivrance: newCycleData.date_premiere_delivrance,
          nb_renouvellements: parseInt(newCycleData.nb_renouvellements),
          intervalle_jours: parseInt(newCycleData.intervalle_jours) || 21,
          operateur_id: newCycleOperatorId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Nouveau cycle de prescription créé avec succès");
        setShowNewCycle(false);
        setNewCycleData({
          date_premiere_delivrance: format(new Date(), "yyyy-MM-dd"),
          nb_renouvellements: "12",
          intervalle_jours: "21",
        });
        loadPatient();
      } else {
        alert(data.error || "Erreur lors de la création du cycle");
      }
    } catch (error) {
      console.error("Erreur création cycle:", error);
      alert("Erreur lors de la création du cycle");
    } finally {
      setCreatingCycle(false);
    }
  };

  const handleCycleOperatorChange = async (cycleId: string, createdOperatorId: string) => {
    setSavingCycleOperatorId(cycleId);
    try {
      const res = await fetch(`/api/admin/cycles/${cycleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          created_operator_id: createdOperatorId || null,
        }),
      });
      if (res.ok) {
        loadPatient();
      } else {
        const data = await res.json();
        alert(data.error || "Erreur lors de l’attribution");
      }
    } catch (e) {
      alert("Erreur lors de l’attribution de l’opérateur");
    } finally {
      setSavingCycleOperatorId(null);
    }
  };

  const handleStopCycle = async (cycleId: string) => {
    if (!confirm("Arrêter ce cycle ? Les renouvellements non encore terminés seront annulés.")) return;
    setStoppingCycleId(cycleId);
    try {
      const res = await fetch(`/api/admin/cycles/${cycleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stop: true }),
      });
      if (res.ok) {
        loadPatient();
      } else {
        const data = await res.json();
        alert(data.error || "Erreur lors de l'arrêt du cycle");
      }
    } catch (e) {
      alert("Erreur lors de l'arrêt du cycle");
    } finally {
      setStoppingCycleId(null);
    }
  };

  const handleStartEditNbRenewals = (cycleId: string, currentNb: number) => {
    setEditingNbRenewalsCycleId(cycleId);
    setNbRenewalsEditValue(String(currentNb));
  };

  const handleCancelEditNbRenewals = () => {
    setEditingNbRenewalsCycleId(null);
    setNbRenewalsEditValue("");
  };

  const handleApplyNbRenewals = async (cycleId: string) => {
    const num = parseInt(nbRenewalsEditValue, 10);
    if (Number.isNaN(num) || num < 1 || num > 99) {
      alert("Veuillez entrer un nombre entre 1 et 99");
      return;
    }
    setSavingNbRenewals(true);
    try {
      const res = await fetch(`/api/admin/cycles/${cycleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nb_renouvellements: num }),
      });
      if (res.ok) {
        setEditingNbRenewalsCycleId(null);
        setNbRenewalsEditValue("");
        loadPatient();
      } else {
        const data = await res.json();
        alert(data.error || "Erreur lors de la modification");
      }
    } catch (e) {
      alert("Erreur lors de la modification du nombre de renouvellements");
    } finally {
      setSavingNbRenewals(false);
    }
  };

  const handleStartEditRenewal = (renewalId: string, currentDate: string) => {
    setEditingRenewal(renewalId);
    setRenewalNewDate(format(new Date(currentDate), "yyyy-MM-dd"));
  };

  const handleCancelEditRenewal = () => {
    setEditingRenewal(null);
    setRenewalNewDate("");
  };

  const handleUpdateRenewalDate = async (renewalId: string) => {
    if (!renewalNewDate) {
      alert("Veuillez sélectionner une date");
      return;
    }

    setUpdatingRenewal(true);
    try {
      const res = await fetch("/api/renewals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: renewalId,
          date_theorique: renewalNewDate,
        }),
      });

      if (res.ok) {
        alert("Date du renouvellement modifiée avec succès");
        setEditingRenewal(null);
        setRenewalNewDate("");
        loadPatient();
      } else {
        const error = await res.json();
        alert(`Erreur: ${error.error || "Erreur lors de la modification"}`);
      }
    } catch (error) {
      console.error("Erreur modification renouvellement:", error);
      alert("Erreur lors de la modification du renouvellement");
    } finally {
      setUpdatingRenewal(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-8">Chargement...</div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!patient) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-8 text-gray-500">Patient introuvable</div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              ← Retour
            </button>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">
                {patient.prenom} {patient.nom}
              </h1>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  ✏️ Modifier
                </button>
              )}
            </div>
          </div>

          {isAdmin && !editing && (
            <div className="mb-4 flex gap-2 flex-wrap">
              <button
                onClick={() => router.push(`/patients/${params.id}/consent`)}
                className="px-4 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
              >
                Faire signer l&apos;autorisation
              </button>
              <button
                onClick={handleAnonymize}
                className="px-4 py-2 border border-yellow-300 rounded-md text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
              >
                Anonymiser
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100"
              >
                Supprimer
              </button>
            </div>
          )}

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Informations</h2>
              {editing && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(false);
                      setFormData({
                        nom: patient.nom,
                        prenom: patient.prenom,
                        telephone: patient.telephone_normalise,
                        consentement: patient.consentement,
                        notes: patient.notes || "",
                      });
                    }}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1 text-sm border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
              )}
            </div>
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nom}
                      onChange={(e) => handleNomChange(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                        duplicatePatients.length > 0
                          ? "border-yellow-400 bg-yellow-50"
                          : "border-gray-300"
                      }`}
                    />
                    {checkingDuplicates && (
                      <p className="mt-1 text-xs text-gray-500">Vérification des doublons...</p>
                    )}
                    {duplicatePatients.length > 0 && !checkingDuplicates && (
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm font-medium text-yellow-800 mb-2">
                          ⚠️ {duplicatePatients.length} autre(s) patient(s) avec le nom &quot;{formData.nom}&quot; existe(nt) :
                        </p>
                        <ul className="space-y-1 text-xs text-yellow-700">
                          {duplicatePatients.map((dup) => (
                            <li key={dup.id} className="flex items-center justify-between">
                              <span>
                                {dup.prenom} {dup.nom} - {dup.telephone_normalise}
                              </span>
                              <button
                                type="button"
                                onClick={() => router.push(`/patients/${dup.id}`)}
                                className="ml-2 text-blue-600 hover:text-blue-900 hover:underline"
                              >
                                Voir
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.prenom}
                      onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.consentement}
                      onChange={(e) => setFormData({ ...formData, consentement: e.target.checked })}
                      className="mt-1 mr-3"
                    />
                    <span className="text-sm text-gray-700">
                      Le patient autorise la conservation de l&apos;ordonnance + l&apos;envoi de SMS *
                    </span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Notes sur le patient..."
                  />
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Téléphone</dt>
                  <dd className="mt-1 text-sm text-gray-900 flex items-center gap-2 flex-wrap">
                    {patient.telephone_normalise}
                    <button
                      onClick={sendTestSms}
                      disabled={sendingTestSms}
                      title="Envoyer un SMS test pour vérifier que le numéro n'est pas en spam"
                      className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 border border-orange-300 rounded hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {sendingTestSms ? "Envoi..." : "TEST SMS"}
                    </button>
                    {testSmsResult && (
                      <span className={`text-xs font-medium ${testSmsResult.success ? "text-green-600" : "text-red-600"}`}>
                        {testSmsResult.message}
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Date de recrutement
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {format(new Date(patient.date_recrutement), "dd/MM/yyyy", {
                      locale: fr,
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Consentement</dt>
                  <dd className="mt-1">
                    {patient.consentement ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Oui
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Non
                      </span>
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {patient.notes ? patient.notes : <span className="text-gray-600">Aucune note</span>}
                  </dd>
                </div>
              </dl>
            )}
          </div>

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Documents - Autorisations</h2>
            </div>
            {loadingConsents ? (
              <p className="text-gray-500">Chargement...</p>
            ) : consents.length === 0 ? (
              <p className="text-gray-500">Aucune autorisation signée</p>
            ) : (
              <div className="space-y-3">
                {consents.map((consent) => (
                  <div
                    key={consent.id}
                    className="border rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          Autorisation de conservation d&apos;ordonnance
                        </span>
                        {consent.revoked_at ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Révoqué
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Actif
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Signé le : {format(new Date(consent.signed_at || consent.created_at), "dd/MM/yyyy à HH:mm", { locale: fr })}</p>
                        <p>Date de fin : {consent.end_date || "Jusqu&apos;à révocation"}</p>
                        {consent.revoked_at && (
                          <p className="text-red-600">
                            Révoqué le : {format(new Date(consent.revoked_at), "dd/MM/yyyy", { locale: fr })}
                            {consent.revoked_reason && ` - ${consent.revoked_reason}`}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          Créé par : {consent.creator.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleDownloadPDF(consent.id)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Télécharger PDF
                      </button>
                      {!consent.revoked_at && (
                        <button
                          onClick={() => handleRevoke(consent.id)}
                          disabled={revokingId === consent.id}
                          className="px-3 py-1 text-sm border border-red-300 rounded-md text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                        >
                          {revokingId === consent.id ? "Révocation..." : "Révoquer"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Cycles de prescription</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/patients/${params.id}/qr-codes`)}
                  className="px-4 py-2 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100"
                  title="Voir et imprimer tous les QR codes"
                >
                  📱 QR Codes
                </button>
                <button
                  onClick={() => setShowNewCycle(!showNewCycle)}
                  className="px-4 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
                >
                  {showNewCycle ? "Annuler" : "➕ Nouvelle ordonnance"}
                </button>
              </div>
            </div>

            {showNewCycle && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-md font-semibold text-gray-900 mb-4">
                  Créer un nouveau cycle de prescription
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Opérateur (créateur) *
                    </label>
                    <select
                      value={newCycleOperatorId}
                      onChange={(e) => setNewCycleOperatorId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">-- Choisir --</option>
                      {operators.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Sert à tracer qui a créé l’ordonnance (et donc les renouvellements)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date 1ère délivrance (R0) *
                    </label>
                    <input
                      type="date"
                      value={newCycleData.date_premiere_delivrance}
                      onChange={(e) =>
                        setNewCycleData({
                          ...newCycleData,
                          date_premiere_delivrance: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de renouvellements *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newCycleData.nb_renouvellements}
                      onChange={(e) =>
                        setNewCycleData({
                          ...newCycleData,
                          nb_renouvellements: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Intervalle (jours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newCycleData.intervalle_jours}
                      onChange={(e) =>
                        setNewCycleData({
                          ...newCycleData,
                          intervalle_jours: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => setShowNewCycle(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleCreateNewCycle}
                    disabled={creatingCycle || !newCycleOperatorId}
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!newCycleOperatorId ? "Sélectionnez un opérateur" : undefined}
                  >
                    {creatingCycle ? "Création..." : "Créer le cycle"}
                  </button>
                </div>
              </div>
            )}

            {patient.cycles.length === 0 ? (
              <p className="text-gray-500">Aucun cycle de prescription</p>
            ) : (
              <div className="space-y-4">
                {patient.cycles.map((cycle) => (
                  <div key={cycle.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          R0:{" "}
                          {format(
                            new Date(cycle.date_premiere_delivrance),
                            "dd/MM/yyyy",
                            { locale: fr }
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          {editingNbRenewalsCycleId === cycle.id ? (
                            <span className="flex flex-wrap items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                max={99}
                                value={nbRenewalsEditValue}
                                onChange={(e) => setNbRenewalsEditValue(e.target.value)}
                                disabled={savingNbRenewals}
                                className="w-16 px-2 py-0.5 text-sm border border-gray-300 rounded text-gray-900"
                              />
                              renouvellement(s)
                              <button
                                type="button"
                                onClick={() => handleApplyNbRenewals(cycle.id)}
                                disabled={savingNbRenewals}
                                className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                              >
                                {savingNbRenewals ? "..." : "Appliquer"}
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditNbRenewals}
                                disabled={savingNbRenewals}
                                className="px-2 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                              >
                                Annuler
                              </button>
                            </span>
                          ) : (
                            <>
                              {cycle.nb_renouvellements} renouvellement(s)
                              {canManageCycle && cycle.statut === "ACTIF" && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditNbRenewals(cycle.id, cycle.nb_renouvellements)}
                                  className="ml-2 text-xs text-blue-600 hover:underline"
                                >
                                  Modifier
                                </button>
                              )}
                              {" "}- Intervalle: 21 jours
                            </>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Ordonnance créée par :{" "}
                          {isSuperAdmin ? (
                            <select
                              value={cycle.created_operator_id ?? ""}
                              onChange={(e) =>
                                handleCycleOperatorChange(cycle.id, e.target.value)
                              }
                              disabled={savingCycleOperatorId === cycle.id}
                              className="ml-1 text-gray-700 border border-gray-300 rounded px-2 py-0.5 text-xs bg-white disabled:opacity-50"
                              title="Attribuer ou modifier l’opérateur (Superadmin)"
                            >
                              <option value="">— Non attribué —</option>
                              {operators.map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span>{cycle.createdOperator?.prenom ?? "—"}</span>
                          )}
                          {isSuperAdmin && savingCycleOperatorId === cycle.id && (
                            <span className="ml-1 text-gray-400">...</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            cycle.statut === "ACTIF"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {cycle.statut}
                        </span>
                        {canManageCycle && cycle.statut === "ACTIF" && (
                          <button
                            type="button"
                            onClick={() => handleStopCycle(cycle.id)}
                            disabled={stoppingCycleId === cycle.id}
                            className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50"
                          >
                            {stoppingCycleId === cycle.id ? "..." : "Arrêter le cycle"}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="mb-2">
                        <p className="text-sm font-medium text-gray-900">Renouvellements:</p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {cycle.renewals.map((renewal) => {
                          const isLastRenewal = renewal.index === cycle.nb_renouvellements;
                          
                          // Générer les données JSON pour les QR codes
                          const qrCodeDataRenewal = JSON.stringify({
                            renewalId: renewal.id,
                            type: "RENEWAL",
                          });
                          
                          const qrCodeDataEnd = JSON.stringify({
                            renewalId: renewal.id,
                            type: "RENEWAL_END",
                          });

                          return (
                            <div
                              key={renewal.id}
                              className="text-xs border rounded p-3 bg-white print:break-inside-avoid"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-medium text-gray-900">R{renewal.index}</div>
                                {editingRenewal === renewal.id ? (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleUpdateRenewalDate(renewal.id)}
                                      disabled={updatingRenewal}
                                      className="px-2 py-0.5 text-[10px] bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 no-print"
                                      title="Enregistrer"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      onClick={handleCancelEditRenewal}
                                      disabled={updatingRenewal}
                                      className="px-2 py-0.5 text-[10px] bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 no-print"
                                      title="Annuler"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleStartEditRenewal(renewal.id, renewal.date_theorique)}
                                    className="px-2 py-0.5 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700 no-print"
                                    title="Modifier la date"
                                  >
                                    ✏️
                                  </button>
                                )}
                              </div>
                              {editingRenewal === renewal.id ? (
                                <div className="mb-2">
                                  <input
                                    type="date"
                                    value={renewalNewDate}
                                    onChange={(e) => setRenewalNewDate(e.target.value)}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    disabled={updatingRenewal}
                                  />
                                </div>
                              ) : (
                                <div className="text-gray-500 mb-2">
                                  {format(new Date(renewal.date_theorique), "dd/MM/yyyy", {
                                    locale: fr,
                                  })}
                                </div>
                              )}
                              <div className="mb-2">
                                <span
                                  className={`px-1 py-0.5 text-xs rounded ${
                                    STATUT_COLORS[renewal.statut] || "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {STATUT_LABELS[renewal.statut] || renewal.statut}
                                </span>
                              </div>
                              {renewal.statut === "TERMINE" && (
                                <div className="text-xs text-gray-700 mb-2 px-2 py-1 bg-gray-50 rounded border border-gray-100">
                                  <span className="font-medium text-gray-600">Terminé par : </span>
                                  {renewal.completedOperator?.prenom ?? renewal.completedBy?.prenom ?? "—"}
                                </div>
                              )}
                              
                              {/* QR Codes */}
                              <div className="mt-3 space-y-2">
                                <div>
                                  <div className="flex items-center justify-between mb-1 no-print">
                                    <div className="text-[9px] font-medium text-gray-700">Renouvellement</div>
                                    <button
                                      onClick={() => generateQRCodePDFForRenewal(renewal, isLastRenewal ? "RENEWAL_END" : "RENEWAL")}
                                      disabled={generatingPDF === renewal.id}
                                      className="px-2 py-0.5 text-[8px] border border-green-300 rounded text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Imprimer le QR code"
                                    >
                                      {generatingPDF === renewal.id ? "..." : "📱 Imprimer"}
                                    </button>
                                  </div>
                                  <div className="bg-white p-2 border-2 border-gray-300 rounded print:border-black">
                                    <QRCodeSVG
                                      value={qrCodeDataRenewal}
                                      size={100}
                                      level="M"
                                      includeMargin={true}
                                    />
                                  </div>
                                  
                                  {/* Informations patient sous le QR code */}
                                  <div className="mt-2 text-center space-y-0.5">
                                    <div className="text-[8px] font-semibold text-gray-900">
                                      {patient.nom.toUpperCase()} {patient.prenom}
                                    </div>
                                    <div className="text-[7px] text-gray-700">
                                      📞 {patient.telephone_normalise}
                                    </div>
                                    <div className="text-[7px] text-gray-600">
                                      Date: {format(new Date(renewal.date_theorique), "dd/MM/yyyy", { locale: fr })}
                                    </div>
                                    {isLastRenewal && (
                                      <div className="text-[7px] font-semibold text-red-700 mt-1">
                                        ⚠️ DERNIÈRE ORDO
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {isLastRenewal && (
                                  <div className="border-t pt-2 mt-2">
                                    <div className="flex items-center justify-between mb-1 no-print">
                                      <div className="text-[9px] font-medium text-red-700">⚠️ Fin ordonnance</div>
                                      <button
                                        onClick={() => generateQRCodePDFForRenewal(renewal, "RENEWAL_END")}
                                        disabled={generatingPDF === renewal.id}
                                        className="px-2 py-0.5 text-[8px] border border-red-300 rounded text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Imprimer le QR code fin ordonnance"
                                      >
                                        {generatingPDF === renewal.id ? "..." : "📱 Imprimer"}
                                      </button>
                                    </div>
                                    <div className="bg-white p-2 border-2 border-red-300 rounded print:border-black">
                                      <QRCodeSVG
                                        value={qrCodeDataEnd}
                                        size={100}
                                        level="M"
                                        includeMargin={true}
                                      />
                                    </div>
                                    
                                    {/* Informations patient sous le QR code fin ordonnance */}
                                    <div className="mt-2 text-center space-y-0.5">
                                      <div className="text-[8px] font-semibold text-gray-900">
                                        {patient.nom.toUpperCase()} {patient.prenom}
                                      </div>
                                      <div className="text-[7px] text-gray-700">
                                        📞 {patient.telephone_normalise}
                                      </div>
                                      <div className="text-[7px] text-gray-600">
                                        {format(new Date(renewal.date_theorique), "dd/MM/yyyy", { locale: fr })}
                                      </div>
                                      <div className="text-[7px] font-semibold text-red-700 mt-1">
                                        ⚠️ DERNIÈRE ORDO
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
