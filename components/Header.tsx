// ============================================
// Composant: Header / Navigation
// ============================================

'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

export default function Header() {
  const { data: session } = useSession();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 transition-all duration-300 ${
      scrolled 
        ? 'glass shadow-2xl border-b border-white/20 z-50' 
        : 'bg-transparent z-40'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#1b6955] to-purple-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <h1 className="relative text-2xl font-black bg-gradient-to-r from-[#1b6955] via-purple-600 to-pink-600 bg-clip-text text-transparent">
                my Greez
              </h1>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              href="/#features" 
              className="text-slate-700 hover:text-slate-900 font-medium transition-colors relative group"
            >
              Fonctionnalités
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#1b6955] to-purple-600 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link 
              href="/docs" 
              className="text-slate-700 hover:text-slate-900 font-medium transition-colors relative group"
            >
              Documentation
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#1b6955] to-purple-600 group-hover:w-full transition-all duration-300"></span>
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {session ? (
              <Link
                href="/dashboard/partners"
                className="px-6 py-3 bg-gradient-to-r from-[#1b6955] to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-slate-700 hover:text-slate-900 font-semibold transition-colors hidden sm:block"
                >
                  Connexion
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-6 py-3 bg-gradient-to-r from-[#1b6955] to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                  Commencer
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
