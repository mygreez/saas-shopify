// ============================================
// Page: Inscription
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<any>(null);

  // Vérifier si une invitation est présente dans l'URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invitation');
    if (token) {
      setInvitationToken(token);
      // Valider l'invitation
      fetch(`/api/partners/invitations/${token}`)
        .then(res => res.json())
        .then(data => {
          if (data.valid) {
            setInvitationData(data.data);
            setEmail(data.data.email); // Pré-remplir l'email
          } else {
            setError(data.error || 'Invitation invalide ou expirée');
          }
        })
        .catch(() => setError('Erreur lors de la validation de l\'invitation'));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de l\'inscription');
        setLoading(false);
        return;
      }

      // Si c'est une invitation partenaire, accepter l'invitation
      if (invitationToken && data.data?.id) {
        try {
          const acceptResponse = await fetch(`/api/partners/invitations/${invitationToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ partner_id: data.data.id }),
          });

          const acceptData = await acceptResponse.json();
          if (!acceptData.success) {
            console.error('Erreur acceptation invitation:', acceptData.error);
            // On continue quand même, l'utilisateur peut accepter l'invitation plus tard
          }
        } catch (err) {
          console.error('Erreur acceptation invitation:', err);
        }
      }

      // Redirection vers la page de connexion
      router.push('/auth/login?signup=success');
    } catch (err) {
      setError('Une erreur est survenue');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#1b6955] via-purple-600 to-pink-600 bg-clip-text text-transparent">
            my Greez
          </h1>
          <p className="text-slate-600">
            {invitationData ? 'Acceptez votre invitation de partenaire' : 'Créez votre compte gratuitement'}
          </p>
          {invitationData && (
            <div className="mt-4 p-3 bg-[#1b6955]/5 border border-[#1b6955]/20 rounded-lg text-sm text-[#1b6955]">
              <p>Vous avez été invité par <strong>{invitationData.admin.name || invitationData.admin.email}</strong></p>
            </div>
          )}
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-slate-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                Nom (optionnel)
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-transparent transition-all"
                placeholder="Votre nom"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!invitationData} // Désactiver si c'est une invitation
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-transparent transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                placeholder="votre@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-transparent transition-all"
                placeholder="Minimum 6 caractères"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-gradient-to-r from-[#1b6955] to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Déjà un compte ?{' '}
            <Link href="/auth/login" className="font-semibold text-[#1b6955] hover:text-[#165544]">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
