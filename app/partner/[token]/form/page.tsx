// ============================================
// Page: Formulaire Step 2 - Revalorisation Partenaire
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PartnerFormStep1 from '@/components/PartnerFormStep1';

export default function PartnerFormPage() {
  const params = useParams();
  const router = useRouter();
  const token = decodeURIComponent(params.token as string);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validatingToken, setValidatingToken] = useState(true);
  const [hasValidated, setHasValidated] = useState(false);

  useEffect(() => {
    // Ne valider qu'une seule fois
    if (hasValidated) return;
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/3121fc83-8978-481b-9c6c-a16197917493',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'form/page.tsx:21',message:'useEffect triggered',data:{hasValidated,token},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // Valider le token et vérifier que Step 1 (inscription) est complété
    const validateToken = async () => {
      try {
        // 1. Valider le token
        const tokenResponse = await fetch(`/api/partners/invitations/by-token/${token}`);
        const tokenData = await tokenResponse.json();
        
        if (!tokenData.valid) {
          setError('Token invalide ou expiré');
          setValidatingToken(false);
          return;
        }

        // 2. Vérifier si Step 1 (inscription) est complété
        try {
          const submissionResponse = await fetch(`/api/partner/submission/${token}`);
          const submissionData = await submissionResponse.json();
          
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/3121fc83-8978-481b-9c6c-a16197917493',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'form/page.tsx:41',message:'Submission status check',data:{success:submissionData.success,status:submissionData.data?.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          
          if (!submissionData.success || !submissionData.data) {
            // Step 1 pas complété, rediriger vers Step 1 (inscription)
            router.push(`/partner/${token}/register`);
            return;
          }

          // Vérifier le statut de la soumission
          const submission = submissionData.data;
          const status = submission.status;
          
          if (status === 'step1_completed' || status === 'step2_completed' || status === 'submitted' || status === 'confirmed') {
            // Step 1 complété, on peut afficher Step 2 (formulaire marque)
          } else if (!status || status === 'pending') {
            // Pas de statut ou statut pending, rediriger vers Step 1
            router.push(`/partner/${token}/register`);
            return;
          } else {
            // Statut inattendu, rediriger vers Step 1
            router.push(`/partner/${token}/register`);
            return;
          }

          // 3. Vérifier si Step 2 est déjà complété (pas besoin de confirmation)
          if (submission.status === 'step2_completed' || 
              submission.status === 'step3_active' || 
              submission.status === 'submitted' || 
              submission.status === 'confirmed') {
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/3121fc83-8978-481b-9c6c-a16197917493',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'form/page.tsx:71',message:'Redirecting to dashboard from form',data:{status:submission.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            // Step 2 déjà complété, rediriger vers Step 3 (dashboard produits)
            window.location.href = `/partner/${token}/dashboard`;
            return;
          }
        } catch (submissionErr) {
          // Pas de soumission existante, Step 1 pas complété
          router.push(`/partner/${token}/register`);
          return;
        }

      } catch (err) {
        console.error('Erreur validation:', err);
        setError('Erreur de connexion');
      } finally {
        setValidatingToken(false);
        setHasValidated(true);
      }
    };

    if (token) {
      validateToken();
    } else {
      setError('Token manquant');
      setValidatingToken(false);
      setHasValidated(true);
    }
  }, [token, router, hasValidated]);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/partner/submit-brand', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: `Erreur HTTP ${response.status}` };
        }
        setError(errorData.error || 'Erreur lors de la soumission');
        setLoading(false);
        return;
      }

      const data = await response.json();

      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/3121fc83-8978-481b-9c6c-a16197917493',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'form/page.tsx:122',message:'Submit response received',data:{success:data.success,status:data.data?.status,nextStepUrl:data.data?.next_step_url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (data.success) {
        setSuccess('Données soumises avec succès ! Redirection...');
        // Rediriger directement vers Step 3 sans attendre de confirmation
        // Passer le statut confirmé dans l'URL pour éviter les problèmes de cache DB
        const confirmedStatus = data.data?.status || 'step2_completed';
        const baseUrl = data.data?.next_step_url || `/partner/${token}/dashboard`;
        const nextStepUrl = `${baseUrl}?status=${confirmedStatus}`;
        
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/3121fc83-8978-481b-9c6c-a16197917493',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'form/page.tsx:139',message:'Scheduling redirect to dashboard',data:{nextStepUrl,submissionStatus:confirmedStatus,delay:500},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
        // #endregion
        
        // Réduire le délai car on passe maintenant le statut dans l'URL
        // Utiliser window.location.href pour une redirection complète et éviter les problèmes de navigation
        setTimeout(() => {
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/3121fc83-8978-481b-9c6c-a16197917493',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'form/page.tsx:149',message:'Executing redirect to dashboard',data:{nextStepUrl,status:confirmedStatus},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
          // #endregion
          window.location.href = nextStepUrl;
        }, 500); // Délai réduit car on n'a plus besoin d'attendre la synchronisation DB
      } else {
        setError(data.error || 'Erreur lors de la soumission');
      }
    } catch (err: any) {
      console.error('Erreur soumission:', err);
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Validation du lien...</div>
      </div>
    );
  }

  if (error && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md">
          <h1 className="text-xl font-bold text-red-600 mb-2">Erreur</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        <PartnerFormStep1 token={token} onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  );
}
