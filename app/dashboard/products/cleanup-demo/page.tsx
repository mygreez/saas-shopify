// ============================================
// Page: Supprimer les produits de démonstration
// ============================================

'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function CleanupDemoProductsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; deletedCount?: number } | null>(null);

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer tous les produits de démonstration "ff" avec le prix 12€ ?')) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/products/cleanup-demo', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: data.message,
          deletedCount: data.deletedCount,
        });
      } else {
        setResult({
          success: false,
          message: data.error || 'Erreur lors de la suppression',
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Erreur de connexion',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-4">Supprimer les produits de démonstration</h1>
          
          <p className="text-gray-600 mb-6">
            Cette action supprimera tous les produits avec le nom "ff" et le prix 12€.
          </p>

          {result && (
            <div
              className={`mb-4 p-4 rounded-lg ${
                result.success
                  ? 'bg-green-100 border border-green-400 text-green-700'
                  : 'bg-red-100 border border-red-400 text-red-700'
              }`}
            >
              {result.message}
              {result.deletedCount !== undefined && (
                <p className="mt-2 font-semibold">{result.deletedCount} produit(s) supprimé(s)</p>
              )}
            </div>
          )}

          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {loading ? 'Suppression...' : 'Supprimer les produits de démonstration'}
          </button>

          <button
            onClick={() => router.back()}
            className="ml-4 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
          >
            Retour
          </button>
        </div>
      </div>
    </div>
  );
}

