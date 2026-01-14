// ============================================
// Composant: Footer
// ============================================

'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="relative bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-slate-300 border-t border-slate-700/50 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(168,85,247,0.1),transparent_50%)]"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <h2 className="text-3xl font-black bg-gradient-to-r from-[#1b6955] via-purple-400 to-pink-400 bg-clip-text text-transparent mb-6">
              my Greez
            </h2>
            <p className="text-slate-400 mb-6 max-w-md leading-relaxed text-lg">
              L'IA qui transforme vos images en fiches produits Shopify parfaites. 
              <span className="text-white font-semibold"> 100% gratuit, 100% puissant.</span>
            </p>
            <div className="flex gap-4">
              {['Twitter', 'LinkedIn', 'GitHub'].map((social) => (
                <a 
                  key={social}
                  href="#" 
                  className="w-12 h-12 glass border border-slate-700/50 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:border-blue-500/50 hover:scale-110 transition-all duration-300"
                >
                  {social[0]}
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6">Produit</h3>
            <ul className="space-y-3">
              {[
                { href: '/#features', label: 'Fonctionnalités' },
                { href: '/docs', label: 'Documentation' },
                { href: '/dashboard/partners', label: 'Dashboard' },
                { href: '/docs/demo-mode', label: 'Mode Démo' }
              ].map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href} 
                    className="text-slate-400 hover:text-white transition-colors relative group inline-block"
                  >
                    {link.label}
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#1b6955] to-purple-400 group-hover:w-full transition-all duration-300"></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6">Support</h3>
            <ul className="space-y-3">
              {[
                { href: '/docs/getting-started', label: 'Guide de démarrage' },
                { href: '/docs/authentication', label: 'Authentification' },
                { href: 'mailto:support@photify.app', label: 'Contact', external: true },
                { href: '/docs/demo-mode', label: 'Mode Démo' }
              ].map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a 
                      href={link.href} 
                      className="text-slate-400 hover:text-white transition-colors relative group inline-block"
                    >
                      {link.label}
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#1b6955] to-purple-400 group-hover:w-full transition-all duration-300"></span>
                    </a>
                  ) : (
                    <Link 
                      href={link.href} 
                      className="text-slate-400 hover:text-white transition-colors relative group inline-block"
                    >
                      {link.label}
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#1b6955] to-purple-400 group-hover:w-full transition-all duration-300"></span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-slate-700/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} my Greez. Tous droits réservés.
          </p>
          <div className="flex gap-8">
            {['Confidentialité', 'Conditions'].map((link) => (
              <Link 
                key={link}
                href={`/${link.toLowerCase()}`} 
                className="text-slate-500 hover:text-white text-sm transition-colors"
              >
                {link}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
