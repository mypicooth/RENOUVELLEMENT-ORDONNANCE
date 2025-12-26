"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { normalizePhone } from "@/lib/phone";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

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

      // Rediriger vers la fiche patient
      router.push(`/patients/${data.patient.id}`);
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
                    onChange={(e) =>
                      setFormData({ ...formData, nom: e.target.value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
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
                    Le patient autorise la conservation de l'ordonnance + l'envoi de SMS *
                  </span>
                </label>
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

