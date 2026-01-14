// ============================================
// Page: Dashboard Produits Partenaire (Step 3)
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import PartnerProductDashboard from '@/components/PartnerProductDashboard';

export default function PartnerDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  // Extraire le status de l'URL une seule fois pour éviter les re-renders
  const urlStatus = searchParams.get('status');

  useEffect(() => {
    let isMounted = true;
    
    const validateAndFetch = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Utiliser le urlStatus extrait
        
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/3121fc83-8978-481b-9c6c-a16197917493',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:28',message:'Dashboard entry',data:{hasUrlStatus:!!urlStatus,urlStatus},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
        
        // Si le statut est passé dans l'URL et qu'il est valide, accepter l'accès directement
        if (urlStatus && (urlStatus === 'step2_completed' || 
                          urlStatus === 'step3_active' || 
                          urlStatus === 'submitted' || 
                          urlStatus === 'confirmed')) {
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/3121fc83-8978-481b-9c6c-a16197917493',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:35',message:'Access granted via URL status',data:{urlStatus},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
          // #endregion
          
          // Valider juste le token, puis récupérer les données de soumission pour afficher le dashboard
          const tokenResponse = await fetch(`/api/partners/invitations/by-token/${token}`);
          const tokenData = await tokenResponse.json();
          
          if (!tokenData.valid) {
            setError('Token invalide ou expiré');
            setLoading(false);
            return;
          }
          
          // Récupérer la soumission pour avoir les données complètes (mais on sait déjà que le statut est valide)
          const submissionResponse = await fetch(`/api/partner/submission/${token}`);
          const submissionData = await submissionResponse.json();
          
          if (!isMounted) return;
          
          if (submissionData.success && submissionData.data) {
            setSubmission(submissionData.data);
            
            // Récupérer les produits existants
            const productsResponse = await fetch(`/api/partner/products/${token}`);
            const productsData = await productsResponse.json();
            
            if (!isMounted) return;
            
            if (productsData.success) {
              setProducts(productsData.data || []);
            }
          }
          
          if (!isMounted) return;
          setLoading(false);
          return;
        }
        
        // Fallback : Pas de paramètre status dans l'URL, faire le fetch normal (pour accès directs)
        // 1. Valider le token et récupérer la soumission en parallèle
        const [tokenResponse, submissionResponse] = await Promise.all([
          fetch(`/api/partners/invitations/by-token/${token}`),
          fetch(`/api/partner/submission/${token}`)
        ]);
        
        if (!isMounted) return;
        
        const tokenData = await tokenResponse.json();
        
        if (!tokenData.valid) {
          setError('Token invalide ou expiré');
          setLoading(false);
          return;
        }

        const submissionData = await submissionResponse.json();
        
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/3121fc83-8978-481b-9c6c-a16197917493',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:75',message:'Dashboard submission status check (fallback)',data:{success:submissionData.success,status:submissionData.data?.status,submissionId:submissionData.data?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
        
        if (!submissionData.success || !submissionData.data) {
          // Step 1 ou 2 non complété, rediriger vers Step 1
          router.push(`/partner/${token}/register`);
          return;
        }

        const submission = submissionData.data;
        
        // Vérifier que Step 2 est complété
        if (submission.status === 'step1_completed') {
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/3121fc83-8978-481b-9c6c-a16197917493',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:92',message:'step1_completed found in fallback, redirecting to form',data:{status:submission.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
          // #endregion
          // Step 2 non complété, rediriger vers Step 2
          window.location.href = `/partner/${token}/form`;
          return;
        }

        // Si Step 2 est complété (step2_completed ou tout statut supérieur), on peut accéder au Step 3
        if (submission.status !== 'step2_completed' && 
            submission.status !== 'step3_active' && 
            submission.status !== 'submitted' && 
            submission.status !== 'confirmed') {
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/3121fc83-8978-481b-9c6c-a16197917493',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:105',message:'Redirecting to form - status not allowed',data:{status:submission.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
          // #endregion
          // Si le statut n'est pas step2_completed ou supérieur, rediriger vers Step 2
          window.location.href = `/partner/${token}/form`;
          return;
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/3121fc83-8978-481b-9c6c-a16197917493',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:133',message:'Dashboard access granted (fallback)',data:{status:submission.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
        // #endregion

        if (!isMounted) return;

        // Step 1 et 2 complétés, on peut afficher le dashboard
        setSubmission(submission);

        // 3. Récupérer les produits existants
        const productsResponse = await fetch(`/api/partner/products/${token}`);
        const productsData = await productsResponse.json();
        
        if (!isMounted) return;
        
        if (productsData.success) {
          setProducts(productsData.data || []);
        }

      } catch (err: any) {
        if (!isMounted) return;
        console.error('Erreur:', err);
        setError(err.message || 'Erreur de connexion');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (token) {
      validateAndFetch();
    } else {
      setError('Token manquant');
      setLoading(false);
    }
    
    return () => {
      isMounted = false;
    };
  }, [token, router, urlStatus]);

  const handleProductAdded = async (productsData: any) => {
    // Si c'est un tableau, c'est la liste complète des produits
    if (Array.isArray(productsData)) {
      setProducts(productsData);
    } else {
      // Sinon, c'est un seul produit, on rafraîchit la liste
      try {
        const productsResponse = await fetch(`/api/partner/products/${token}`);
        const productsResponseData = await productsResponse.json();
        
        if (productsResponseData.success) {
          setProducts(productsResponseData.data || []);
        }
      } catch (err) {
        console.error('Erreur rafraîchissement produits:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  if (error) {
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Produits</h1>
          <p className="text-gray-600">Ajoutez et gérez vos produits</p>
        </div>

        <PartnerProductDashboard
          token={token}
          submission={submission}
          products={products}
          onProductAdded={handleProductAdded}
        />
      </div>
    </div>
  );
}

