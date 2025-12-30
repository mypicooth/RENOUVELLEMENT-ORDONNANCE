"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";

interface Renewal {
  id: string;
  index: number;
  date_theorique: string;
  statut: string;
}

interface Cycle {
  id: string;
  date_premiere_delivrance: string;
  nb_renouvellements: number;
  intervalle_jours: number;
  statut: string;
  renewals: Renewal[];
}

interface Patient {
  id: string;
  nom: string;
  prenom: string;
  telephone_normalise: string;
  cycles: Cycle[];
}

const STATUT_LABELS: Record<string, string> = {
  A_PREPARER: "À préparer",
  EN_PREPARATION: "En préparation",
  PRET: "Prêt",
  SMS_ENVOYE: "SMS envoyé",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

export default function QRCodesPage() {
  const params = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    
    const loadPatient = async () => {
      try {
        const res = await fetch(`/api/patients/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setPatient(data);
          // Sélectionner le premier cycle actif par défaut
          const activeCycle = data.cycles?.find((c: Cycle) => c.statut === "ACTIF");
          if (activeCycle) {
            setSelectedCycleId(activeCycle.id);
          } else if (data.cycles?.length > 0) {
            setSelectedCycleId(data.cycles[0].id);
          }
        }
      } catch (error) {
        console.error("Erreur chargement patient:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPatient();
  }, [params.id]);

  const selectedCycle = patient?.cycles.find((c) => c.id === selectedCycleId);

  const handlePrint = () => {
    window.print();
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
          <div className="mb-6 no-print">
            <button
              onClick={() => router.back()}
              className="text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              ← Retour
            </button>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">
                QR Codes - {patient.prenom} {patient.nom}
              </h1>
              <div className="flex gap-2">
                {patient.cycles.length > 1 && (
                  <select
                    value={selectedCycleId || ""}
                    onChange={(e) => setSelectedCycleId(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {patient.cycles.map((cycle) => (
                      <option key={cycle.id} value={cycle.id}>
                        R0: {format(new Date(cycle.date_premiere_delivrance), "dd/MM/yyyy", { locale: fr })}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  🖨️ Imprimer
                </button>
              </div>
            </div>
          </div>

          {!selectedCycle ? (
            <div className="text-center py-8 text-gray-500">
              Aucun cycle sélectionné
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="mb-4 print:hidden">
                <h2 className="text-lg font-semibold mb-2">
                  Cycle R0: {format(new Date(selectedCycle.date_premiere_delivrance), "dd/MM/yyyy", { locale: fr })}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedCycle.nb_renouvellements} renouvellement(s) - Intervalle: {selectedCycle.intervalle_jours || 21} jours
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 print:gap-2">
                {selectedCycle.renewals.map((renewal) => {
                  const isLastRenewal = renewal.index === selectedCycle.nb_renouvellements;
                  
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
                      className="border rounded-lg p-4 print:break-inside-avoid print:border-black print:shadow-none"
                    >
                      <div className="text-center mb-3 print:mb-2">
                        <div className="font-bold text-lg text-gray-900 print:text-base">R{renewal.index}</div>
                        <div className="text-sm text-gray-600 print:text-xs">
                          {format(new Date(renewal.date_theorique), "dd/MM/yyyy", { locale: fr })}
                        </div>
                        <div className="mt-1 print:hidden">
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                            {STATUT_LABELS[renewal.statut] || renewal.statut}
                          </span>
                        </div>
                      </div>

                      {/* QR Code Renouvellement */}
                      <div className="mb-3">
                        <div className="text-xs font-medium text-gray-700 mb-2 text-center">
                          Renouvellement
                        </div>
                        <div className="bg-white p-3 border-2 border-gray-400 rounded print:border-black flex justify-center">
                          <QRCodeSVG
                            value={qrCodeDataRenewal}
                            size={150}
                            level="M"
                            includeMargin={true}
                          />
                        </div>
                        
                        {/* Informations patient sous le QR code */}
                        <div className="mt-2 text-center space-y-1 print:space-y-0.5">
                          <div className="text-[10px] font-semibold text-gray-900 print:text-[9px] print:font-bold">
                            {patient.nom.toUpperCase()} {patient.prenom}
                          </div>
                          <div className="text-[9px] text-gray-700 print:text-[8px]">
                            📞 {patient.telephone_normalise}
                          </div>
                          <div className="text-[9px] text-gray-600 print:text-[8px]">
                            Date du renouvellement: {format(new Date(renewal.date_theorique), "dd/MM/yyyy", { locale: fr })}
                          </div>
                          {isLastRenewal && (
                            <div className="text-[9px] font-semibold text-red-700 mt-1 print:text-[8px] print:mt-0.5">
                              ⚠️ DERNIÈRE ORDONNANCE
                            </div>
                          )}
                        </div>
                      </div>

                      {/* QR Code Fin ordonnance (si dernier renouvellement) */}
                      {isLastRenewal && (
                        <div className="border-t pt-3 mt-3">
                          <div className="text-xs font-medium text-red-700 mb-2 text-center">
                            ⚠️ Fin ordonnance
                          </div>
                          <div className="bg-white p-3 border-2 border-red-400 rounded print:border-black flex justify-center">
                            <QRCodeSVG
                              value={qrCodeDataEnd}
                              size={150}
                              level="M"
                              includeMargin={true}
                            />
                          </div>
                          
                          {/* Informations patient sous le QR code fin ordonnance */}
                          <div className="mt-2 text-center space-y-1 print:space-y-0.5">
                            <div className="text-[10px] font-semibold text-gray-900 print:text-[9px] print:font-bold">
                              {patient.nom.toUpperCase()} {patient.prenom}
                            </div>
                            <div className="text-[9px] text-gray-700 print:text-[8px]">
                              📞 {patient.telephone_normalise}
                            </div>
                            <div className="text-[9px] text-gray-600 print:text-[8px]">
                              Date: {format(new Date(renewal.date_theorique), "dd/MM/yyyy", { locale: fr })}
                            </div>
                            <div className="text-[9px] font-semibold text-red-700 mt-1 print:text-[8px] print:mt-0.5">
                              ⚠️ DERNIÈRE ORDONNANCE
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md print:hidden">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  Instructions :
                </h3>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Imprimez cette page pour chaque cycle de renouvellement</li>
                  <li>Découpez chaque QR code et collez-le sur le sachet correspondant</li>
                  <li>Le QR code &quot;Renouvellement&quot; recalcule automatiquement le prochain renouvellement (+21 jours)</li>
                  <li>Le QR code &quot;Fin ordonnance&quot; termine le cycle (uniquement sur le dernier renouvellement)</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

