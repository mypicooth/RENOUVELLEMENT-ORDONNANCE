"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ScanInfo {
  renewal: {
    id: string;
    index: number;
    date_theorique: string;
    statut: string;
    type: string;
  };
  patient: {
    id: string;
    nom: string;
    prenom: string;
  };
  dateDelivrance: string;
  numeroRenouvellement: number;
}

function ScanPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [scanInfo, setScanInfo] = useState<ScanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const renewalId = searchParams.get("renewalId");
    const type = searchParams.get("type");

    if (!renewalId || !type) {
      setError("Paramètres manquants");
      setLoading(false);
      return;
    }

    const loadScanInfo = async () => {
      try {
        const res = await fetch(
          `/api/renewals/scan-info?renewalId=${renewalId}&type=${type}`
        );
        const data = await res.json();

        if (data.success) {
          setScanInfo(data);
        } else {
          setError(data.error || "Erreur lors du chargement");
        }
      } catch (err) {
        setError("Erreur de connexion");
      } finally {
        setLoading(false);
      }
    };

    loadScanInfo();
  }, [searchParams]);

  const handleConfirm = async (confirm: boolean) => {
    if (!scanInfo) return;

    if (!confirm) {
      // Fermer la fenêtre si l'utilisateur refuse
      window.close();
      return;
    }

    setConfirming(true);

    try {
      // Essayer d'abord avec l'API authentifiée, puis avec l'API publique en cas d'échec
      let res = await fetch("/api/renewals/confirm-delivery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          renewalId: scanInfo.renewal.id,
          type: scanInfo.renewal.type,
        }),
      });

      // Si erreur d'authentification, utiliser l'API publique
      if (res.status === 401) {
        res = await fetch("/api/renewals/confirm-delivery-public", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            renewalId: scanInfo.renewal.id,
            type: scanInfo.renewal.type,
          }),
        });
      }

      const data = await res.json();

      if (data.success) {
        setConfirmed(true);
        // Fermer la fenêtre après 2 secondes
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        setError(data.error || "Erreur lors de la confirmation");
        setConfirming(false);
      }
    } catch (err) {
      setError("Erreur de connexion");
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des informations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-center">
            <div className="text-red-600 text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Erreur</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.close()}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-center">
            <div className="text-green-600 text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Délivrance confirmée
            </h2>
            <p className="text-gray-600">
              Les médicaments ont été délivrés avec succès.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!scanInfo) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Confirmation de délivrance
          </h2>
          <div className="w-16 h-1 bg-blue-600 mx-auto"></div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              NOM PRÉNOM
            </label>
            <p className="text-lg font-bold text-gray-800">
              {scanInfo.patient.nom.toUpperCase()} {scanInfo.patient.prenom}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              DATE DE DÉLIVRANCE
            </label>
            <p className="text-lg font-bold text-gray-800">
              {scanInfo.dateDelivrance}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              NUMÉRO DE RENOUVELLEMENT
            </label>
            <p className="text-lg font-bold text-gray-800">
              R{scanInfo.numeroRenouvellement}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-center font-semibold text-gray-700 mb-4">
            VOULEZ-VOUS DÉLIVRER LES MÉDICAMENTS ?
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => handleConfirm(true)}
              disabled={confirming}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {confirming ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>OUI</span>
                </>
              )}
            </button>
            <button
              onClick={() => handleConfirm(false)}
              disabled={confirming}
              className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <span>✗</span>
              <span>NON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      }
    >
      <ScanPageContent />
    </Suspense>
  );
}
