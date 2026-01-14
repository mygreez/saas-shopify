// ============================================
// Page: Inscription Partenaire (Step 1)
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PartnerRegisterForm from '@/components/PartnerRegisterForm';

export default function PartnerRegisterPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatingToken, setValidatingToken] = useState(true);

  useEffect(() => {
    // Valider le token et vérifier si Step 1 est déjà complété
    const validateToken = async () => {
      try {
        // Valider le token
        const tokenResponse = await fetch(`/api/partners/invitations/by-token/${token}`);
        const tokenData = await tokenResponse.json();
        
        if (!tokenData.valid) {
          setError('Token invalide ou expiré');
          setValidatingToken(false);
          return;
        }

        // Vérifier si Step 1 est déjà complété
        try {
          const submissionResponse = await fetch(`/api/partner/submission/${token}`);
          const submissionData = await submissionResponse.json();
          
          if (submissionData.success && submissionData.data && submissionData.data.status === 'step1_completed') {
            // Step 1 déjà complété, rediriger vers Step 2
            router.push(`/partner/${token}/form`);
            return;
          }
        } catch (submissionErr) {
          // Pas de soumission existante, c'est normal pour la première fois
        }

      } catch (err) {
        console.error('Erreur validation:', err);
        setError('Erreur de connexion');
      } finally {
        setValidatingToken(false);
      }
    };

    if (token) {
      validateToken();
    } else {
      setError('Token manquant');
      setValidatingToken(false);
    }
  }, [token, router]);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/partner/register', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // Redirection vers Step 2
        const nextStepUrl = data.data?.next_step_url || `/partner/${token}/form`;
        setTimeout(() => {
          router.push(nextStepUrl);
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

  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#1b6955] border-t-transparent mb-4"></div>
          <p className="text-lg text-gray-700 font-medium">Validation du lien...</p>
          <p className="text-sm text-gray-500 mt-2">Veuillez patienter</p>
        </div>
      </div>
    );
  }

  if (error && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md border border-red-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-red-600">Erreur</h1>
          </div>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

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

        <PartnerRegisterForm token={token} onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  );
}
