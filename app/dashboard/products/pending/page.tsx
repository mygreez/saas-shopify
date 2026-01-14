// ============================================
// Page: Produits en Attente de Validation (Admin)
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  category: string | null;
  price: number | null;
  status: string;
  images: string[];
  created_at: string;
  partner: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

export default function PendingProductsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchPendingProducts();
    }
  }, [session]);

  const fetchPendingProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products/pending');
      const data = await response.json();

      if (data.success) {
        setProducts(data.data || []);
      } else {
        setError(data.error || 'Erreur lors du chargement');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.success) {
        fetchPendingProducts();
      } else {
        alert(data.error || 'Erreur lors de l\'approbation');
      }
    } catch (err) {
      alert('Erreur de connexion');
    }
  };

  const handleReject = async (productId: string) => {
    const comment = prompt('Raison du refus (requis):');
    if (!comment) return;

    try {
      const response = await fetch(`/api/products/${productId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      });

      const data = await response.json();

      if (data.success) {
        fetchPendingProducts();
      } else {
        alert(data.error || 'Erreur lors du rejet');
      }
    } catch (err) {
      alert('Erreur de connexion');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Produits en Attente</h1>
        <p className="text-gray-600">
          {products.length} produit{products.length > 1 ? 's' : ''} en attente de validation
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {products.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 text-lg">Aucun produit en attente</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Image */}
              <div className="h-48 bg-gray-200 flex items-center justify-center">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400">Aucune image</span>
                )}
              </div>

              {/* Contenu */}
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
                {product.category && (
                  <p className="text-sm text-gray-600 mb-1">
                    Catégorie: {product.category}
                  </p>
                )}
                {product.price && (
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    {product.price.toFixed(2)} €
                  </p>
                )}
                {product.partner && (
                  <p className="text-xs text-gray-500 mb-4">
                    Par: {product.partner.name || product.partner.email}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <Link
                    href={`/dashboard/products/${product.id}`}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-center text-sm"
                  >
                    Voir détails
                  </Link>
                  <button
                    onClick={() => handleApprove(product.id)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    Approuver
                  </button>
                  <button
                    onClick={() => handleReject(product.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}




