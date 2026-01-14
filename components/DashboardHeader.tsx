// ============================================
// Composant: Header du Dashboard
// ============================================

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';

export default function DashboardHeader() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  
  const userEmail = session?.user?.email || 'user@example.com';
  const userName = session?.user?.name || null;
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Ne pas bloquer le rendu si la session charge - utiliser des valeurs par défaut

  // Fermer le menu si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  // Générer les initiales de l'utilisateur
  const getInitials = () => {
    if (userName) {
      return userName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return userEmail[0].toUpperCase();
  };

  // Composants d'icônes SVG
  const DashboardIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );

  const PartnersIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );

  const navItems = [
    { 
      href: '/dashboard/partners', 
      label: 'Partenaires', 
      icon: (className: string) => <PartnersIcon className={className} />
    },
    { 
      href: '/dashboard/companies', 
      label: 'Partenaires', 
      icon: (className: string) => <DashboardIcon className={className} />
    },
  ];

  const isActive = (href: string) => {
    return pathname?.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-2xl border-b border-black/5 shadow-lg shadow-black/5">
      {/* Effet de lumière subtil en arrière-plan */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-transparent pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex justify-between items-center h-16">
          {/* Logo et navigation principale */}
          <div className="flex items-center gap-8">
            <Link 
              href="/dashboard/partners" 
              className="flex items-center group relative"
              style={{ zIndex: 10 }}
            >
              <Image
                src="/image/Une_beaute_GREEN_avec_ZERO_Dechet_19.webp"
                alt="Greez"
                width={120}
                height={40}
                className="h-8 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                priority
              />
            </Link>

            {/* Navigation desktop */}
            <nav className="hidden md:flex items-center gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className={`px-5 py-2.5 rounded-2xl font-medium text-sm flex items-center gap-2 ${
                    isActive(item.href)
                      ? 'bg-[#1b6955] text-white shadow-lg'
                      : 'text-black/80 hover:text-black bg-white/50 border border-black/10 hover:bg-white/70'
                  }`}
                >
                  {/* Contenu */}
                  <span className="relative z-10">{item.icon('w-4 h-4')}</span>
                  <span className="relative z-10 font-semibold">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Actions utilisateur */}
          <div className="flex items-center gap-4">
            {/* Bouton mobile menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-3 text-black/70 hover:text-black rounded-2xl bg-white/50 backdrop-blur-xl border border-black/10 hover:border-white/30 hover:bg-white/70 hover:shadow-2xl hover:shadow-black/20 hover:scale-105 transition-all duration-500 relative overflow-hidden group"
              aria-label="Menu mobile"
            >
              {/* Couches glass multiples */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/10 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 rounded-2xl border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
              
              <svg className="w-6 h-6 relative z-10 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {/* Menu utilisateur */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/50 backdrop-blur-xl border border-black/10 hover:border-white/30 hover:bg-white/70 hover:shadow-2xl hover:shadow-black/20 hover:scale-105 transition-all duration-500 group relative overflow-hidden"
              >
                {/* Couches glass multiples */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/10 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 rounded-xl border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                
                {/* Avatar avec effet glass */}
                <div className="w-7 h-7 rounded-full bg-[#1b6955] flex items-center justify-center text-white font-semibold text-xs shadow-2xl shadow-black/30 group-hover:shadow-2xl group-hover:shadow-black/40 transition-all duration-500 relative z-10 ring-2 ring-white/30 group-hover:ring-white/50 group-hover:scale-110">
                  {/* Reflet sur l'avatar */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-transparent to-transparent"></div>
                  <span className="relative z-10">{getInitials()}</span>
                </div>
                {/* Info utilisateur - desktop seulement - texte plus petit */}
                <div className="hidden xl:block text-left relative z-10">
                  <p className="text-xs font-semibold text-black transition-colors duration-300 group-hover:text-black leading-tight">
                    {userName || 'Utilisateur'}
                  </p>
                  <p className="text-[10px] text-black/50 truncate max-w-[120px] transition-colors duration-300 group-hover:text-black/70 leading-tight">
                    {userEmail}
                  </p>
                </div>
                {/* Icône chevron */}
                <svg
                  className={`w-3 h-3 text-black/50 transition-all duration-500 relative z-10 group-hover:text-black group-hover:scale-110 ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/30 border border-white/30 overflow-hidden opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]">
                  {/* Effet de lumière en haut */}
                  <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-white/50 via-white/20 to-transparent pointer-events-none"></div>
                  
                  {/* Bordure lumineuse */}
                  <div className="absolute inset-0 rounded-3xl border border-white/40 pointer-events-none"></div>
                  <div className="p-3 relative z-10">
                    <div className="px-4 py-3 border-b border-white/20 mb-2 rounded-xl bg-white/20 backdrop-blur-sm">
                      <p className="text-sm font-semibold text-black">{userName || 'Utilisateur'}</p>
                      <p className="text-xs text-black/60 truncate">{userEmail}</p>
                    </div>
                    
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-black/80 hover:text-black bg-white/40 hover:bg-white/60 backdrop-blur-xl rounded-2xl transition-all duration-500 group relative overflow-hidden mb-2 border border-white/20 hover:border-white/40 hover:shadow-xl hover:shadow-black/10 hover:scale-[1.02]"
                    >
                      {/* Effets glass multiples */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="absolute inset-0 rounded-2xl border border-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                      
                      <svg className="w-5 h-5 text-black/50 group-hover:text-black relative z-10 transition-all duration-500 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="relative z-10 font-medium">Mon Profil</span>
                    </Link>
                    
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-black/80 hover:text-black bg-white/40 hover:bg-white/60 backdrop-blur-xl rounded-2xl transition-all duration-500 group relative overflow-hidden mb-2 border border-white/20 hover:border-white/40 hover:shadow-xl hover:shadow-black/10 hover:scale-[1.02]"
                    >
                      {/* Effets glass multiples */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="absolute inset-0 rounded-2xl border border-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                      
                      <svg className="w-5 h-5 text-black/50 group-hover:text-black relative z-10 transition-all duration-500 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="relative z-10 font-medium">Paramètres</span>
                    </Link>
                    
                    <div className="border-t border-white/20 my-2"></div>
                    
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        signOut({ callbackUrl: '/auth/login' });
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-black/80 hover:text-black bg-white/40 hover:bg-white/60 backdrop-blur-xl rounded-2xl transition-all duration-500 group relative overflow-hidden border border-white/20 hover:border-white/40 hover:shadow-xl hover:shadow-black/10 hover:scale-[1.02]"
                    >
                      {/* Effets glass multiples */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="absolute inset-0 rounded-2xl border border-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                      <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span className="relative z-10">Déconnexion</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Menu mobile */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/20 py-4">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`relative px-5 py-3.5 rounded-2xl font-medium text-sm transition-all duration-200 flex items-center gap-3 ${
                    isActive(item.href)
                      ? 'bg-[#1b6955] text-white shadow-lg ring-2 ring-white/20'
                      : 'text-black/80 hover:text-black bg-white/50 backdrop-blur-xl border border-black/10 hover:bg-white/70 hover:shadow-lg'
                  }`}
                  style={{ zIndex: 10 }}
                >
                  <span className="relative z-10">{item.icon('w-5 h-5')}</span>
                  <span className="relative z-10 font-semibold">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

