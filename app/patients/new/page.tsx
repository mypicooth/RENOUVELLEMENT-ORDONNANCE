"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { normalizePhone } from "@/lib/phone";
import SignatureCanvas from "react-signature-canvas";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function NewPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    telephone: "",
    consentement: false,
    notes: "",
    date_premiere_delivrance: "",
    nb_renouvellements: "",
    intervalle_jours: "21",
  });
  const [showConsentSignature, setShowConsentSignature] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [consentEndDate, setConsentEndDate] = useState("");
  const [useRevocation, setUseRevocation] = useState(false);
  const signatureRef = useRef<SignatureCanvas>(null);
  const [duplicatePatients, setDuplicatePatients] = useState<Array<{
    id: string;
    nom: string;
    prenom: string;
    telephone_normalise: string;
    date_recrutement: string;
  }>>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // Vérifier les doublons par nom de famille
  const checkDuplicates = useCallback(async (nom: string) => {
    if (!nom || nom.trim().length < 2) {
      setDuplicatePatients([]);
      return;
    }

    setCheckingDuplicates(true);
    try {
      const res = await fetch(`/api/patients/check-duplicate?nom=${encodeURIComponent(nom.trim())}`);
      if (res.ok) {
        const duplicates = await res.json();
        setDuplicatePatients(duplicates);
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
    
    debounceTimeout.current = setTimeout(() => {
      checkDuplicates(value);
    }, 500); // Attendre 500ms après la dernière frappe
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Vérifier les doublons avant de créer
    if (duplicatePatients.length > 0) {
      const confirmMessage = `⚠️ Attention : ${duplicatePatients.length} patient(s) avec le nom "${formData.nom}" existe(nt) déjà.\n\n` +
        duplicatePatients.map((p) => `- ${p.prenom} ${p.nom} (${p.telephone_normalise})`).join("\n") +
        `\n\nVoulez-vous vraiment créer un nouveau patient ?`;
      
      if (!confirm(confirmMessage)) {
        setLoading(false);
        return;
      }
    }

    // Validation
    if (!formData.consentement) {
      setError("Le consentement est obligatoire");
      setLoading(false);
      return;
    }

    const phoneNormalized = normalizePhone(formData.telephone);
    if (!phoneNormalized) {
      setError("Numéro de téléphone invalide");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          nb_renouvellements: formData.nb_renouvellements
            ? parseInt(formData.nb_renouvellements)
            : undefined,
          intervalle_jours: formData.intervalle_jours
            ? parseInt(formData.intervalle_jours)
            : 21,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de la création");
        setLoading(false);
        return;
      }

      const patientId = data.patient.id;

      // Si une signature de consentement a été fournie, créer le consentement
      if (showConsentSignature && signatureRef.current && !signatureRef.current.isEmpty()) {
        try {
          const signatureData = signatureRef.current.toDataURL();
          
          const consentRes = await fetch(`/api/patients/${patientId}/consents`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              signatureImage: signatureData,
              endDate: useRevocation ? null : consentEndDate,
              useRevocation,
            }),
          });

          if (consentRes.ok) {
            const consent = await consentRes.json();
            // Générer le PDF
            await fetch(`/api/patients/${patientId}/consents/${consent.id}/generate-pdf`, {
              method: "POST",
            });
          }
        } catch (err) {
          console.error("Erreur création consentement:", err);
          // Continuer même si le consentement échoue
        }
      }

      // Rediriger vers la fiche patient
      router.push(`/patients/${patientId}`);
    } catch (err) {
      setError("Une erreur est survenue");
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-4 sm:px-6 lg:px-8 max-w-3xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Recrutement patient
          </h1>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) => handleNomChange(e.target.value)}
                    className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      duplicatePatients.length > 0
                        ? "border-yellow-400 bg-yellow-50"
                        : "border-gray-300"
                    }`}
                    placeholder="Nom de famille"
                  />
                  {checkingDuplicates && (
                    <p className="mt-1 text-xs text-gray-500">Vérification des doublons...</p>
                  )}
                  {duplicatePatients.length > 0 && !checkingDuplicates && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm font-medium text-yellow-800 mb-2">
                        ⚠️ {duplicatePatients.length} patient(s) avec le nom &quot;{formData.nom}&quot; existe(nt) déjà :
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
                      <p className="mt-2 text-xs text-yellow-700">
                        Vous pouvez continuer la création si c&apos;est un patient différent.
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.prenom}
                    onChange={(e) =>
                      setFormData({ ...formData, prenom: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Téléphone *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="06 12 34 56 78 ou +33 6 12 34 56 78"
                  value={formData.telephone}
                  onChange={(e) =>
                    setFormData({ ...formData, telephone: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    required
                    checked={formData.consentement}
                    onChange={(e) =>
                      setFormData({ ...formData, consentement: e.target.checked })
                    }
                    className="mt-1 mr-3"
                  />
                  <span className="text-sm text-gray-700">
                    Le patient autorise la conservation de l&apos;ordonnance + l&apos;envoi de SMS *
                  </span>
                </label>
              </div>

              {/* Section Autorisation de conservation d'ordonnance */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-gray-900">
                    Autorisation de conservation d&apos;ordonnance
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowConsentSignature(!showConsentSignature)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showConsentSignature ? "Masquer" : "Faire signer maintenant"}
                  </button>
                </div>

                {showConsentSignature && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4 space-y-4">
                    <div className="text-sm text-gray-700">
                      <p className="font-semibold mb-2">Aperçu du document :</p>
                      <div className="bg-white border border-gray-200 rounded p-3 text-xs max-h-40 overflow-y-auto">
                        <p className="font-semibold mb-1">
                          AUTORISATION DE CONSERVATION D&apos;ORDONNANCE
                        </p>
                        <p className="mb-2">Pharmacie Saint Laurent – 73 rue Romain Rolland, 97419 La Possession</p>
                        <p className="mb-1">Nom : {formData.nom || "[Nom]"}</p>
                        <p className="mb-1">Prénom : {formData.prenom || "[Prénom]"}</p>
                        <p className="mb-1">Téléphone : {formData.telephone || "[Téléphone]"}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          (Document complet disponible après signature)
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={useRevocation}
                            onChange={(e) => setUseRevocation(e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">
                            Jusqu&apos;à révocation (pas de date de fin)
                          </span>
                        </label>
                      </div>
                      {!useRevocation && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date de fin (format: JJ/MM/AAAA)
                          </label>
                          <input
                            type="text"
                            value={consentEndDate}
                            onChange={(e) => setConsentEndDate(e.target.value)}
                            placeholder="31/12/2026"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Signature du patient
                      </label>
                      <div className="border-2 border-gray-300 rounded-lg p-2 bg-white">
                        <SignatureCanvas
                          ref={signatureRef}
                          canvasProps={{
                            className: "signature-canvas w-full",
                            width: 600,
                            height: 150,
                          }}
                          backgroundColor="white"
                          penColor="black"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => signatureRef.current?.clear()}
                        className="mt-2 px-3 py-1 text-xs border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Effacer la signature
                      </button>
                    </div>

                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="consent-accept"
                        checked={consentAccepted}
                        onChange={(e) => setConsentAccepted(e.target.checked)}
                        className="mt-1 mr-3"
                      />
                      <label htmlFor="consent-accept" className="text-sm text-gray-700">
                        J&apos;ai lu et j&apos;accepte les conditions de cette autorisation de conservation d&apos;ordonnance.
                      </label>
                    </div>

                    <p className="text-xs text-gray-500">
                      💡 Si vous ne signez pas maintenant, vous pourrez le faire plus tard depuis la fiche patient.
                    </p>
                  </div>
                )}

                {!showConsentSignature && (
                  <p className="text-sm text-gray-500">
                    Vous pourrez faire signer l&apos;autorisation après la création du patient depuis sa fiche.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="border-t pt-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Cycle de renouvellement (optionnel)
                </h2>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Date 1ère délivrance (R0)
                    </label>
                    <input
                      type="date"
                      value={formData.date_premiere_delivrance}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          date_premiere_delivrance: e.target.value,
                        })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nombre de renouvellements
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.nb_renouvellements}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nb_renouvellements: e.target.value,
                        })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Intervalle (jours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.intervalle_jours}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          intervalle_jours: e.target.value,
                        })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Création..." : "Créer"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

