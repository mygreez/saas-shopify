// ============================================
// Page: Vue d'une boutique - Créer produit ou voir produits
// ============================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/db/supabase';
import ShopView from '@/components/ShopView';

export default async function ShopPage({
  params,
}: {
  params: { shopDomain: string };
}) {
  const session = await getSession();

  if (!session) {
    redirect('/auth/login');
  }

  const userId = session.user?.id;
  const shopDomain = decodeURIComponent(params.shopDomain);

  // Vérifier que la boutique appartient à l'utilisateur
  const { data: connection } = await supabaseAdmin
    .from('shopify_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('shop_domain', shopDomain)
    .eq('is_active', true)
    .single();

  if (!connection) {
    redirect('/dashboard');
  }

  // Récupérer les produits créés pour cette boutique
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('*, folder_id')
    .eq('shopify_connection_id', connection.id)
    .order('created_at', { ascending: false });

  // Récupérer les dossiers qui contiennent des produits de cette boutique
  const folderIds = products?.filter(p => p.folder_id).map(p => p.folder_id) || [];
  let folders = [];
  if (folderIds.length > 0) {
    const { data: foldersData } = await supabaseAdmin
      .from('folders')
      .select('*')
      .in('id', folderIds)
      .eq('user_id', userId);
    folders = foldersData || [];
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-white border-b border-black/10 sticky top-0 z-10 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <a
                href="/dashboard"
                className="flex items-center gap-2 text-black/60 hover:text-black transition-colors group"
              >
                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Retour</span>
              </a>
              <div className="h-6 w-px bg-black/10"></div>
              <h1 className="text-xl font-bold text-black">
                {shopDomain.replace('.myshopify.com', '')}
              </h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <ShopView 
          shopDomain={shopDomain} 
          products={products || []} 
          folders={folders || []}
        />
      </main>
    </div>
  );
}

