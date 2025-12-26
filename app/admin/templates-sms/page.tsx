"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { UserRole } from "@/lib/types";

interface SmsTemplate {
  id: string;
  code: string;
  libelle: string;
  message: string;
  actif: boolean;
}

export default function TemplatesSmsPage() {
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    libelle: "",
    message: "",
    actif: true,
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/templates-sms");
      const data = await res.json();
      setTemplates(data);
    } catch (error) {
      console.error("Erreur chargement templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.message.length > 160) {
      alert("Le message ne doit pas dépasser 160 caractères");
      return;
    }

    try {
      const url = editing
        ? `/api/admin/templates-sms/${editing}`
        : "/api/admin/templates-sms";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setEditing(null);
        setFormData({ code: "", libelle: "", message: "", actif: true });
        loadTemplates();
      } else {
        const data = await res.json();
        alert(data.error || "Erreur");
      }
    } catch (error) {
      alert("Erreur lors de la sauvegarde");
    }
  };

  const handleEdit = (template: SmsTemplate) => {
    setEditing(template.id);
    setFormData({
      code: template.code,
      libelle: template.libelle,
      message: template.message,
      actif: template.actif,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce template ?")) return;

    try {
      const res = await fetch(`/api/admin/templates-sms/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadTemplates();
      }
    } catch (error) {
      alert("Erreur lors de la suppression");
    }
  };

  return (
    <ProtectedRoute requiredRole={UserRole.ADMIN}>
      <Layout>
        <div className="px-4 sm:px-6 lg:px-8 max-w-5xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Templates SMS
          </h1>

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">
              {editing ? "Modifier" : "Nouveau"} template
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Code *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editing}
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  placeholder="RENOUVELLEMENT_PRET"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Libellé *
                </label>
                <input
                  type="text"
                  required
                  value={formData.libelle}
                  onChange={(e) =>
                    setFormData({ ...formData, libelle: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Message * (≤ 160 caractères)
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={160}
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.message.length}/160 caractères
                </p>
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.actif}
                    onChange={(e) =>
                      setFormData({ ...formData, actif: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Actif</span>
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  {editing ? "Modifier" : "Créer"}
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(null);
                      setFormData({
                        code: "",
                        libelle: "",
                        message: "",
                        actif: true,
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </form>
          </div>

          {loading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Libellé
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Message
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {templates.map((template) => (
                    <tr key={template.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {template.code}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {template.libelle}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {template.message}
                      </td>
                      <td className="px-4 py-3">
                        {template.actif ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Actif
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Inactif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        <button
                          onClick={() => handleEdit(template)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

