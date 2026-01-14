// ============================================
// Page: Détails d'une invitation (Admin)
// ============================================
// Affiche les détails d'une invitation (Step 1) même si Step 2/3 ne sont pas complétés

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface InvitationDetails {
  invitation_id: string;
  company_name: string;
  email: string;
  contact_name: string | null;
  created_at: string;
  token: string;
  status: string;
  submission: {
    id: string;
    status: string;
    brand: {
      id: string;
      name: string;
      contact_email: string;
      logo_url: string | null;
      description: string | null;
      lifestyle_image_url: string | null;
      banner_image_url: string | null;
    } | null;
    products: any[];
  } | null;
}

type ViewMode = 'selection' | 'form' | 'products';

export default function InvitationDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const invitationId = params.invitation_id as string;

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('selection');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }
    if (status === 'loading') {
      return;
    }
    if (session && invitationId) {
      fetchInvitationDetails();
    }
  }, [status, session, router, invitationId]);

  const fetchInvitationDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/dashboard/companies/invitation/${invitationId}`);
      const data = await response.json();

      if (data.success) {
        setInvitation(data.data);
      } else {
        setError(data.error || 'Erreur lors du chargement');
      }
    } catch (err: any) {
      console.error('Erreur fetch invitation details:', err);
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1b6955] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-xl font-bold text-red-600 mb-2">Erreur</h1>
            <p className="text-gray-600">{error || 'Invitation non trouvée'}</p>
            <Link
              href="/dashboard/companies"
              className="mt-4 inline-block text-[#1b6955] hover:text-[#165544]"
            >
              ← Retour à la liste
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <Link
              href="/dashboard/companies"
              className="text-[#1b6955] hover:text-[#165544] mb-2 inline-block"
            >
              ← Retour à Mes fiches produit
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{invitation.company_name}</h1>
            <p className="text-gray-600 mt-1">Détails de l'inscription partenaire</p>
          </div>
          {viewMode !== 'selection' && (
            <button
              onClick={() => setViewMode('selection')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              ← Retour au menu
            </button>
          )}
        </div>

        {/* Carte de sélection */}
        {viewMode === 'selection' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Option 1: Formulaire d'inscription et revalorisation */}
            <div
              onClick={() => setViewMode('form')}
              className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-[#1b6955]"
            >
              <div className="text-center">
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto text-[#1b6955]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Formulaire d'inscription et revalorisation</h3>
                <p className="text-gray-600 mb-4">
                  Voir les détails du formulaire d'inscription (Step 1) et du formulaire de revalorisation (Step 2)
                </p>
                <button className="px-6 py-2 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] font-medium">
                  Voir les détails
                </button>
              </div>
            </div>

            {/* Option 2: Fiche produit */}
            <div
              onClick={() => {
                if (invitation.submission?.id) {
                  router.push(`/dashboard/companies/${invitation.submission.id}`);
                } else {
                  setViewMode('products');
                }
              }}
              className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-green-500"
            >
              <div className="text-center">
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Fiche produit</h3>
                <p className="text-gray-600 mb-4">
                  Voir les produits ajoutés par le partenaire (Step 3)
                </p>
                <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                  Voir les produits
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Vue Formulaire d'inscription et revalorisation */}
        {viewMode === 'form' && (
          <>
            {/* Informations Step 1 */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Étape 1 - Informations d'inscription</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom d'entreprise</label>
                  <p className="mt-1 text-sm text-gray-900">{invitation.company_name || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{invitation.email || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom du contact</label>
                  <p className="mt-1 text-sm text-gray-900">{invitation.contact_name || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date de création</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(invitation.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Statut</label>
                  <span className="mt-1 inline-block px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Étape 1 complétée
                  </span>
                </div>
              </div>
            </div>

            {/* Informations Step 2 */}
            {invitation.submission && invitation.submission.brand ? (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-bold mb-4">Étape 2 - Formulaire marque (Revalorisation)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {invitation.submission.brand.logo_url && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                      <img
                        src={invitation.submission.brand.logo_url}
                        alt="Logo"
                        className="h-32 w-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nom de la marque</label>
                    <p className="mt-1 text-sm text-gray-900">{invitation.submission.brand.name || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email de contact</label>
                    <p className="mt-1 text-sm text-gray-900">{invitation.submission.brand.contact_email || '-'}</p>
                  </div>
                  {invitation.submission.brand.description && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <p className="mt-1 text-sm text-gray-900">{invitation.submission.brand.description}</p>
                    </div>
                  )}
                  {invitation.submission.brand.lifestyle_image_url && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Image lifestyle</label>
                      <img
                        src={invitation.submission.brand.lifestyle_image_url}
                        alt="Lifestyle"
                        className="max-w-md h-auto rounded-lg"
                      />
                    </div>
                  )}
                  {invitation.submission.brand.banner_image_url && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bannière</label>
                      <img
                        src={invitation.submission.brand.banner_image_url}
                        alt="Banner"
                        className="max-w-full h-auto rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-bold mb-4">Étape 2 - Formulaire marque (Revalorisation)</h2>
                <p className="text-gray-500">Le formulaire marque n'a pas encore été complété.</p>
              </div>
            )}
          </>
        )}

        {/* Vue Produits */}
        {viewMode === 'products' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            {invitation.submission && invitation.submission.products && invitation.submission.products.length > 0 ? (
              <>
                <h2 className="text-xl font-bold mb-4">Étape 3 - Produits ({invitation.submission.products.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {invitation.submission.products.map((product: any) => (
                    <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                      {product.images && product.images.length > 0 && (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-48 object-cover rounded-lg mb-3"
                        />
                      )}
                      <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                      <p className="text-md font-bold text-gray-800 mt-2">{product.price?.toFixed(2)} €</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-4">Étape 3 - Produits</h2>
                <p className="text-gray-500">Aucun produit n'a encore été ajouté.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

