// ============================================
// Page: Inscription Partenaire Publique
// ============================================
// Page publique d'inscription pour les partenaires (sans token requis)

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PartnerRegisterForm from '@/components/PartnerRegisterForm';

export default function PublicPartnerRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);

    try {
      // Créer une invitation et obtenir un token
      const companyName = formData.get('company_name') as string;
      const email = formData.get('email') as string;
      const contactName = formData.get('contact_name') as string;

      const inviteResponse = await fetch('/api/partner/public-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          email: email,
        }),
      });

      const inviteData = await inviteResponse.json();

      if (!inviteData.success) {
        throw new Error(inviteData.error || 'Erreur lors de la création de l\'invitation');
      }

      const token = inviteData.data.token;

      // Enregistrer avec le token
      const registerFormData = new FormData();
      registerFormData.append('token', token);
      registerFormData.append('company_name', companyName);
      registerFormData.append('email', email);
      registerFormData.append('contact_name', contactName);

      const response = await fetch('/api/partner/register', {
        method: 'POST',
        body: registerFormData,
      });

      const data = await response.json();

      if (data.success) {
        // Redirection vers Step 2
        const nextStepUrl = data.data?.next_step_url || `/partner/${token}/form`;
        setTimeout(() => {
          window.location.href = nextStepUrl;
        }, 500);
      } else {
        setError(data.error || 'Erreur lors de l\'inscription');
      }
    } catch (err: any) {
      console.error('Erreur:', err);
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-[#1b6955]/5 py-8 md:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg shadow-md animate-fade-in">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold">{error}</span>
            </div>
          </div>
        )}

        <PartnerRegisterForm token="public" onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  );
}

