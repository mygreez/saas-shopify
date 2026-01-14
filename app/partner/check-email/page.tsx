// ============================================
// Page: Vérification Email Partenaire
// ============================================
// Permet à un partenaire existant de vérifier son email et accéder à son dashboard

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CheckEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/partner/find-by-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success && data.data?.token) {
        // Email trouvé, rediriger selon le statut
        const redirectTo = data.data.redirect_to || 'dashboard';
        if (redirectTo === 'register') {
          router.push(`/partner/${data.data.token}/register`);
        } else if (redirectTo === 'form') {
          router.push(`/partner/${data.data.token}/form`);
        } else {
          router.push(`/partner/${data.data.token}/dashboard`);
        }
      } else {
        setError(data.error || 'Email incorrect ou non inscrit');
      }
    } catch (err: any) {
      console.error('Erreur vérification email:', err);
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vérification d'accès</h1>
          <p className="text-gray-600 mb-8">Entrez votre email pour accéder à votre espace partenaire</p>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b6955] focus:border-blue-500"
                placeholder="contact@exemple.com"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-[#1b6955] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#165544] focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:ring-offset-2 transition-colors ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Vérification...' : 'Vérifier'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/partner/public/register"
              className="text-[#1b6955] hover:text-[#165544] text-sm font-medium underline"
            >
              Pas encore inscrit ? Créez votre compte
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

