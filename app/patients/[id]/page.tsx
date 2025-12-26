"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { UserRole } from "@/lib/types";

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
    statut: string;
    renewals: Array<{
      id: string;
      index: number;
      date_theorique: string;
      statut: string;
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
  const isAdmin = session?.user.role === UserRole.ADMIN;

  useEffect(() => {
    if (params.id) {
      loadPatient();
    }
  }, [params.id]);

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

  const loadPatient = async () => {
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
  };

  const handleSave = async () => {
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
            <div className="mb-4 flex gap-2">
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
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
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
                      Le patient autorise la conservation de l'ordonnance + l'envoi de SMS *
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
                  <dd className="mt-1 text-sm text-gray-900">
                    {patient.telephone_normalise}
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

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Cycles de prescription</h2>
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
                          {cycle.nb_renouvellements} renouvellement(s) - Intervalle: 21
                          jours
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          cycle.statut === "ACTIF"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {cycle.statut}
                      </span>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2 text-gray-900">Renouvellements:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {cycle.renewals.map((renewal) => (
                          <div
                            key={renewal.id}
                            className="text-xs border rounded p-2 bg-white"
                          >
                            <div className="font-medium text-gray-900">R{renewal.index}</div>
                            <div className="text-gray-500">
                              {format(new Date(renewal.date_theorique), "dd/MM/yyyy", {
                                locale: fr,
                              })}
                            </div>
                            <div className="mt-1">
                              <span
                                className={`px-1 py-0.5 text-xs rounded ${
                                  STATUT_COLORS[renewal.statut] || "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {STATUT_LABELS[renewal.statut] || renewal.statut}
                              </span>
                            </div>
                          </div>
                        ))}
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
