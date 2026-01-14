// ============================================
// Page: Visualisation Fiche Produit Partenaire
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PartnerProductViewPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const productId = params.product_id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<any>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/partner/product/${token}/${productId}`);
        const data = await response.json();

        if (data.success && data.data) {
          setProduct(data.data);
        } else {
          setError(data.error || 'Produit non trouvé');
        }
      } catch (err: any) {
        console.error('Erreur:', err);
        setError(err.message || 'Erreur de connexion');
      } finally {
        setLoading(false);
      }
    };

    if (token && productId) {
      fetchProduct();
    }
  }, [token, productId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md">
          <h1 className="text-xl font-bold text-red-600 mb-2">Erreur</h1>
          <p className="text-gray-600 mb-4">{error || 'Produit non trouvé'}</p>
          <Link
            href={`/partner/${token}/dashboard`}
            className="text-[#1b6955] hover:text-[#165544] underline"
          >
            ← Retour au dashboard
          </Link>
        </div>
      </div>
    );
  }

  const images = product.images || [];
  const mainImage = images[selectedImageIndex] || images[0] || '/placeholder-product.jpg';
  const title = product.product_details?.title || product.name || 'Produit sans nom';
  const description = product.product_details?.description || product.generated_content?.long_description || product.description || 'Aucune description disponible';
  const price = product.product_details?.price_greez_ttc || product.price || 0;
  const category = product.category || product.product_details?.product_type || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Bouton retour */}
        <Link
          href={`/partner/${token}/dashboard`}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour au dashboard
        </Link>

        {/* Contenu principal */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Section Images */}
            <div className="space-y-4">
              {/* Image principale */}
              <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden group">
                <img
                  src={mainImage}
                  alt={title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {images.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                    <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Miniatures */}
              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {images.map((image: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImageIndex === index
                          ? 'border-blue-600 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${title} - Vue ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Section Informations */}
            <div className="flex flex-col justify-center space-y-6">
              {/* Catégorie */}
              {category && (
                <div className="text-sm font-medium text-[#1b6955] uppercase tracking-wide">
                  {category}
                </div>
              )}

              {/* Titre */}
              <h1 className="text-4xl font-bold text-gray-900 leading-tight">
                {title}
              </h1>

              {/* Prix */}
              <div className="flex items-baseline space-x-3">
                <span className="text-4xl font-bold text-gray-900">
                  {price.toFixed(2)} €
                </span>
                <span className="text-sm text-gray-500">TTC</span>
              </div>

              {/* Description */}
              <div className="prose max-w-none">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {description}
                </p>
              </div>

              {/* Informations supplémentaires */}
              <div className="border-t border-gray-200 pt-6 space-y-4">
                {product.product_details?.sku && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Référence</span>
                    <span className="font-medium text-gray-900">{product.product_details.sku}</span>
                  </div>
                )}
                {product.product_details?.quantity_uvc && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stock disponible</span>
                    <span className="font-medium text-gray-900">{product.product_details.quantity_uvc} unités</span>
                  </div>
                )}
                {product.weight && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Poids</span>
                    <span className="font-medium text-gray-900">{product.weight} kg</span>
                  </div>
                )}
              </div>

              {/* Badge statut et icône export */}
              <div className="pt-4 flex items-center gap-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  product.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                  product.status === 'pending' ? 'bg-[#1b6955]/10 text-[#1b6955]' :
                  product.status === 'approved' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {product.status === 'draft' ? 'Brouillon' :
                   product.status === 'pending' ? 'En attente de validation' :
                   product.status === 'approved' ? 'Approuvé' :
                   product.status}
                </span>
                
                {/* Icône verte si exporté vers Shopify */}
                {(product.raw_data?.shopify_exported || product.raw_data?.shopify_exported_at) && (
                  <div className="flex items-center gap-2 text-green-600" title="Exporté vers Shopify">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">Exporté</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

