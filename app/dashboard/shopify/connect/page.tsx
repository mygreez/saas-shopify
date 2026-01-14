// ============================================
// Page: Vue des boutiques Shopify et leurs dossiers
// ============================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/db/supabase';
import Link from 'next/link';

export default async function ShopifyConnectPage() {
  const session = await getSession();

  if (!session) {
    redirect('/auth/login');
  }

  const userId = session.user?.id;
  const isDemo = userId === 'demo-user-id';

  // MODE DÉMO : Retourner des données vides
  let shopifyConnections: any[] = [];
  let shopsWithFolders: any[] = [];

  if (!isDemo) {
    // MODE PRODUCTION : Récupérer les connexions Shopify
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && supabaseUrl !== '') {
      try {
        const { data: connections } = await supabaseAdmin
          .from('shopify_connections')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        shopifyConnections = connections || [];

        // Pour chaque boutique, récupérer les dossiers qui contiennent des produits
        for (const connection of shopifyConnections) {
          // Récupérer les produits de cette boutique
          const { data: products } = await supabaseAdmin
            .from('products')
            .select('folder_id, status, shopify_product_id')
            .eq('shopify_connection_id', connection.id)
            .eq('user_id', userId);

          if (products && products.length > 0) {
            // Récupérer les IDs de dossiers uniques
            const folderIds = [...new Set(products.filter(p => p.folder_id).map(p => p.folder_id))];
            
            if (folderIds.length > 0) {
              // Récupérer les dossiers
              const { data: folders } = await supabaseAdmin
                .from('folders')
                .select('*')
                .in('id', folderIds)
                .eq('user_id', userId);

              // Compter les produits par dossier
              const foldersWithCounts = (folders || []).map(folder => {
                const folderProducts = products.filter(p => p.folder_id === folder.id);
                const publishedCount = folderProducts.filter(p => p.status === 'published' && p.shopify_product_id).length;
                const draftCount = folderProducts.filter(p => p.status === 'draft').length;

                return {
                  ...folder,
                  totalProducts: folderProducts.length,
                  publishedProducts: publishedCount,
                  draftProducts: draftCount,
                };
              });

              shopsWithFolders.push({
                connection,
                folders: foldersWithCounts,
                totalProducts: products.length,
                publishedProducts: products.filter(p => p.status === 'published' && p.shopify_product_id).length,
              });
            } else {
              // Boutique sans dossiers
              shopsWithFolders.push({
                connection,
                folders: [],
                totalProducts: products.length,
                publishedProducts: products.filter(p => p.status === 'published' && p.shopify_product_id).length,
              });
            }
          } else {
            // Boutique sans produits
            shopsWithFolders.push({
              connection,
              folders: [],
              totalProducts: 0,
              publishedProducts: 0,
            });
          }
        }
      } catch (error) {
        console.error('Erreur récupération données Shopify:', error);
      }
    }
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-black">
            Boutiques Shopify
          </h1>
          <p className="text-slate-600">
            Visualisez les dossiers traités pour chaque boutique
          </p>
        </div>

        {shopsWithFolders.length === 0 ? (
          <div className="text-center py-12 bg-white border-2 border-dashed border-black rounded-2xl">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-slate-200 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-black mb-2">
                Aucune boutique connectée
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                Connectez votre première boutique Shopify pour commencer.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {shopsWithFolders.map((shop) => (
              <div
                key={shop.connection.id}
                className="bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                {/* Header de la boutique */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-black mb-1">
                      {shop.connection.shop_domain.replace('.myshopify.com', '')}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {shop.connection.shop_domain}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-600 mb-1">Produits totaux</div>
                    <div className="text-2xl font-bold text-black">{shop.totalProducts}</div>
                    <div className="text-xs text-green-600 mt-1">
                      {shop.publishedProducts} publié{shop.publishedProducts > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Liste des dossiers */}
                {shop.folders.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-slate-600">
                      Aucun dossier avec des produits pour cette boutique
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-black">
                      Dossiers traités ({shop.folders.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {shop.folders.map((folder: any) => (
                        <Link
                          key={folder.id}
                          href={`/dashboard/folder/${folder.id}`}
                          className="group p-4 bg-white border-2 border-black rounded-lg hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold border-2 border-black"
                              style={{ backgroundColor: folder.color }}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-black group-hover:text-slate-700 transition-colors">
                                {folder.name}
                              </h4>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <div>
                              <span className="text-slate-600">
                                {folder.totalProducts} produit{folder.totalProducts > 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {folder.publishedProducts > 0 && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                                  {folder.publishedProducts} publié{folder.publishedProducts > 1 ? 's' : ''}
                                </span>
                              )}
                              {folder.draftProducts > 0 && (
                                <span className="px-2 py-1 bg-slate-100 text-slate-800 rounded text-xs font-semibold">
                                  {folder.draftProducts} brouillon{folder.draftProducts > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
