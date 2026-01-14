// ============================================
// Page: Dashboard Entreprises (Admin)
// ============================================
// Affiche toutes les entreprises avec leurs soumissions et produits

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CompanyCard from '@/components/CompanyCard';
import { fetchJsonWithTimeout } from '@/lib/utils/fetchWithTimeout';

interface Company {
  invitation_id: string;
  company_name: string;
  email: string;
  contact_name?: string;
  created_at: string;
  submission: {
    id: string;
    status: string;
    created_at: string;
    updated_at: string;
    brand: {
      id: string;
      name: string;
      contact_email: string;
      logo_url: string | null;
      description: string | null;
    } | null;
    product_count: number;
  } | null;
}


export default function CompaniesDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; totalPages: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Fonctions helper memoizées pour éviter les recréations
  const getStatusLabel = useMemo(() => (status: string | null) => {
    if (!status) return 'Non commencé';
    const statusMap: Record<string, string> = {
      'step1_completed': 'Étape 1 complétée',
      'step2_completed': 'Étape 2 complétée',
      'step3_active': 'Étape 3 active',
      'submitted': 'Soumis',
      'confirmed': 'Confirmé',
      'published': 'Publié',
    };
    return statusMap[status] || status;
  }, []);

  const getStatusColor = useMemo(() => (status: string | null) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    const colorMap: Record<string, string> = {
      'step1_completed': 'bg-yellow-100 text-yellow-800',
      'step2_completed': 'bg-[#1b6955]/10 text-[#1b6955]',
      'step3_active': 'bg-purple-100 text-purple-800',
      'submitted': 'bg-green-100 text-green-800',
      'confirmed': 'bg-gray-100 text-gray-800',
      'published': 'bg-indigo-100 text-indigo-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }
    if (status === 'loading') {
      return;
    }
    if (session) {
      fetchCompanies();
    }
  }, [status, session, router]);

  const fetchCompanies = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchJsonWithTimeout<{ 
        success: boolean; 
        data?: Company[]; 
        error?: string; 
        details?: any;
        pagination?: { page: number; limit: number; total: number; totalPages: number };
      }>(`/api/dashboard/companies?page=${page}&limit=50`, {
        timeout: 15000, // 15 secondes pour cette requête plus lourde
      });
      
      console.log('📦 Réponse API companies:', data);

      if (data.success && data.data) {
        setCompanies(data.data);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        const errorMessage = data.error || 'Erreur lors du chargement';
        const errorDetails = data.details ? JSON.stringify(data.details, null, 2) : '';
        console.error('❌ Erreur API companies:', { error: errorMessage, details: data.details });
        setError(errorMessage + (errorDetails ? `\n\nDétails:\n${errorDetails}` : ''));
      }
    } catch (err: any) {
      console.error('Erreur fetch companies:', err);
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, []);

  // Appeler fetchCompanies quand la session est prête ou quand la page change
  useEffect(() => {
    if (status === 'authenticated' && session) {
      fetchCompanies(currentPage);
    }
  }, [status, session, fetchCompanies, currentPage]);

  const handleConfirm = async (submissionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir confirmer cette soumission ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/dashboard/companies/${submissionId}/confirm`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        // Rafraîchir la liste
        fetchCompanies();
      } else {
        alert(data.error || 'Erreur lors de la confirmation');
      }
    } catch (err: any) {
      console.error('Erreur confirmation:', err);
      alert('Erreur lors de la confirmation');
    }
  };

  const handleDelete = async (invitationId: string, companyName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'entreprise "${companyName}" ? Cette action supprimera également toutes les soumissions et produits associés.`)) {
      return;
    }

    try {
      setDeleting(invitationId);
      setError(null);
      
      const response = await fetch(`/api/dashboard/companies/${invitationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Erreur HTTP ${response.status}`;
        const errorDetails = errorData.details ? JSON.stringify(errorData.details, null, 2) : '';
        throw new Error(errorMessage + (errorDetails ? `\n\nDétails:\n${errorDetails}` : ''));
      }

      const data = await response.json();

      if (data.success) {
        // Rafraîchir la liste
        fetchCompanies();
      } else {
        throw new Error(data.error || 'Erreur lors de la suppression');
      }
    } catch (err: any) {
      console.error('Erreur suppression:', err);
      setError(err.message || 'Erreur lors de la suppression');
      // Afficher l'erreur pendant 5 secondes
      setTimeout(() => setError(null), 5000);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Mes partenaires</h1>
          <p className="text-gray-600 mt-1">Gérez toutes les entreprises et leurs soumissions</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <div className="font-semibold mb-2">{error.split('\n\n')[0]}</div>
            {error.includes('Détails:') && (
              <details className="mt-2 text-sm" open>
                <summary className="cursor-pointer text-red-600 hover:text-red-800 font-medium">
                  Détails techniques
                </summary>
                <pre className="mt-2 p-3 bg-red-50 rounded text-xs overflow-auto max-h-96">
                  {error.split('Détails:')[1] || error}
                </pre>
              </details>
            )}
          </div>
        )}

        {companies.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500">Aucune inscription trouvée.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entreprise
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Étape
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produits
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {companies.map((company) => {

                    return (
                      <tr key={company.invitation_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {company.submission?.brand?.logo_url && (
                              <img
                                src={company.submission.brand.logo_url}
                                alt={company.company_name}
                                className="h-10 w-10 rounded-full object-cover mr-3"
                                loading="lazy"
                              />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {company.company_name || 'Sans nom'}
                              </div>
                              <div className="text-sm text-gray-500">{company.email || '-'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {company.contact_name || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(company.submission?.status || null)}`}>
                            {getStatusLabel(company.submission?.status || null)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {company.submission?.product_count || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(company.created_at).toLocaleDateString('fr-FR')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            {company.submission ? (
                              <Link
                                href={`/dashboard/companies/${company.submission.id}`}
                                className="px-4 py-2 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] text-sm"
                              >
                                {company.submission.product_count > 0 ? 'Fiche produit' : 'Voir détails'}
                              </Link>
                            ) : (
                              <Link
                                href={`/dashboard/companies/invitation/${company.invitation_id}`}
                                className="px-4 py-2 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] text-sm"
                              >
                                Voir détails
                              </Link>
                            )}
                            <button
                              onClick={() => handleDelete(company.invitation_id, company.company_name)}
                              disabled={deleting === company.invitation_id}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                            >
                              {deleting === company.invitation_id ? 'Suppression...' : 'Supprimer'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Affichage de {(pagination.page - 1) * pagination.limit + 1} à {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total} entreprises
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Précédent
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-700">
                    Page {pagination.page} sur {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                    disabled={currentPage >= pagination.totalPages}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

