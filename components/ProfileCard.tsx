// ============================================
// Composant: Carte de profil avec effets liquid glass
// ============================================

'use client';

import { ReactNode } from 'react';

interface ProfileCardProps {
  children: ReactNode;
  className?: string;
}

export default function ProfileCard({ children, className = '' }: ProfileCardProps) {
  return (
    <div className={`relative group ${className}`}>
      <div className="relative bg-white/70 backdrop-blur-3xl rounded-3xl border border-black/10 shadow-[0_15px_50px_-10px_rgba(0,0,0,0.1)] overflow-hidden h-full">
        {/* Effet liquid glass multi-couches */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-white/15 to-white/35 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        
        {/* Brillance animée */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
        
        {/* Bordure lumineuse au survol */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-black/10 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        {/* Particules de lumière */}
        <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-black/10 rounded-full blur-sm opacity-0 group-hover:opacity-100 animate-pulse"></div>
        <div className="absolute bottom-4 left-4 w-1 h-1 bg-black/10 rounded-full blur-sm opacity-0 group-hover:opacity-100 animate-pulse animation-delay-2000"></div>
        
        {children}
      </div>
    </div>
  );
}

