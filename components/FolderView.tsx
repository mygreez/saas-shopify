// ============================================
// Composant: Vue d'un dossier - Liste produits + Créer nouveau
// ============================================

'use client';

import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  status: string;
  created_at: string;
  generated_content?: any;
  images?: string[];
}

interface Folder {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

interface FolderViewProps {
  folder: Folder;
  products: Product[];
}

export default function FolderView({ folder, products }: FolderViewProps) {
  const router = useRouter();

  const handleCreateProduct = () => {
    router.push(`/dashboard/folder/${folder.id}/create`);
  };

  return (
    <div>
      {/* Header avec stats */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg"
                style={{ backgroundColor: folder.color }}
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900">
                  {folder.name}
                </h2>
                {folder.description && (
                  <p className="text-slate-500 text-sm mt-1">
                    {folder.description}
                  </p>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleCreateProduct}
            className="px-6 py-3.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Créer un produit
          </button>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-slate-900 mb-1">{products.length}</div>
            <div className="text-sm text-slate-600">Produits</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {products.filter(p => p.status === 'published').length}
            </div>
            <div className="text-sm text-slate-600">Publiés</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-yellow-600 mb-1">
              {products.filter(p => p.status === 'draft').length}
            </div>
            <div className="text-sm text-slate-600">Brouillons</div>
          </div>
        </div>
      </div>

      {/* Liste des produits */}
      {products.length === 0 ? (
        <div className="text-center py-24 bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl border-2 border-dashed border-slate-300">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">
              Aucun produit dans ce dossier
            </h3>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Commencez par créer votre premier produit. Importez une image et laissez l'IA générer automatiquement votre fiche produit.
            </p>
            <button
              onClick={handleCreateProduct}
              className="px-8 py-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Créer mon premier produit
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-slate-900">
              Tous les produits
            </h3>
            <div className="text-sm text-slate-600">
              {products.length} produit{products.length > 1 ? 's' : ''}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:border-slate-300 transition-all duration-300 cursor-pointer"
                onClick={() => router.push(`/dashboard/folder/${folder.id}/product/${product.id}`)}
              >
                {/* Image du produit */}
                {product.images && product.images.length > 0 ? (
                  <div className="aspect-square bg-slate-100 overflow-hidden">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <svg className="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}

                {/* Contenu */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-lg font-bold text-slate-900 line-clamp-2 flex-1">
                      {product.name}
                    </h4>
                    <span className={`ml-2 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                      product.status === 'published' 
                        ? 'bg-green-100 text-green-700' 
                        : product.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {product.status === 'published' ? 'Publié' : product.status === 'draft' ? 'Brouillon' : 'Archivé'}
                    </span>
                  </div>

                  {product.generated_content && (
                    <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                      {product.generated_content.short_description || product.generated_content.title}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className="text-xs text-slate-500">
                      {new Date(product.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                    <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-600 transition-colors">
                      <span className="text-xs font-medium">Voir</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

