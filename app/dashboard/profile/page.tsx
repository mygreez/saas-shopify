// ============================================
// Page: Mon Profil - Informations et paramètres du profil
// ============================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/db/supabase';
import ProfileForm from '@/components/ProfileForm';
import SettingsSection from '@/components/SettingsSection';

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) {
    redirect('/auth/login');
  }

  const userId = session.user?.id;

  // Récupérer les informations complètes de l'utilisateur
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  // Formater la date de création
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Non disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getInitials = () => {
    const name = user?.name || session.user?.name;
    if (name) {
      return name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return session.user?.email?.[0].toUpperCase() || 'U';
  };

  return (
    <main className="flex-1 min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header avec avatar */}
        <div className="mb-6">
          <div className="relative group">
            {/* Carte principale */}
            <div className="relative bg-white rounded-2xl border border-[#1b6955]/20 shadow-lg overflow-hidden">
              {/* Bordure colorée */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#1b6955]/10 via-transparent to-[#1b6955]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  {/* Avatar */}
                  <div className="relative group/avatar">
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#1b6955] flex items-center justify-center text-white text-3xl sm:text-4xl font-bold shadow-md ring-4 ring-[#1b6955]/20 group-hover/avatar:ring-[#1b6955]/40 transition-all duration-300 group-hover/avatar:scale-105">
                      {getInitials()}
                    </div>
                  </div>

                  {/* Informations utilisateur */}
                  <div className="flex-1 text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#1b6955] mb-2">
                      {user?.name || session.user?.name || 'Utilisateur'}
                    </h1>
                    <p className="text-base sm:text-lg text-gray-600 font-medium mb-4">
                      {session.user?.email}
                    </p>
                    
                    {/* Badge membre depuis */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1b6955]/10 border border-[#1b6955]/20 text-sm text-[#1b6955] font-semibold">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Membre depuis {formatDate(user?.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section édition du profil */}
        <div className="relative group mb-6">
          <div className="relative bg-white rounded-2xl border border-[#1b6955]/20 shadow-lg overflow-hidden">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#1b6955]/5 via-transparent to-[#1b6955]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative w-12 h-12 rounded-xl bg-[#1b6955]/10 flex items-center justify-center border border-[#1b6955]/20">
                  <svg className="w-6 h-6 text-[#1b6955]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#1b6955]">
                  Informations personnelles
                </h2>
              </div>
              
              <ProfileForm 
                initialName={user?.name || session.user?.name} 
                email={session.user?.email || ''} 
              />
            </div>
          </div>
        </div>

        {/* Section Paramètres système */}
        {user?.role === 'admin' && (
          <div className="relative group">
            <div className="relative bg-white rounded-2xl border border-[#1b6955]/20 shadow-lg overflow-hidden">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#1b6955]/5 via-transparent to-[#1b6955]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="relative w-12 h-12 rounded-xl bg-[#1b6955]/10 flex items-center justify-center border border-[#1b6955]/20">
                    <svg className="w-6 h-6 text-[#1b6955]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#1b6955]">
                    Paramètres système
                  </h2>
                </div>
                
                <SettingsSection />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}


