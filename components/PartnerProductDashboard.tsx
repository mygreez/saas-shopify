'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PartnerProductForm from './PartnerProductForm';

interface PartnerProductDashboardProps {
  token: string;
  submission: any;
  products: any[];
  onProductAdded: (product: any) => void;
}

export default function PartnerProductDashboard({
  token,
  submission,
  products,
  onProductAdded,
}: PartnerProductDashboardProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFormSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/partner/create-product', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Produit ajouté avec succès !');
        setShowForm(false);
        // Rafraîchir la liste des produits immédiatement
        try {
          const productsResponse = await fetch(`/api/partner/products/${token}`);
          const productsData = await productsResponse.json();
          if (productsData.success) {
            // Mettre à jour la liste via le callback parent
            onProductAdded(productsData.data || []);
          }
        } catch (refreshError) {
          console.error('Erreur rafraîchissement produits:', refreshError);
          // Appeler quand même le callback avec le produit créé
          onProductAdded(data.data);
        }
        // Rediriger vers la page de visualisation du produit
        setTimeout(() => {
          router.push(`/partner/${token}/product/${data.data.id}`);
        }, 1000);
      } else {
        // Afficher l'erreur avec les détails si disponibles
        const errorMessage = data.error || 'Erreur lors de l\'ajout du produit';
        const errorDetails = data.details ? (Array.isArray(data.details) ? data.details.join(', ') : data.details) : '';
        setError(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
        console.error('Erreur API:', data);
      }
    } catch (err: any) {
      console.error('Erreur:', err);
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <div className="font-semibold mb-2">Erreur</div>
          <div className="text-sm whitespace-pre-wrap">{error}</div>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      {/* Bouton ajouter produit */}
      {!showForm && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="bg-[#1b6955] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#165544] transition-colors"
          >
            + Ajouter un produit
          </button>
        </div>
      )}

      {/* Formulaire d'ajout */}
      {showForm && submission && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <PartnerProductForm
            token={token}
            submissionId={submission.id}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowForm(false);
              setError(null);
              setSuccess(null);
            }}
            loading={loading}
          />
        </div>
      )}

      {/* Liste des produits */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Mes produits ({products.length})</h2>
        
        {products.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucun produit ajouté pour le moment</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const isExported = product.raw_data?.shopify_exported || product.raw_data?.shopify_exported_at;
              
              return (
              <div
                key={product.id}
                onClick={() => router.push(`/partner/${token}/product/${product.id}`)}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer transform hover:scale-105 relative"
              >
                {/* Icône verte si exporté */}
                {isExported && (
                  <div className="absolute top-3 right-3 bg-green-500 rounded-full p-2 shadow-lg z-10" title="Exporté vers Shopify">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <h3 className="font-bold text-lg mb-2 text-gray-900">
                  {product.product_details?.title || product.name}
                </h3>
                <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                  {product.product_details?.description || product.description || product.generated_content?.long_description || 'Aucune description'}
                </p>
                <p className="text-[#1b6955] font-bold text-lg">
                  {product.product_details?.price_greez_ttc || product.price || 0} €
                </p>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
