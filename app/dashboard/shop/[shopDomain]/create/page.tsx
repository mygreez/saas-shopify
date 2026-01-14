// ============================================
// Page: Création produit - Upload image + Analyse IA
// ============================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/db/supabase';
import CreateProductForm from '@/components/CreateProductForm';

export default async function CreateProductPage({
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

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <a
                href={`/dashboard/shop/${encodeURIComponent(shopDomain)}`}
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                ← Retour
              </a>
              <h1 className="text-xl font-bold text-slate-900">
                Créer un produit
              </h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <CreateProductForm shopDomain={shopDomain} shopifyConnectionId={connection.id} />
      </main>
    </div>
  );
}

