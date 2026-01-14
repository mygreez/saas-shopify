// ============================================
// Composant: Vue boutique - Liste produits + Créer nouveau
// ============================================

'use client';

import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  status: string;
  created_at: string;
  folder_id?: string;
  generated_content?: any;
  images?: string[];
}

interface Folder {
  id: string;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
}

interface ShopViewProps {
  shopDomain: string;
  products: Product[];
  folders?: Folder[];
}

export default function ShopView({ shopDomain, products, folders = [] }: ShopViewProps) {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const handleCreateProduct = () => {
    router.push(`/dashboard/shop/${encodeURIComponent(shopDomain)}/create`);
  };

  const shopName = shopDomain.replace('.myshopify.com', '');

  // Organiser les produits par dossier
  const productsByFolder = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    const noFolder: Product[] = [];

    products.forEach(product => {
      if (product.folder_id) {
        if (!grouped[product.folder_id]) {
          grouped[product.folder_id] = [];
        }
        grouped[product.folder_id].push(product);
      } else {
        noFolder.push(product);
      }
    });

    return { grouped, noFolder };
  }, [products]);

  // Produits filtrés selon le dossier sélectionné
  const filteredProducts = useMemo(() => {
    if (!selectedFolder) return products;
    if (selectedFolder === 'no-folder') return productsByFolder.noFolder;
    return productsByFolder.grouped[selectedFolder] || [];
  }, [selectedFolder, products, productsByFolder]);

  // Données démo si aucun produit
  const demoProducts = [
    {
      id: 'demo-1',
      name: 'T-shirt Premium Bio',
      status: 'published',
      images: [],
      created_at: new Date().toISOString(),
      generated_content: { short_description: 'T-shirt en coton bio, confortable et durable' }
    },
    {
      id: 'demo-2',
      name: 'Sneakers Éco-responsables',
      status: 'draft',
      images: [],
      created_at: new Date().toISOString(),
      generated_content: { short_description: 'Chaussures écologiques pour un style moderne' }
    },
    {
      id: 'demo-3',
      name: 'Sac à dos Voyage',
      status: 'published',
      images: [],
      created_at: new Date().toISOString(),
      generated_content: { short_description: 'Sac spacieux et résistant pour vos aventures' }
    }
  ];

  const displayProducts = products.length > 0 ? filteredProducts : demoProducts;
  const isDemo = products.length === 0;

  return (
    <div>
      {/* Header avec stats */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 bg-black rounded-xl flex items-center justify-center text-white font-bold text-xl">
                {shopName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-3xl font-bold text-black">
                  {shopName}
                </h2>
                <p className="text-black/60 text-sm">
                  {shopDomain}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleCreateProduct}
            className="px-6 py-3.5 bg-black text-white rounded-xl font-semibold hover:opacity-80 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Créer un produit
          </button>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-black/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-black mb-1">{products.length || demoProducts.length}</div>
            <div className="text-sm text-black/60">Produits</div>
          </div>
          <div className="bg-white border border-black/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-black mb-1">
              {(products.length > 0 ? products : demoProducts).filter(p => p.status === 'published').length}
            </div>
            <div className="text-sm text-black/60">Publiés</div>
          </div>
          <div className="bg-white border border-black/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-black mb-1">
              {(products.length > 0 ? products : demoProducts).filter(p => p.status === 'draft').length}
            </div>
            <div className="text-sm text-black/60">Brouillons</div>
          </div>
          <div className="bg-white border border-black/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-black mb-1">{folders.length}</div>
            <div className="text-sm text-black/60">Dossiers</div>
          </div>
        </div>

        {/* Filtres par dossier */}
        {folders.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-black/60">Filtrer par dossier:</span>
              <button
                onClick={() => setSelectedFolder(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedFolder === null
                    ? 'bg-black text-white'
                    : 'bg-white text-black border border-black/10 hover:bg-black/5'
                }`}
              >
                Tous
              </button>
              {folders.map(folder => (
                <Link
                  key={folder.id}
                  href={`/dashboard/folder/${folder.id}`}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedFolder === folder.id
                      ? 'bg-black text-white'
                      : 'bg-white text-black border border-black/10 hover:bg-black/5'
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedFolder(folder.id);
                  }}
                >
                  📁 {folder.name} ({productsByFolder.grouped[folder.id]?.length || 0})
                </Link>
              ))}
              {productsByFolder.noFolder.length > 0 && (
                <button
                  onClick={() => setSelectedFolder('no-folder')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedFolder === 'no-folder'
                      ? 'bg-black text-white'
                      : 'bg-white text-black border border-black/10 hover:bg-black/5'
                  }`}
                >
                  Sans dossier ({productsByFolder.noFolder.length})
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Liste des produits */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-black">
              {isDemo ? 'Exemples de produits' : selectedFolder ? 'Produits filtrés' : 'Tous les produits'}
            </h3>
            {isDemo && (
              <p className="text-sm text-black/60 mt-1">
                Contenu de démonstration - Créez vos propres produits pour commencer
              </p>
            )}
          </div>
          <div className="text-sm text-black/60">
            {displayProducts.length} produit{displayProducts.length > 1 ? 's' : ''}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayProducts.map((product) => (
            <div
              key={product.id}
              className={`group bg-white border border-black/10 rounded-2xl overflow-hidden hover:shadow-lg hover:border-black/20 transition-all duration-300 ${
                isDemo ? 'opacity-75' : 'cursor-pointer'
              }`}
              onClick={() => !isDemo && router.push(`/dashboard/shop/${encodeURIComponent(shopDomain)}/product/${product.id}`)}
            >
              {/* Image du produit */}
              {product.images && product.images.length > 0 ? (
                <div className="aspect-square bg-black/5 overflow-hidden">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="aspect-square bg-black/5 flex items-center justify-center">
                  <svg className="w-16 h-16 text-black/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {/* Contenu */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-lg font-bold text-black line-clamp-2 flex-1">
                    {product.name}
                  </h4>
                  <span className={`ml-2 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                    product.status === 'published' 
                      ? 'bg-black text-white' 
                      : product.status === 'draft'
                      ? 'bg-black/10 text-black'
                      : 'bg-black/5 text-black/60'
                  }`}>
                    {product.status === 'published' ? 'Publié' : product.status === 'draft' ? 'Brouillon' : 'Archivé'}
                  </span>
                </div>

                {product.generated_content && (
                  <p className="text-sm text-black/60 line-clamp-2 mb-4">
                    {product.generated_content.short_description || product.generated_content.title}
                  </p>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-black/5">
                  <span className="text-xs text-black/50">
                    {new Date(product.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                  {!isDemo && (
                    <div className="flex items-center gap-1 text-black/40 group-hover:text-black transition-colors">
                      <span className="text-xs font-medium">Voir</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {isDemo && (
          <div className="mt-8 text-center py-8 bg-black/5 rounded-2xl border border-black/10">
            <h3 className="text-xl font-bold text-black mb-3">
              Prêt à créer vos propres produits ?
            </h3>
            <p className="text-black/60 mb-6 max-w-md mx-auto">
              Commencez par créer votre premier produit. Importez une image et laissez l'IA générer automatiquement votre fiche produit.
            </p>
            <button
              onClick={handleCreateProduct}
              className="px-8 py-4 bg-black text-white rounded-xl font-semibold hover:opacity-80 transition-all inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Créer mon premier produit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
