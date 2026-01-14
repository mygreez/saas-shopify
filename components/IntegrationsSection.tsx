// ============================================
// Composant: Section Intégrations
// ============================================

'use client';

import { useState } from 'react';
import { ShopifyConnection } from '@/types';
import Link from 'next/link';

interface IntegrationsSectionProps {
  shopifyConnections: ShopifyConnection[];
}

export default function IntegrationsSection({ shopifyConnections: initialConnections }: IntegrationsSectionProps) {
  const [shopifyConnections, setShopifyConnections] = useState(initialConnections);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleDisconnectShopify = async (connectionId: string, shopDomain: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir déconnecter ${shopDomain} ?`)) {
      return;
    }

    setDisconnecting(connectionId);
    setError('');

    try {
      const response = await fetch(`/api/shopify/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la déconnexion');
      }

      // Retirer la connexion de la liste
      setShopifyConnections(prev => prev.filter(conn => conn.id !== connectionId));
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la déconnexion');
    } finally {
      setDisconnecting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Intégrations */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Intégrations
          </h2>
          <p className="text-sm text-slate-600">
            Connectez vos plateformes e-commerce pour synchroniser vos produits
          </p>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Shopify Integration */}
        <div className="border border-slate-200 rounded-lg p-5 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 6h10l-1 10H8L7 6z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 4c0-1.1.9-2 2-2s2 .9 2 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 4h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M10.5 10.5c-.5.3-.8.8-.8 1.3 0 .6.4 1.1 1 1.3.6.2 1.2.1 1.6-.2.4-.3.6-.8.5-1.3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10.5 13.5c.5.3 1.1.4 1.6.2.5-.2.8-.7.8-1.3 0-.5-.3-1-.8-1.3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Shopify</h3>
                <p className="text-sm text-slate-600">Connectez votre boutique Shopify</p>
              </div>
            </div>
            <Link
              href="/dashboard/shopify/connect"
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              {shopifyConnections.length > 0 ? 'Connecter une autre boutique' : 'Se connecter'}
            </Link>
          </div>

          {/* Liste des boutiques connectées */}
          {shopifyConnections.length > 0 ? (
            <div className="space-y-3 mt-4">
              {shopifyConnections.map((connection) => (
                <div
                  key={connection.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium text-slate-900">{connection.shop_domain}</p>
                      <p className="text-xs text-slate-500">
                        Connecté le {new Date(connection.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDisconnectShopify(connection.id, connection.shop_domain)}
                    disabled={disconnecting === connection.id}
                    className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {disconnecting === connection.id ? 'Déconnexion...' : 'Déconnecter'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-600 text-center">
                Aucune boutique Shopify connectée
              </p>
            </div>
          )}
        </div>

        {/* Mes Opain AI Integration (À venir) */}
        <div className="border border-slate-200 rounded-lg p-5 mb-4 opacity-60">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-[#1b6955]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Mes Opain AI</h3>
                <p className="text-sm text-slate-600">Intégration avec Mes Opain AI</p>
              </div>
            </div>
            <button
              disabled
              className="px-4 py-2 bg-slate-300 text-slate-500 rounded-lg text-sm font-medium cursor-not-allowed"
            >
              Bientôt disponible
            </button>
          </div>
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-500 text-center">
              Cette intégration sera disponible prochainement
            </p>
          </div>
        </div>

        {/* VEO 3 Integration (À venir) */}
        <div className="border border-slate-200 rounded-lg p-5 opacity-60">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">VEO 3</h3>
                <p className="text-sm text-slate-600">Intégration avec VEO 3</p>
              </div>
            </div>
            <button
              disabled
              className="px-4 py-2 bg-slate-300 text-slate-500 rounded-lg text-sm font-medium cursor-not-allowed"
            >
              Bientôt disponible
            </button>
          </div>
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-500 text-center">
              Cette intégration sera disponible prochainement
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

