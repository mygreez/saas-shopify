// ============================================
// Composant: Header du Dashboard (Version Simplifiée)
// ============================================

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function DashboardHeaderSimple() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navItems = [
    { href: '/dashboard/partners', label: 'Dashboard' },
    { href: '/dashboard/companies', label: 'Partenaires' },
  ];

  const isActive = (href: string) => {
    return pathname?.startsWith(href);
  };

  // Générer les initiales de l'utilisateur
  const getInitials = () => {
    const userName = session?.user?.name;
    const userEmail = session?.user?.email || 'U';
    
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

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
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
            
            <nav className="hidden md:flex items-center gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    isActive(item.href)
                      ? 'bg-[#1b6955] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Cercle de profil */}
            <Link href="/dashboard/profile">
              <div className="w-10 h-10 rounded-full bg-[#1b6955] flex items-center justify-center text-white font-semibold text-sm shadow-md hover:shadow-lg transition-shadow cursor-pointer hover:scale-105">
                {getInitials()}
              </div>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
