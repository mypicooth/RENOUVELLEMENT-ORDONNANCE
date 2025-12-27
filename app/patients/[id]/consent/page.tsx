"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useRef, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import SignatureCanvas from "react-signature-canvas";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Patient {
  id: string;
  nom: string;
  prenom: string;
  telephone_normalise: string;
}

export default function ConsentSignaturePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [useRevocation, setUseRevocation] = useState(false);
  const [error, setError] = useState("");

  const signatureRef = useRef<SignatureCanvas>(null);

  // Charger les données du patient
  const loadPatient = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}`);
      if (res.ok) {
        const data = await res.json();
        setPatient(data);
      }
    } catch (err) {
      console.error("Erreur chargement patient:", err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadPatient();
  }, [loadPatient]);

  const handleClear = () => {
    signatureRef.current?.clear();
  };

  const handleSubmit = async () => {
    if (!accepted) {
      setError("Veuillez accepter les conditions");
      return;
    }

    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      setError("Veuillez signer le document");
      return;
    }

    if (!useRevocation && !endDate) {
      setError("Veuillez renseigner une date de fin ou choisir 'jusqu'à révocation'");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Récupérer la signature en base64
      const signatureData = signatureRef.current.toDataURL();

      // Créer le consentement
      const res = await fetch(`/api/patients/${patientId}/consents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureImage: signatureData,
          endDate: useRevocation ? null : endDate,
          useRevocation,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la création");
      }

      const consent = await res.json();

      // Générer le PDF
      await fetch(`/api/patients/${patientId}/consents/${consent.id}/generate-pdf`, {
        method: "POST",
      });

      // Rediriger vers la fiche patient
      router.push(`/patients/${patientId}`);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la soumission");
    } finally {
      setSubmitting(false);
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
          <div className="text-center py-8 text-red-600">Patient non trouvé</div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const todayDate = format(new Date(), "dd/MM/yyyy", { locale: fr });

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => router.push(`/patients/${patientId}`)}
              className="text-blue-600 hover:text-blue-800 mb-4"
            >
              ← Retour à la fiche patient
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Autorisation de conservation d&apos;ordonnance
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Patient : {patient.prenom} {patient.nom}
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Aperçu du document</h2>
            <div className="border border-gray-200 rounded p-4 bg-gray-50 max-h-96 overflow-y-auto text-sm">
              <p className="font-semibold mb-2">
                (Pharmacie Saint Laurent – La Possession)
              </p>
              <p className="font-semibold mb-4">
                AUTORISATION DE CONSERVATION D&apos;ORDONNANCE (COPIE / ORIGINAL SELON PROCÉDURE)
              </p>
              <p className="mb-4">
                Pharmacie Saint Laurent – 73 rue Romain Rolland, 97419 La Possession
              </p>

              <p className="font-semibold mb-2">Identité du patient</p>
              <p>Nom : {patient.nom}</p>
              <p>Prénom : {patient.prenom}</p>
              <p>Téléphone : {patient.telephone_normalise}</p>

              <p className="font-semibold mt-4 mb-2">Objet de l&apos;autorisation</p>
              <p className="mb-4">
                Je soussigné(e) {patient.prenom} {patient.nom}, autorise la Pharmacie Saint Laurent à conserver mon ordonnance afin de faciliter la gestion de mes renouvellements et la préparation de mes traitements, dans le cadre du suivi pharmaceutique.
              </p>

              <p className="font-semibold mt-4 mb-2">Durée de conservation</p>
              <p className="mb-4">
                La conservation est limitée à la période utile de renouvellement, et au maximum jusqu&apos;au :{" "}
                {useRevocation ? "jusqu&apos;à révocation" : endDate || "[Date à définir]"}.
              </p>

              <p className="text-xs text-gray-500 mt-4">
                (Document complet disponible après signature)
              </p>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Paramètres</h2>
            <div className="space-y-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={useRevocation}
                    onChange={(e) => setUseRevocation(e.target.checked)}
                    className="mr-2"
                  />
                  <span>Jusqu&apos;à révocation (pas de date de fin)</span>
                </label>
              </div>
              {!useRevocation && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de fin (format: JJ/MM/AAAA)
                  </label>
                  <input
                    type="text"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="31/12/2026"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Signature</h2>
            <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  className: "signature-canvas w-full",
                  width: 800,
                  height: 200,
                }}
                backgroundColor="white"
                penColor="black"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleClear}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Effacer
              </button>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex items-start">
              <input
                type="checkbox"
                id="accept"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 mr-3"
                required
              />
              <label htmlFor="accept" className="text-sm text-gray-700">
                J&apos;ai lu et j&apos;accepte les conditions de cette autorisation de conservation d&apos;ordonnance.
              </label>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => router.push(`/patients/${patientId}`)}
              className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !accepted}
              className="px-6 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Enregistrement..." : "Valider et signer"}
            </button>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

