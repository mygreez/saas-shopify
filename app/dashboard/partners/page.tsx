// ============================================
// Page: Gestion des Partenaires (Admin)
// ============================================

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { fetchJsonWithTimeout } from '@/lib/utils/fetchWithTimeout';


export default function PartnersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    partnersInscrits: number;
    produitsCrees: number;
    invitationsEnAttente: number;
    soumissionsCompletees: number;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }
    if (status === 'loading') {
      return; // Attendre le chargement
    }
    if (session) {
      const userId = session.user?.id;
      console.log('Session user ID:', userId);
      console.log('Session user email:', session.user?.email);
      
      // Vérifier si c'est un utilisateur démo
      // Le mode démo est détecté si :
      // 1. L'ID est exactement 'demo-user-id'
      // 2. L'ID commence par 'demo-' ET l'email est 'demo@photify.app'
      const isDemo = userId === 'demo-user-id' || 
                    (userId?.startsWith('demo-') && session.user?.email === 'demo@photify.app');
      
      if (isDemo) {
        console.log('Mode démo détecté');
        setError('Cette fonctionnalité n\'est pas disponible en mode démo. Veuillez vous connecter avec un compte admin.');
        return;
      }
    }
  }, [status, session, router]);

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const data = await fetchJsonWithTimeout<{ success: boolean; data?: typeof stats }>('/api/dashboard/partners/stats', {
        timeout: 10000, // 10 secondes
      });
      if (data.success && data.data) {
        setStats(data.data);
      }
    } catch (err: any) {
      console.error('Erreur chargement statistiques:', err);
      setError(err.message || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Appeler fetchStats quand la session est prête
  useEffect(() => {
    if (status === 'authenticated' && session) {
      const userId = session.user?.id;
      const isDemo = userId === 'demo-user-id' || 
                    (userId?.startsWith('demo-') && session.user?.email === 'demo@photify.app');
      
      if (!isDemo) {
        fetchStats();
      }
    }
  }, [status, session, fetchStats]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null; // Le useEffect va rediriger
  }

  // Vérifier si c'est un utilisateur démo
  const isDemo = session?.user?.id === 'demo-user-id' || session?.user?.id?.startsWith('demo-');
  
  if (isDemo) {
    return (
      <div className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">Mode Démo</h2>
          <p className="text-yellow-700 mb-4">
            Cette fonctionnalité n'est pas disponible en mode démo. Veuillez vous connecter avec un compte admin pour accéder à la gestion des partenaires.
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="flex-1 container mx-auto px-4 py-8 max-w-6xl flex flex-col">
      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-400 text-red-800 rounded-lg">
          <div className="whitespace-pre-wrap font-medium mb-2">{error.split('```sql')[0]}</div>
          {error.includes('```sql') && (
            <div className="mt-4">
              <div className="text-sm font-semibold mb-2 text-red-900">SQL à exécuter dans Supabase SQL Editor:</div>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{error.split('```sql')[1]?.split('```')[0]?.trim()}</code>
              </pre>
              <button
                onClick={() => {
                  const sqlMatch = error.match(/```sql\n([\s\S]*?)\n```/);
                  if (sqlMatch) {
                    navigator.clipboard.writeText(sqlMatch[1].trim());
                    setSuccess('SQL copié dans le presse-papiers !');
                    setTimeout(() => setSuccess(null), 2000);
                  }
                }}
                className="mt-2 px-4 py-2 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] text-sm"
              >
                Copier le SQL
              </button>
            </div>
          )}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-[#1b6955]/10 border border-[#1b6955] text-[#1b6955] rounded-lg font-medium flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {success}
        </div>
      )}

      {/* Section KPIs */}
      {stats && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Statistiques Partenaires</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#1b6955] hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] group">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-600 mb-1">Partenaires inscrits</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2 group-hover:text-[#1b6955] transition-colors">{stats.partnersInscrits}</p>
                </div>
                <div className="bg-[#1b6955]/10 rounded-full p-4 group-hover:bg-[#1b6955]/20 transition-colors">
                  <svg className="w-10 h-10 text-[#1b6955]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#1b6955] hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] group">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-600 mb-1">Produits créés</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2 group-hover:text-[#1b6955] transition-colors">{stats.produitsCrees}</p>
                </div>
                <div className="bg-[#1b6955]/10 rounded-full p-4 group-hover:bg-[#1b6955]/20 transition-colors">
                  <svg className="w-10 h-10 text-[#1b6955]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#1b6955] hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] group">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-600 mb-1">Invitations en attente</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2 group-hover:text-[#1b6955] transition-colors">{stats.invitationsEnAttente}</p>
                </div>
                <div className="bg-[#1b6955]/10 rounded-full p-4 group-hover:bg-[#1b6955]/20 transition-colors">
                  <svg className="w-10 h-10 text-[#1b6955]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#1b6955] hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] group">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-600 mb-1">Soumissions complétées</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2 group-hover:text-[#1b6955] transition-colors">{stats.soumissionsCompletees}</p>
                </div>
                <div className="bg-[#1b6955]/10 rounded-full p-4 group-hover:bg-[#1b6955]/20 transition-colors">
                  <svg className="w-10 h-10 text-[#1b6955]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loadingStats && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Statistiques Partenaires</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-gray-200 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-10 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lien unique partenaire - En bas de la page */}
      <div className="bg-white rounded-xl shadow-lg p-8 mt-auto border-l-4 border-[#1b6955]">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#1b6955]/10">
            <svg className="w-6 h-6 text-[#1b6955]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Lien d'inscription partenaire</h2>
            <p className="text-sm text-gray-600 mt-1">
              Partagez ce lien avec vos partenaires pour qu'ils puissent s'inscrire
            </p>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-[#1b6955]/5 to-transparent rounded-lg p-6 border border-[#1b6955]/20">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={typeof window !== 'undefined' ? `${window.location.origin}/partner/public/register` : ''}
                readOnly
                className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-lg bg-white text-gray-900 font-mono text-sm focus:outline-none focus:border-[#1b6955] transition-colors"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
            </div>
            <button
              onClick={() => {
                const link = typeof window !== 'undefined' ? `${window.location.origin}/partner/public/register` : '';
                navigator.clipboard.writeText(link);
                setSuccess('Lien copié dans le presse-papiers !');
                setTimeout(() => setSuccess(null), 2000);
              }}
              className="px-8 py-3 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] font-semibold shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copier le lien
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Les partenaires pourront utiliser ce lien pour créer leur compte et accéder à leur espace
          </p>
        </div>
      </div>
    </div>
  );
}
