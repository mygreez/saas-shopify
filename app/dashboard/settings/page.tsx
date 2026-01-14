// ============================================
// Page: Paramètres - Gestion des intégrations
// ============================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/db/supabase';
import LogoutButton from '@/components/LogoutButton';
import IntegrationsSection from '@/components/IntegrationsSection';
import DisablePageScroll from '@/components/DisablePageScroll';
import Link from 'next/link';
import Image from 'next/image';

export default async function SettingsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/auth/login');
  }

  const userId = session.user?.id;

  // Récupérer les connexions Shopify de l'utilisateur
  const { data: shopifyConnections } = await supabaseAdmin
    .from('shopify_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return (
    <>
      <DisablePageScroll />
      <div className="h-screen bg-white flex flex-col overflow-hidden fixed inset-0">
        {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 flex-shrink-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <Link href="/dashboard/partners" className="flex items-center">
                <Image
                  src="/image/Une_beaute_GREEN_avec_ZERO_Dechet_19.webp"
                  alt="Greez"
                  width={120}
                  height={40}
                  className="h-8 w-auto object-contain"
                  priority
                />
              </Link>
              <div className="hidden md:flex items-center gap-4 text-sm text-slate-600">
                <Link href="/dashboard/partners" className="hover:text-slate-900 transition-colors">
                  Dashboard
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-slate-900 font-medium">Paramètres</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/profile"
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                Mon Profil
              </Link>
              <span className="text-sm text-slate-600">
                {session.user?.email}
              </span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Paramètres
            </h1>
            <p className="text-slate-600">
              Gérez vos intégrations et préférences
            </p>
          </div>

          {/* Section Intégrations */}
          <IntegrationsSection 
            shopifyConnections={shopifyConnections || []} 
          />
        </div>
      </main>
    </div>
    </>
  );
}

