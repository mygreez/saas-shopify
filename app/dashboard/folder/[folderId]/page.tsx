// ============================================
// Page: Visualisation d'un dossier avec ses produits
// ============================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/db/supabase';
import DashboardContent from '@/components/DashboardContent';

export default async function FolderPage({
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
  const isDemo = userId === 'demo-user-id';

  // MODE DÉMO : Récupérer depuis localStorage
  let folder: any = null;
  let allFolders: any[] = [];
  let products: any[] = [];

  if (isDemo) {
    // En mode démo, récupérer depuis localStorage côté client
    // On retourne juste les données de base, le composant client gérera localStorage
    folder = { id: folderId, name: 'Dossier' };
    allFolders = [];
    products = [];
  } else {
    // MODE PRODUCTION : Récupérer depuis Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && supabaseUrl !== '') {
      try {
        const { data: folderData } = await supabaseAdmin
          .from('folders')
          .select('*')
          .eq('id', folderId)
          .eq('user_id', userId)
          .single();

        if (!folderData) {
          redirect('/dashboard');
        }

        folder = folderData;

        // Récupérer tous les dossiers de l'utilisateur pour l'affichage
        const { data: foldersData } = await supabaseAdmin
          .from('folders')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        allFolders = foldersData || [];

        // Récupérer les produits du dossier
        const { data: productsData } = await supabaseAdmin
          .from('products')
          .select('*')
          .eq('folder_id', folderId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        products = productsData || [];
      } catch (error) {
        console.error('Erreur récupération dossier:', error);
        // En cas d'erreur, rediriger vers dashboard
        redirect('/dashboard');
      }
    } else {
      // Pas de Supabase configuré, mode démo
      folder = { id: folderId, name: 'Dossier' };
      allFolders = [];
      products = [];
    }
  }

  return (
    <div className="min-h-screen bg-white relative">
      {/* Effet liquid glass en arrière-plan */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Gradient mesh animé */}
        <div className="absolute inset-0 gradient-mesh opacity-30"></div>
        
        {/* Blobs animés */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-200/20 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 relative">
        <DashboardContent 
          folders={allFolders || []} 
          title={folder?.name || 'Dossier'}
          showTitle={true}
          folderId={folderId}
          products={products}
        />
      </main>
    </div>
  );
}

