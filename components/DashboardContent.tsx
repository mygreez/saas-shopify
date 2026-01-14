// ============================================
// Composant: Dashboard - Liste des dossiers
// ============================================

'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface Folder {
  id: string;
  name: string;
  description: string | null;
  publication_date: string | null;
  color: string;
  created_at: string;
}

interface DashboardContentProps {
  folders: Folder[];
  title?: string;
  showTitle?: boolean;
  folderId?: string; // ID du dossier si on est sur une page de dossier
  products?: any[]; // Produits du dossier
}

export default function DashboardContent({ folders: initialFolders, title, showTitle = true, folderId, products: initialProducts = [] }: DashboardContentProps) {
  const router = useRouter();
  const [folders, setFolders] = useState(() => {
    // En mode démo, récupérer depuis localStorage si disponible
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('demo_folders');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          return initialFolders;
        }
      }
    }
    return initialFolders;
  });
  
  const [products, setProducts] = useState(() => {
    // En mode démo, récupérer les produits depuis localStorage
    if (typeof window !== 'undefined' && folderId) {
      const stored = localStorage.getItem(`demo_products_${folderId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          return initialProducts;
        }
      }
    }
    return initialProducts;
  });
  
  // En mode démo, récupérer le nom du dossier depuis l'URL si on est sur une page de dossier
  const [displayTitle, setDisplayTitle] = useState(title || 'Mes dossiers');
  
  useEffect(() => {
    if (typeof window !== 'undefined' && !title) {
      const pathParts = window.location.pathname.split('/');
      const folderIdFromUrl = pathParts[pathParts.length - 1];
      if (folderIdFromUrl && folderIdFromUrl !== 'dashboard' && pathParts.includes('folder')) {
        // Récupérer le dossier depuis localStorage
        const stored = localStorage.getItem('demo_folders');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const folder = parsed.find((f: Folder) => f.id === folderIdFromUrl);
            if (folder) {
              setDisplayTitle(folder.name);
            }
          } catch (e) {
            // Ignorer l'erreur
          }
        }
      }
    } else if (title) {
      setDisplayTitle(title);
    }
  }, [title]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleFolderClick = (folderId: string) => {
    router.push(`/dashboard/folder/${folderId}`);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setCreating(true);
    setError('');
    
    try {
      // Utiliser l'URL relative pour éviter les problèmes CORS
      const apiUrl = '/api/folders/create';
      
      console.log('Tentative de création de dossier:', { 
        apiUrl, 
        name: newFolderName.trim(), 
        origin: window.location.origin,
        url: `${window.location.origin}${apiUrl}`
      });
      
      let response;
      try {
        response = await fetch(`${window.location.origin}${apiUrl}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ 
            name: newFolderName.trim(),
          }),
        });
      } catch (fetchError: any) {
        console.error('❌ Erreur fetch détaillée:', fetchError);
        const errorMsg = fetchError.message || fetchError.toString();
        throw new Error(`Impossible de contacter le serveur. Vérifiez que le serveur Next.js est démarré. Erreur: ${errorMsg}`);
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Erreur parsing JSON:', jsonError);
        alert(`Erreur: Impossible de lire la réponse du serveur (${response.status})`);
        return;
      }

      if (response.ok) {
        // Ajouter le nouveau dossier à la liste
        if (data.folder) {
          const updatedFolders = [data.folder, ...folders];
          setFolders(updatedFolders);
          
          // En mode démo, sauvegarder dans localStorage
          if (typeof window !== 'undefined' && data.folder.id?.startsWith('demo-folder-')) {
            localStorage.setItem('demo_folders', JSON.stringify(updatedFolders));
          }
        }
        // Fermer le modal et réinitialiser
        setShowCreateModal(false);
        setNewFolderName('');
      } else {
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}` 
          : data.error || `Erreur ${response.status}: ${response.statusText}`;
        console.error('Erreur création dossier:', {
          status: response.status,
          statusText: response.statusText,
          data
        });
        alert(errorMessage);
      }
    } catch (error: any) {
      console.error('Erreur réseau création dossier:', error);
      let errorMessage = 'Erreur réseau. ';
      
      if (error.message?.includes('fetch failed')) {
        errorMessage += 'Le serveur ne répond pas. Vérifiez que le serveur Next.js est démarré.';
      } else if (error.message?.includes('Failed to fetch')) {
        errorMessage += 'Impossible de contacter le serveur. Vérifiez votre connexion et que le serveur est démarré.';
      } else {
        errorMessage += error.message || 'Vérifiez votre connexion.';
      }
      
      alert(`Erreur lors de la création du dossier:\n${errorMessage}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      {/* Si on est dans un dossier, afficher les produits */}
      {folderId ? (
        <>
          {/* Header avec nom du dossier */}
          {showTitle && (
            <div className="flex items-center justify-between mb-6 relative group">
              <div className="relative bg-white/70 backdrop-blur-3xl rounded-2xl border border-[#1b6955]/10 shadow-[0_15px_50px_-10px_rgba(0,0,0,0.1)] px-6 py-4 overflow-hidden">
                {/* Effet liquid glass */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-white/15 to-white/35 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-[shimmer_4s_infinite]"></div>
                
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold text-black mb-1">
                    {displayTitle}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {products.length} produit{products.length > 1 ? 's' : ''} dans ce dossier
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push(`/dashboard/products/new?folderId=${folderId}`)}
                className="px-5 py-2.5 bg-white/70 backdrop-blur-3xl text-black rounded-lg font-bold hover:bg-white/90 transition-all border-2 border-[#1b6955] flex items-center gap-2 relative overflow-hidden group/btn shadow-lg hover:shadow-xl"
              >
                {/* Effet liquid glass multi-couches */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 via-transparent to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-white/15 to-white/35 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-700"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                
                {/* Bordure lumineuse */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-black/10 via-transparent to-black/10 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-700"></div>
                
                {/* Particules de lumière */}
                <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#1b6955]/10 rounded-full blur-sm opacity-0 group-hover/btn:opacity-100 animate-pulse"></div>
                <div className="absolute bottom-2 left-2 w-1 h-1 bg-[#1b6955]/10 rounded-full blur-sm opacity-0 group-hover/btn:opacity-100 animate-pulse animation-delay-2000"></div>
                
                <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="relative z-10">Nouveau produit</span>
              </button>
            </div>
          )}

          {/* Liste des produits */}
          {products.length === 0 ? (
            <div className="text-center py-12 bg-white/70 backdrop-blur-3xl border-2 border-dashed border-[#1b6955] rounded-2xl relative overflow-hidden group shadow-[0_15px_50px_-10px_rgba(0,0,0,0.1)]">
              {/* Effet liquid glass */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-white/15 to-white/35 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
              
              {/* Bordure lumineuse */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-black/10 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              <div className="max-w-md mx-auto relative z-10">
                <div className="w-16 h-16 bg-slate-200 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-black mb-2">
                  Aucun produit
                </h3>
                <p className="text-sm text-slate-600 mb-6">
                  Créez votre premier produit pour commencer.
                </p>
                <button
                  onClick={() => router.push(`/dashboard/products/new?folderId=${folderId}`)}
                  className="px-6 py-3 bg-white/70 backdrop-blur-3xl text-black rounded-lg font-bold hover:bg-white/90 transition-all border-2 border-[#1b6955] inline-flex items-center gap-2 relative overflow-hidden group/btn shadow-lg hover:shadow-xl"
                >
                  {/* Effet liquid glass multi-couches */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 via-transparent to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"></div>
                  <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-white/15 to-white/35 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-700"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                  
                  {/* Bordure lumineuse */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-black/10 via-transparent to-black/10 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-700"></div>
                  
                  {/* Particules de lumière */}
                  <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#1b6955]/10 rounded-full blur-sm opacity-0 group-hover/btn:opacity-100 animate-pulse"></div>
                  <div className="absolute bottom-2 left-2 w-1 h-1 bg-[#1b6955]/10 rounded-full blur-sm opacity-0 group-hover/btn:opacity-100 animate-pulse animation-delay-2000"></div>
                  
                  <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="relative z-10">Créer un produit</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product: any) => (
                <div
                  key={product.id}
                  className="group bg-white/70 backdrop-blur-3xl border-2 border-[#1b6955] rounded-lg overflow-hidden hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 cursor-pointer relative"
                  onClick={() => router.push(`/dashboard/folder/${folderId}/product/${product.id}`)}
                >
                  {/* Effet liquid glass */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0"></div>
                  <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-white/15 to-white/35 opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-0"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out z-0"></div>
                  
                  {/* Bordure lumineuse */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-black/10 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-0"></div>
                  {/* Image du produit */}
                  {product.images && product.images.length > 0 ? (
                    <div className="aspect-square bg-slate-100 overflow-hidden relative z-10">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative z-10">
                      <svg className="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  {/* Contenu */}
                  <div className="p-4 relative z-10">
                    <h3 className="font-bold text-black mb-2 line-clamp-2">
                      {product.name}
                    </h3>
                    {product.category && (
                      <p className="text-xs text-slate-600 mb-2">
                        {product.category}
                      </p>
                    )}
                    {product.price && (
                      <p className="text-sm font-bold text-black">
                        {product.price} €
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        product.status === 'published' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        {product.status === 'published' ? 'Publié' : 'Brouillon'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Header pour la liste des dossiers */}
          {showTitle && (
            <div className="flex items-center justify-between mb-4 relative group">
              <div className="relative bg-white/70 backdrop-blur-3xl rounded-2xl border border-[#1b6955]/10 shadow-[0_15px_50px_-10px_rgba(0,0,0,0.1)] px-6 py-4 overflow-hidden">
                {/* Effet liquid glass */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-white/15 to-white/35 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-[shimmer_4s_infinite]"></div>
                
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold text-black mb-1">
                    {displayTitle}
                  </h2>
                  <p className="text-sm text-slate-600">
                    Organisez vos produits par dossiers
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 bg-white/70 backdrop-blur-3xl text-black rounded-lg font-bold hover:bg-white/90 transition-all border-2 border-[#1b6955] flex items-center gap-2 relative overflow-hidden group/btn shadow-lg hover:shadow-xl"
              >
                {/* Effet liquid glass multi-couches */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 via-transparent to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-white/15 to-white/35 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-700"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                
                {/* Bordure lumineuse */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-black/10 via-transparent to-black/10 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-700"></div>
                
                {/* Particules de lumière */}
                <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#1b6955]/10 rounded-full blur-sm opacity-0 group-hover/btn:opacity-100 animate-pulse"></div>
                <div className="absolute bottom-2 left-2 w-1 h-1 bg-[#1b6955]/10 rounded-full blur-sm opacity-0 group-hover/btn:opacity-100 animate-pulse animation-delay-2000"></div>
                
                <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="relative z-10">Nouveau dossier</span>
              </button>
            </div>
          )}

          {/* Zone de création avec pointillés */}
          <div className="relative mb-8 group">
            <div className="border-2 border-dashed border-[#1b6955] rounded-2xl p-6 min-h-[200px] bg-white/70 backdrop-blur-3xl shadow-[0_15px_50px_-10px_rgba(0,0,0,0.1)] overflow-hidden relative">
              {/* Effet liquid glass */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-white/15 to-white/35 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
              
              {/* Bordure lumineuse */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-black/10 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              {/* Particules de lumière */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-[#1b6955]/10 rounded-full blur-sm opacity-0 group-hover:opacity-100 animate-pulse"></div>
              <div className="absolute bottom-4 left-4 w-1.5 h-1.5 bg-[#1b6955]/10 rounded-full blur-sm opacity-0 group-hover:opacity-100 animate-pulse animation-delay-2000"></div>
              <div className="flex flex-wrap gap-4 justify-end items-start">
                {folders.length === 0 ? (
                  <div className="w-full text-center py-8">
                    <p className="text-slate-600 mb-4">Aucun dossier créé</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="px-4 py-2 bg-[#1b6955] text-white rounded-lg font-bold hover:bg-slate-800 transition-colors border-2 border-[#1b6955]"
                    >
                      Créer un dossier
                    </button>
                  </div>
                ) : (
              folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleFolderClick(folder.id)}
                  className="group w-32 h-32 bg-white/70 backdrop-blur-3xl border-2 border-[#1b6955] rounded-lg hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 flex flex-col items-center justify-center relative overflow-hidden"
                  style={{ backgroundColor: folder.color + '20' }}
                >
                  {/* Effet liquid glass */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-white/15 to-white/35 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                  
                  {/* Bordure lumineuse */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-black/10 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold mb-2 border-2 border-[#1b6955]"
                        style={{ backgroundColor: folder.color }}
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      </div>
                      <p className="text-xs font-bold text-black text-center px-2 line-clamp-2">
                        {folder.name}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[#1b6955]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 backdrop-blur-3xl rounded-2xl border-2 border-[#1b6955] p-6 max-w-md w-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
            {/* Effet liquid glass */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 via-transparent to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-white/15 to-white/35"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-[shimmer_4s_infinite]"></div>
            
            {/* Bordure lumineuse */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-black/10 via-transparent to-black/10"></div>
            <h3 className="text-xl font-bold text-black mb-6">
              Créer un nouveau dossier
            </h3>
            
            <div className="mb-6 relative z-10">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newFolderName.trim() && !creating) {
                    handleCreateFolder();
                  }
                }}
                placeholder="Nom du dossier"
                className="w-full px-4 py-3 border-2 border-[#1b6955] rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 text-black placeholder:text-slate-400 bg-white/90 backdrop-blur-xl"
                autoFocus
              />
            </div>

            <div className="flex gap-3 relative z-10">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewFolderName('');
                }}
                className="flex-1 px-4 py-3 border-2 border-[#1b6955] rounded-lg font-bold text-black hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || creating}
                className="flex-1 px-4 py-3 bg-[#1b6955] text-white rounded-lg font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-[#1b6955]"
              >
                {creating ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
