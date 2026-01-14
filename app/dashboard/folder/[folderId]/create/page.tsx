// ============================================
// Page: Création produit dans un dossier - Upload image + Analyse IA
// ============================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/db/supabase';
import CreateProductForm from '@/components/CreateProductForm';
import LogoutButton from '@/components/LogoutButton';

export default async function CreateProductPage({
  params,
}: {
  params: { folderId: string };
}) {
  const session = await getSession();

  if (!session) {
    redirect('/auth/login');
  }

  const userId = session.user?.id;
  const folderId = params.folderId;

  // Vérifier que le dossier appartient à l'utilisateur
  const { data: folder } = await supabaseAdmin
    .from('folders')
    .select('*')
    .eq('id', folderId)
    .eq('user_id', userId)
    .single();

  if (!folder) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <a
                href={`/dashboard/folder/${folderId}`}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors group"
              >
                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Retour</span>
              </a>
              <div className="h-6 w-px bg-slate-300"></div>
              <h1 className="text-xl font-bold text-slate-900">
                Créer un produit
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                {session.user?.email}
              </span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <CreateProductForm folderId={folderId} folderName={folder.name} />
      </main>
    </div>
  );
}

