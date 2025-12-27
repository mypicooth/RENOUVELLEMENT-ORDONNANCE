"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { UserRole } from "@/lib/types";

interface ImportResult {
  message: string;
  results: {
    success: number;
    errors: number;
    details: Array<{
      patient: string;
      status: string;
      error?: string;
    }>;
  };
}

export default function ImportPage() {
  const searchParams = useSearchParams();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);
  const [googleImportLoading, setGoogleImportLoading] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleRefreshToken, setGoogleRefreshToken] = useState<string | null>(null);

  // Vérifier l'état de l'authentification Google
  useEffect(() => {
    const checkGoogleAuth = async () => {
      try {
        const res = await fetch("/api/admin/google-calendar/tokens");
        if (res.ok) {
          const data = await res.json();
          if (data.hasAccessToken) {
            setGoogleAccessToken("authenticated"); // Juste un flag, le token est dans les cookies
            setGoogleRefreshToken(data.hasRefreshToken ? "authenticated" : null);
          }
        }
      } catch (err) {
        console.error("Erreur vérification auth Google:", err);
      }
    };

    checkGoogleAuth();

    // Vérifier les paramètres d'URL après l'authentification Google
    const googleAuth = searchParams?.get("google_auth");
    const errorParam = searchParams?.get("error");

    if (googleAuth === "success") {
      // Nettoyer l'URL et recharger l'état
      window.history.replaceState({}, "", "/admin/import");
      checkGoogleAuth();
    } else if (errorParam) {
      setError(`Erreur d'authentification Google: ${errorParam}`);
    }
  }, [searchParams]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError("");
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleAuthLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/google-calendar/auth");
      const data = await res.json();
      if (res.ok && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setError(data.error || "Erreur lors de l'authentification Google");
        setGoogleAuthLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'authentification Google");
      setGoogleAuthLoading(false);
    }
  };

  const handleGoogleImport = async () => {
    if (!googleAccessToken) {
      setError("Veuillez d'abord vous authentifier avec Google");
      return;
    }

    setGoogleImportLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/admin/google-calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeMin: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 an en arrière
          timeMax: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 an en avant
        }),
        credentials: "include", // Important pour envoyer les cookies
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'import depuis Google Calendar");
        return;
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'import depuis Google Calendar");
    } finally {
      setGoogleImportLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Veuillez sélectionner un fichier CSV");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/import-google-calendar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de l&apos;import");
        return;
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l&apos;import");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRole={UserRole.ADMIN}>
      <Layout>
        <div>
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Import depuis Google Calendar
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-gray-600">
              Importez vos renouvellements depuis un export .ics ou CSV de Google Agenda
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Instructions</h2>
            <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-gray-700">
              <li>Allez sur <a href="https://takeout.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Takeout</a></li>
              <li>Sélectionnez uniquement &quot;Calendar&quot; en format iCalendar (.ics)</li>
              <li>Téléchargez et extrayez le fichier ZIP</li>
              <li>Uploadez le fichier .ics ci-dessous</li>
            </ol>
            <p className="mt-3 text-xs text-gray-500">
              Le format .ics (iCalendar) est le format natif d&apos;export de Google Takeout et contient toutes les informations de récurrence.
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
              Import via API Google Calendar
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              Connectez-vous directement à votre Google Calendar pour importer les événements.
            </p>

            {!googleAccessToken ? (
              <div>
                <button
                  onClick={handleGoogleAuth}
                  disabled={googleAuthLoading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {googleAuthLoading ? "Connexion..." : "🔐 Se connecter à Google Calendar"}
                </button>
                <p className="mt-2 text-xs text-gray-500">
                  Vous serez redirigé vers Google pour autoriser l&apos;accès à votre calendrier.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    ✅ Connecté à Google Calendar
                  </p>
                </div>
                <button
                  onClick={handleGoogleImport}
                  disabled={googleImportLoading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {googleImportLoading ? "Import en cours..." : "📥 Importer depuis Google Calendar"}
                </button>
                <button
                  onClick={async () => {
                    try {
                      await fetch("/api/admin/google-calendar/tokens", {
                        method: "DELETE",
                        credentials: "include",
                      });
                      setGoogleAccessToken(null);
                      setGoogleRefreshToken(null);
                    } catch (err) {
                      console.error("Erreur déconnexion:", err);
                    }
                  }}
                  className="ml-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Déconnecter
                </button>
              </div>
            )}
          </div>

          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Importer le fichier</h2>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="file"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Fichier (.ics ou .csv)
                </label>
                <input
                  id="file"
                  type="file"
                  accept=".ics,.csv"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Formats acceptés : .ics (iCalendar) ou .csv exporté depuis Google Calendar
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !file}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Import en cours..." : "Importer"}
              </button>
            </form>

            {result && (
              <div className="mt-6">
                <div
                  className={`p-4 rounded-md mb-4 ${
                    result.results.errors === 0
                      ? "bg-green-50 border border-green-200 text-green-800"
                      : "bg-yellow-50 border border-yellow-200 text-yellow-800"
                  }`}
                >
                  <p className="font-semibold">{result.message}</p>
                  <p className="text-sm mt-1">
                    {result.results.success} importés | {result.results.errors} erreurs
                  </p>
                </div>

                {result.results.details.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                      Détails de l&apos;import :
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                              Patient
                            </th>
                            <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                              Statut
                            </th>
                            <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                              Erreur
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {result.results.details.map((detail, index) => (
                            <tr key={index}>
                              <td className="px-2 sm:px-3 py-2 text-gray-900">
                                {detail.patient}
                              </td>
                              <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                                {detail.status === "Importé" ? (
                                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                    {detail.status}
                                  </span>
                                ) : detail.status === "Ignoré" ? (
                                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                    {detail.status}
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                    {detail.status}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 sm:px-3 py-2 text-gray-600 text-xs">
                                {detail.error || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

