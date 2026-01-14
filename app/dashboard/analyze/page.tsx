// ============================================
// Page: Analyse de boutique
// ============================================

'use client';

import { useState, useEffect } from 'react';

export default function AnalyzePage() {
  const [shopDomain, setShopDomain] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!shopDomain) {
      setError('Veuillez sélectionner une boutique');
      return;
    }

    setAnalyzing(true);
    setError('');

    try {
      const response = await fetch(`/api/shopify/analyze?shop=${shopDomain}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'analyse');
      }

      setAnalysis(data.data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'analyse');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            📊 Analyser votre boutique
          </h1>
          <p className="text-slate-600">Analysez votre boutique Shopify pour optimiser vos produits</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 shadow-sm">
            {error}
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-6 border border-slate-200">
          <h2 className="text-2xl font-semibold mb-6 text-slate-900">Sélectionner une boutique</h2>
          
          <div className="flex gap-4">
            <input
              type="text"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
              placeholder="ma-boutique.myshopify.com"
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
            />
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !shopDomain}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:transform-none"
            >
              {analyzing ? '⏳ Analyse...' : '📊 Analyser'}
            </button>
          </div>
        </div>

        {analysis && (
          <div className="space-y-6">
            {/* Statistiques générales */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-200">
              <h2 className="text-2xl font-semibold mb-6 text-slate-900">📈 Statistiques générales</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{analysis.total_products}</div>
                  <div className="text-sm text-gray-600">Produits</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{analysis.products_stats.published}</div>
                  <div className="text-sm text-gray-600">Publiés</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-600">{analysis.products_stats.draft}</div>
                  <div className="text-sm text-gray-600">Brouillons</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600">{analysis.total_collections}</div>
                  <div className="text-sm text-gray-600">Collections</div>
                </div>
              </div>
            </div>

            {/* Top catégories */}
            {analysis.top_categories && analysis.top_categories.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-200">
                <h2 className="text-2xl font-semibold mb-6 text-slate-900">🏷️ Catégories les plus utilisées</h2>
                <div className="space-y-2">
                  {analysis.top_categories.map((cat: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span>{cat.category}</span>
                      <span className="font-semibold">{cat.count} produits</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top tags */}
            {analysis.top_tags && analysis.top_tags.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-200">
                <h2 className="text-2xl font-semibold mb-6 text-slate-900">🏷️ Tags les plus utilisés</h2>
                <div className="flex flex-wrap gap-2">
                  {analysis.top_tags.map((tag: any, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {tag.tag} ({tag.count})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommandations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-200">
                <h2 className="text-2xl font-semibold mb-6 text-slate-900">💡 Recommandations</h2>
                <ul className="space-y-2">
                  {analysis.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

