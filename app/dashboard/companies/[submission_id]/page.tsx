// ============================================
// Page: Détails d'une entreprise (Admin)
// ============================================
// Affiche les détails complets d'une entreprise avec ses produits

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  status: string;
  created_at: string;
  product_details: {
    title: string;
    sku: string;
    description: string;
    price_greez_ttc: number;
    quantity_uvc: number;
  } | null;
}

interface CompanyDetails {
  invitation_id: string;
  company_name: string;
  email: string;
  contact_name: string | null;
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
      lifestyle_image_url: string | null;
      banner_image_url: string | null;
      label_ecoconception: string | null;
      wetransfer_link: string | null;
      collaboration_reason: string | null;
      press_links: string[] | null;
    } | null;
    excel_file_url: string | null;
    defects_images_urls: string[] | null;
    products: Product[];
  } | null;
}

const statusLabels: Record<string, string> = {
  step1_completed: 'Step 1 complété',
  step2_in_progress: 'Step 2 en cours',
  step2_completed: 'Step 2 complété',
  submitted: 'Soumis',
  confirmed: 'Confirmé',
};

const statusColors: Record<string, string> = {
  step1_completed: 'bg-yellow-100 text-yellow-800',
  step2_in_progress: 'bg-[#1b6955]/10 text-[#1b6955]',
  step2_completed: 'bg-purple-100 text-purple-800',
  submitted: 'bg-[#1b6955]/10 text-[#1b6955]',
  confirmed: 'bg-gray-100 text-gray-800',
};

type ViewMode = 'selection' | 'form' | 'products';

export default function CompanyDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const submissionId = params.submission_id as string;

  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('selection');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }
    if (status === 'loading') {
      return;
    }
    if (session && submissionId) {
      fetchCompanyDetails();
    }
  }, [status, session, router, submissionId]);

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer les détails de l'entreprise
      const response = await fetch(`/api/dashboard/companies/${submissionId}`);
      const data = await response.json();

      if (data.success) {
        setCompany({
          invitation_id: data.data.invitation.id,
          company_name: data.data.invitation.company_name,
          email: data.data.invitation.email,
          contact_name: data.data.invitation.contact_name || null,
          created_at: data.data.invitation.created_at,
          submission: {
            id: data.data.submission.id,
            status: data.data.submission.status,
            created_at: data.data.submission.created_at,
            updated_at: data.data.submission.updated_at,
            brand: data.data.submission.brand,
            excel_file_url: data.data.submission.excel_file_url || null,
            defects_images_urls: data.data.submission.defects_images_urls || [],
            products: data.data.products || [],
          },
        });
      } else {
        setError(data.error || 'Erreur lors du chargement');
      }
    } catch (err: any) {
      console.error('Erreur fetch company details:', err);
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAllProducts = () => {
    if (!company?.submission?.products) return;
    if (selectedProducts.size === company.submission.products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(company.submission.products.map(p => p.id)));
    }
  };

  const handleToggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleOpenExportModal = () => {
    if (selectedProducts.size === 0) {
      alert('Veuillez sélectionner au moins un produit à exporter.');
      return;
    }
    setShowExportModal(true);
  };

  const handleExportToShopify = async () => {
    if (selectedProducts.size === 0) {
      alert('Veuillez sélectionner au moins un produit à exporter.');
      setShowExportModal(false);
      return;
    }

    try {
      setExporting(true);
      setShowExportModal(false);
      
      const response = await fetch(`/api/dashboard/companies/${submissionId}/export-shopify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_ids: Array.from(selectedProducts),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de l\'export');
      }

      // Télécharger le fichier CSV
      const blob = await response.blob();
      
      // Vérifier la taille du fichier (15 Mo = 15 * 1024 * 1024 bytes)
      const maxSize = 15 * 1024 * 1024; // 15 Mo
      if (blob.size > maxSize) {
        throw new Error(`Le fichier CSV est trop volumineux (${(blob.size / 1024 / 1024).toFixed(2)} Mo). La limite est de 15 Mo. Veuillez sélectionner moins de produits.`);
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export-shopify-${submissionId}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert(`Export réussi ! ${selectedProducts.size} produit(s) exporté(s). Le fichier CSV a été téléchargé.`);
      // Réinitialiser la sélection
      setSelectedProducts(new Set());
      // Rafraîchir les détails pour afficher les icônes vertes
      fetchCompanyDetails();
    } catch (err: any) {
      console.error('Erreur export:', err);
      alert(err.message || 'Erreur lors de l\'export');
    } finally {
      setExporting(false);
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

  if (error || !company || !company.submission) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-xl font-bold text-red-600 mb-2">Erreur</h1>
            <p className="text-gray-600">{error || 'Entreprise non trouvée'}</p>
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
            <h1 className="text-3xl font-bold text-gray-900">{company.company_name}</h1>
            <p className="text-gray-600 mt-1">Détails de l'inscription partenaire</p>
          </div>
        </div>

        {/* Carte de sélection */}
        {viewMode === 'selection' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Option 1: Formulaire d'inscription et revalorisation */}
            <div
              onClick={() => setViewMode('form')}
              className="bg-white rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-[#1b6955] transform hover:scale-[1.02] group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#1b6955]/5 rounded-full -mr-16 -mt-16 group-hover:bg-[#1b6955]/10 transition-colors duration-300"></div>
              <div className="text-center relative z-10">
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#1b6955]/10 group-hover:bg-[#1b6955]/20 transition-colors duration-300">
                    <svg className="w-10 h-10 text-[#1b6955] group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-[#1b6955] transition-colors duration-300">
                  Formulaire d'inscription et revalorisation
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Voir les détails du formulaire d'inscription (Step 1) et du formulaire de revalorisation (Step 2)
                </p>
                {company?.submission && (
                  <div className="mb-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                      statusColors[company.submission.status] || 'bg-gray-100 text-gray-800'
                    }`}>
                      {statusLabels[company.submission.status] || company.submission.status}
                    </span>
                  </div>
                )}
                <button className="px-8 py-3 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] font-semibold shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                  Voir les détails
                </button>
              </div>
            </div>

            {/* Option 2: Fiche produit */}
            <div
              onClick={() => setViewMode('products')}
              className="bg-white rounded-xl shadow-lg p-8 cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-[#1b6955] transform hover:scale-[1.02] group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#1b6955]/5 rounded-full -mr-16 -mt-16 group-hover:bg-[#1b6955]/10 transition-colors duration-300"></div>
              <div className="text-center relative z-10">
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#1b6955]/10 group-hover:bg-[#1b6955]/20 transition-colors duration-300">
                    <svg className="w-10 h-10 text-[#1b6955] group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-[#1b6955] transition-colors duration-300">
                  Fiche produit
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Voir les produits ajoutés par le partenaire (Step 3)
                </p>
                {company?.submission?.products && (
                  <div className="mb-4">
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-lg font-bold bg-[#1b6955]/10 text-[#1b6955]">
                      {company.submission.products.length} {company.submission.products.length === 1 ? 'produit' : 'produits'}
                    </span>
                  </div>
                )}
                <button className="px-8 py-3 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] font-semibold shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
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
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border-l-4 border-[#1b6955]">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#1b6955]/10">
                  <span className="text-xl font-bold text-[#1b6955]">1</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Informations d'inscription</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nom d'entreprise</label>
                  <p className="text-base text-gray-900 font-medium">{company.company_name || 'NULL'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <p className="text-base text-gray-900 font-medium">
                    {company.email || company.submission.brand?.contact_email || 'NULL'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nom du contact</label>
                  <p className="text-base text-gray-900 font-medium">
                    {company.contact_name || 'NULL'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date de création</label>
                  <p className="text-base text-gray-900 font-medium">
                    {new Date(company.created_at).toLocaleDateString('fr-FR', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Statut</label>
                  <span
                    className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                      statusColors[company.submission.status] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {statusLabels[company.submission.status] || company.submission.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Informations Step 2 */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border-l-4 border-[#1b6955]">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#1b6955]/10">
                  <span className="text-xl font-bold text-[#1b6955]">2</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Formulaire marque (Revalorisation)</h2>
              </div>
              {company.submission.brand ? (
                <div className="space-y-8">
                  {/* 1. Nom de la Marque */}
                  <div className="bg-gray-50 rounded-lg p-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nom de la Marque</label>
                    <p className="text-lg font-bold text-gray-900">{company.submission.brand.name || 'NULL'}</p>
                  </div>
                  
                  {/* 2. Qui mieux que vous peut parler de vous ? Décrivez votre marque en quelques mots... */}
                  <div className="bg-gray-50 rounded-lg p-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Qui mieux que vous peut parler de vous ? Décrivez votre marque en quelques mots...
                    </label>
                    <p className="text-base text-gray-900 whitespace-pre-wrap leading-relaxed">{company.submission.brand.description || 'NULL'}</p>
                  </div>
                  
                  {/* 3. Importer votre logo au format PNG 500x500px (optionnel) */}
                  <div className="bg-gray-50 rounded-lg p-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Logo de la marque (PNG 500x500px)
                    </label>
                    {company.submission.brand.logo_url ? (
                      <div className="mt-2">
                        <img
                          src={company.submission.brand.logo_url}
                          alt="Logo"
                          className="h-40 w-40 object-contain rounded-xl border-2 border-gray-200 shadow-md"
                        />
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-gray-500 italic bg-white p-3 rounded-lg">NULL</p>
                    )}
                  </div>
                  
                  {/* 4. Importer une image lifestyle (page d'accueil greez) de la marque 1500x1400px (optionnel) */}
                  <div className="bg-gray-50 rounded-lg p-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Image lifestyle (page d'accueil greez) - 1500x1400px
                    </label>
                    {company.submission.brand.lifestyle_image_url ? (
                      <div className="mt-2">
                        <img
                          src={company.submission.brand.lifestyle_image_url}
                          alt="Lifestyle"
                          className="max-w-2xl h-auto rounded-xl border-2 border-gray-200 shadow-md"
                        />
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-gray-500 italic bg-white p-3 rounded-lg">NULL</p>
                    )}
                  </div>
                  
                  {/* 5. Importer une image bannière de la marque 2000x420px (optionnel) */}
                  <div className="bg-gray-50 rounded-lg p-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Image bannière de la marque - 2000x420px
                    </label>
                    {company.submission.brand.banner_image_url ? (
                      <div className="mt-2">
                        <img
                          src={company.submission.brand.banner_image_url}
                          alt="Banner"
                          className="max-w-full h-auto rounded-xl border-2 border-gray-200 shadow-md"
                        />
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-gray-500 italic bg-white p-3 rounded-lg">NULL</p>
                    )}
                  </div>
                  
                  {/* 6. Importer votre matrice */}
                  <div className="bg-gray-50 rounded-lg p-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Matrice Excel (optionnel)
                    </label>
                    {company.submission.excel_file_url ? (
                      <a 
                        href={company.submission.excel_file_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] transition-colors font-medium shadow-md hover:shadow-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Télécharger le fichier Excel
                      </a>
                    ) : (
                      <p className="text-sm text-gray-500 italic bg-white p-3 rounded-lg">NULL</p>
                    )}
                  </div>
                  
                  {/* 7. Ne cachez pas vos défauts */}
                  <div className="bg-gray-50 rounded-lg p-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Photos des défauts esthétiques
                    </label>
                    {company.submission.defects_images_urls && company.submission.defects_images_urls.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                        {company.submission.defects_images_urls.map((url: string, index: number) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Défaut ${index + 1}`}
                              className="w-full h-40 object-cover rounded-lg border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic bg-white p-3 rounded-lg">NULL</p>
                    )}
                  </div>
                  
                  {/* 8. Visuels produits */}
                  <div className="bg-gray-50 rounded-lg p-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Visuels produits (WeTransfer)
                    </label>
                    {company.submission.brand.wetransfer_link ? (
                      <a 
                        href={company.submission.brand.wetransfer_link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center gap-2 text-[#1b6955] hover:text-[#165544] font-medium hover:underline"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        {company.submission.brand.wetransfer_link}
                      </a>
                    ) : (
                      <p className="text-sm text-gray-500 italic bg-white p-3 rounded-lg">NULL</p>
                    )}
                  </div>
                  
                  {/* 9. Label écoconception */}
                  <div className="bg-gray-50 rounded-lg p-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Label écoconception et actions distinctives
                    </label>
                    <p className="text-base text-gray-900 whitespace-pre-wrap leading-relaxed">{company.submission.brand.label_ecoconception || 'NULL'}</p>
                  </div>
                  
                  {/* 10. Raison de collaboration */}
                  <div className="bg-gray-50 rounded-lg p-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Raison de collaboration avec Greez
                    </label>
                    <p className="text-base text-gray-900 whitespace-pre-wrap leading-relaxed">{company.submission.brand.collaboration_reason || 'NULL'}</p>
                  </div>
                  
                  {/* 11. Parutions presses */}
                  <div className="bg-gray-50 rounded-lg p-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Parutions presses
                    </label>
                    {company.submission.brand.press_links && company.submission.brand.press_links.length > 0 ? (
                      <ul className="mt-2 space-y-2">
                        {company.submission.brand.press_links.map((link: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-[#1b6955] mt-1">•</span>
                            <a 
                              href={link} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-[#1b6955] hover:text-[#165544] hover:underline font-medium"
                            >
                              {link}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 italic bg-white p-3 rounded-lg">NULL</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">
                  <p className="mb-4">Le formulaire marque n'a pas encore été complété.</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la Marque</label>
                      <p className="mt-1 text-sm text-gray-500 italic">NULL</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Qui mieux que vous peut parler de vous ? Décrivez votre marque en quelques mots...
                      </label>
                      <p className="mt-1 text-sm text-gray-500 italic">NULL</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Importer votre logo au format PNG 500x500px (optionnel)
                      </label>
                      <p className="mt-1 text-sm text-gray-500 italic">NULL</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Importer une image lifestyle (page d'accueil greez) de la marque 1500x1400px (optionnel)
                      </label>
                      <p className="mt-1 text-sm text-gray-500 italic">NULL</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Importer une image bannière de la marque 2000x420px (optionnel)
                      </label>
                      <p className="mt-1 text-sm text-gray-500 italic">NULL</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Importer votre matrice (dernier délais pour l'envoi de la matrice 1 semaine avant. ne pas envoyer de matrice si les quantités annoncés ne sont pas exactes. L'envoi de plusieurs matrices peut entrainer des erreurs de quantités.) (optionnel)
                      </label>
                      <p className="mt-1 text-sm text-gray-500 italic">NULL</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ne cachez pas vos défauts, montrez-les nous (prenez des photos de vos produits si ils ont des défauts esthétiques.)
                      </label>
                      <p className="mt-1 text-sm text-gray-500 italic">NULL</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Importer vos visuels produits (packshots, ambiances, videos UGC, Videos promotionnelles, visuels avant/après, résultat test d'efficacité...) (optionnel)
                      </label>
                      <p className="mt-1 text-sm text-gray-500 italic">NULL</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Un Label ? une écoconception ? qu'est ce qui vous démarque ? dites-en nous plus sur toutes vos actions :)
                      </label>
                      <p className="mt-1 text-sm text-gray-500 italic">NULL</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        pourquoi collaborer avec Greez ? (ex : "aujourd'hui on a besoin de...", "on cherche à...") (optionnel)
                      </label>
                      <p className="mt-1 text-sm text-gray-500 italic">NULL</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Si vous avez des parutions presses, n'hésitez pas à indiquer le(s) lien(s) de redirection.
                      </label>
                      <p className="mt-1 text-sm text-gray-500 italic">NULL</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Vue Produits */}
        {viewMode === 'products' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border-l-4 border-[#1b6955]">
            <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-[#1b6955]/5 to-transparent">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Fiches produits</h2>
                  <p className="text-sm text-gray-600">
                    {company.submission.products.length} {company.submission.products.length === 1 ? 'produit' : 'produits'} {company.submission.products.length > 0 ? 'créé(s)' : ''}
                    {selectedProducts.size > 0 && (
                      <span className="ml-2 text-[#1b6955] font-semibold">
                        • {selectedProducts.size} sélectionné{selectedProducts.size > 1 ? 's' : ''}
                      </span>
                    )}
                  </p>
                </div>
                {company.submission.products.length > 0 && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSelectAllProducts}
                      className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                    >
                      {selectedProducts.size === company.submission.products.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                    <button
                      onClick={handleOpenExportModal}
                      disabled={exporting || selectedProducts.size === 0}
                      className="px-6 py-3 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                    >
                      {exporting ? (
                        <>
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Export en cours...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Exporter vers Shopify {selectedProducts.size > 0 && `(${selectedProducts.size})`}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
            {company.submission.products.length === 0 ? (
              <div className="p-16 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun produit trouvé</h3>
                <p className="text-gray-600">Aucun produit n'a encore été créé pour cette entreprise.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
                {company.submission.products.map((product) => {
                  // Parser les images si nécessaire (peuvent être en string JSON depuis Supabase)
                  let productImages = product.images || [];
                  if (typeof productImages === 'string') {
                    try {
                      productImages = JSON.parse(productImages);
                    } catch (e) {
                      console.warn('Erreur parsing images produit:', e);
                      productImages = [];
                    }
                  }
                  if (!Array.isArray(productImages)) {
                    productImages = [];
                  }
                  const imageUrl = productImages.length > 0 ? productImages[0] : null;
                  const title = product.name || product.generated_content?.title || product.product_details?.title || 'Sans titre';
                  const description = product.description || product.generated_content?.long_description || product.product_details?.description || 'Aucune description';
                  const price = product.product_details?.price_greez_ttc || product.price || (product.variants && product.variants.length > 0 ? product.variants[0].price : 0);
                  const category = product.category || product.product_details?.product_type || 'Non catégorisé';

                  const isExported = product.raw_data?.shopify_exported || product.raw_data?.shopify_exported_at;

                  const isSelected = selectedProducts.has(product.id);
                  
                  return (
                    <div 
                      key={product.id} 
                      className={`bg-white border-2 rounded-xl p-5 hover:shadow-xl transition-all duration-300 relative group ${
                        isSelected 
                          ? 'border-[#1b6955] bg-[#1b6955]/5' 
                          : 'border-gray-200 hover:border-[#1b6955]'
                      }`}
                    >
                      {/* Checkbox de sélection */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleProduct(product.id);
                        }}
                        className="absolute top-4 left-4 z-10 cursor-pointer"
                        title={isSelected ? 'Désélectionner' : 'Sélectionner'}
                      >
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'bg-[#1b6955] border-[#1b6955]' 
                            : 'bg-white border-gray-300'
                        }`}>
                          {isSelected && (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </button>
                      {/* Bouton d'édition */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProduct(product);
                          setShowEditModal(true);
                        }}
                        className="absolute top-4 right-4 bg-blue-500 hover:bg-blue-600 rounded-full p-2.5 shadow-lg z-10 transition-colors"
                        title="Éditer le produit"
                      >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {/* Icône verte si exporté */}
                      {isExported && (
                        <div className="absolute top-16 right-4 bg-green-500 rounded-full p-2.5 shadow-lg z-10" title="Exporté vers Shopify">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      {imageUrl ? (
                        <div className="relative mb-4 rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={imageUrl}
                            alt={title}
                            className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-56 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-4 flex items-center justify-center">
                          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="mb-3">
                        <span className="inline-block px-3 py-1 bg-[#1b6955]/10 text-[#1b6955] text-xs font-semibold rounded-full">
                          {category}
                        </span>
                      </div>
                      <h3 className="font-bold text-xl mb-2 text-gray-900 line-clamp-2 group-hover:text-[#1b6955] transition-colors">
                        {title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
                        {description}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div>
                          <p className="text-[#1b6955] font-bold text-2xl">{typeof price === 'number' ? price.toFixed(2) : price} €</p>
                          <p className="text-xs text-gray-500 mt-1">TTC</p>
                        </div>
                        {product.product_details?.sku && (
                          <div className="text-right">
                            <p className="text-xs text-gray-500">SKU</p>
                            <p className="text-xs font-medium text-gray-700">{product.product_details.sku}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal d'édition de produit */}
        {showEditModal && editingProduct && (
          <ProductEditModal
            product={editingProduct}
            onClose={() => {
              setShowEditModal(false);
              setEditingProduct(null);
            }}
            onSave={async (updatedData) => {
              try {
                // Les images sont déjà uploadées dans handleSubmit, on envoie juste les URLs
                const response = await fetch(`/api/dashboard/products/${editingProduct.id}/update`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(updatedData),
                });

                const result = await response.json();
                if (result.success) {
                  alert('Produit mis à jour avec succès !');
                  fetchCompanyDetails();
                  setShowEditModal(false);
                  setEditingProduct(null);
                } else {
                  alert(result.error || 'Erreur lors de la mise à jour');
                }
              } catch (error: any) {
                console.error('Erreur mise à jour:', error);
                alert('Erreur lors de la mise à jour du produit');
              }
            }}
          />
        )}

        {/* Modal de confirmation d'export */}
        {showExportModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowExportModal(false)}
          >
            <div 
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Confirmer l'export</h3>
              <p className="text-gray-600 mb-6">
                Vous êtes sur le point d'exporter <strong className="text-[#1b6955]">{selectedProducts.size}</strong> produit(s) vers Shopify.
                <br />
                <span className="text-sm text-gray-500 mt-2 block">Un fichier CSV sera téléchargé (limite: 15 Mo).</span>
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowExportModal(false)}
                  disabled={exporting}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleExportToShopify}
                  disabled={exporting}
                  className="px-6 py-2 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors flex items-center gap-2"
                >
                  {exporting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Export en cours...
                    </>
                  ) : (
                    'Confirmer l\'export'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Composant Modal d'édition de produit
function ProductEditModal({ product, onClose, onSave }: { product: Product; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  // Parser les images existantes
  let existingImages: string[] = [];
  if (product.images) {
    if (typeof product.images === 'string') {
      try {
        existingImages = JSON.parse(product.images);
      } catch (e) {
        existingImages = [];
      }
    } else if (Array.isArray(product.images)) {
      existingImages = product.images;
    }
  }
  
  const [currentImages, setCurrentImages] = useState<string[]>(existingImages);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    brand: product.product_details?.brand_name || product.raw_data?.brand || '',
    product_name: product.name || product.raw_data?.product_name || '',
    subtitle: product.product_details?.subtitle || product.raw_data?.subtitle || '',
    product_type: product.category || product.product_details?.product_type || product.raw_data?.product_type || '',
    sku: product.product_details?.sku || product.raw_data?.sku || '',
    sh: product.product_details?.sh || product.raw_data?.sh || '',
    weight_volume: product.product_details?.weight_volume || product.raw_data?.weight_volume || '',
    lot_number: product.product_details?.lot_number || product.raw_data?.lot_number || '',
    ean: product.product_details?.ean || product.raw_data?.ean || '',
    quantity_uvc: product.product_details?.quantity_uvc || product.raw_data?.quantity_uvc || 0,
    revalorisation_reason: product.product_details?.revalorisation_reason || product.raw_data?.revalorisation_reason || '',
    revalorisation_details: product.product_details?.revalorisation_details || product.raw_data?.revalorisation_details || '',
    revalorisation_wish: product.product_details?.revalorisation_wish || product.raw_data?.revalorisation_wish || '',
    price_standard_ht: product.product_details?.price_standard_ht || product.raw_data?.price_standard_ht || 0,
    price_standard_ttc: product.product_details?.price_standard_ttc || product.raw_data?.price_standard_ttc || 0,
    price_greez_ht: product.product_details?.price_greez_ht || product.raw_data?.price_greez_ht || 0,
    description: product.description || product.generated_content?.long_description || product.product_details?.description || product.raw_data?.description || '',
    actions_efficacites: product.product_details?.actions_efficacites || product.raw_data?.actions_efficacites || '',
    inci_list: product.product_details?.inci_list || product.raw_data?.inci_list || '',
    usage_advice: product.product_details?.usage_advice || product.raw_data?.usage_advice || '',
    endocrine_disruptors: product.product_details?.endocrine_disruptors ? 'OUI' : (product.raw_data?.endocrine_disruptors === 'OUI' ? 'OUI' : 'NON'),
    fragrance_family: product.raw_data?.fragrance_family || '',
    fragrance_notes: product.raw_data?.fragrance_notes || '',
    color_hex: product.product_details?.makeup_color_hex || product.raw_data?.color_hex || '',
  });

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setNewImages(prev => [...prev, ...files]);
      // Créer des previews
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviewUrls(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleImageRemove = (index: number, isNew: boolean) => {
    if (isNew) {
      setNewImages(prev => prev.filter((_, i) => i !== index));
      setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
    } else {
      setCurrentImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setUploadingImages(true);
    
    try {
      // Uploader les nouvelles images
      const uploadedImageUrls: string[] = [];
      
      if (newImages.length > 0) {
        const formDataToUpload = new FormData();
        newImages.forEach((file, index) => {
          formDataToUpload.append(`image_${index}`, file);
          console.log(`📤 Préparation upload image ${index}: ${file.name} (${file.size} bytes)`);
        });
        
        try {
          console.log(`📤 Envoi de ${newImages.length} image(s) à l'API...`);
          const uploadResponse = await fetch('/api/dashboard/products/upload-images', {
            method: 'POST',
            body: formDataToUpload,
          });
          
          const uploadResult = await uploadResponse.json();
          console.log('📥 Réponse API upload:', uploadResult);
          
          if (uploadResponse.ok && uploadResult.success && uploadResult.urls) {
            console.log(`✅ ${uploadResult.urls.length} image(s) uploadée(s) avec succès`);
            uploadedImageUrls.push(...uploadResult.urls);
            
            if (uploadResult.errors && uploadResult.errors.length > 0) {
              console.warn('⚠️ Erreurs partielles:', uploadResult.errors);
              alert(`Attention: ${uploadResult.errors.length} image(s) n'ont pas pu être uploadée(s). Les autres ont été sauvegardées.`);
            }
          } else {
            const errorMsg = uploadResult.error || 'Erreur lors de l\'upload des images';
            console.error('❌ Erreur upload images:', errorMsg, uploadResult);
            throw new Error(errorMsg);
          }
        } catch (uploadError: any) {
          console.error('❌ Erreur upload images:', uploadError);
          const errorMsg = uploadError.message || 'Erreur lors de l\'upload des images. Veuillez réessayer.';
          alert(errorMsg);
          throw uploadError;
        }
      }
      
      // Combiner les images existantes (non supprimées) avec les nouvelles
      const finalImages = [...currentImages, ...uploadedImageUrls];
      
      // Sauvegarder avec les images
      await onSave({
        ...formData,
        images: finalImages,
      });
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity_uvc' || name.startsWith('price_') ? (value === '' ? 0 : parseFloat(value) || 0) : value,
    }));
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-2xl font-bold text-gray-900">Éditer le produit</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Section 1 - Identité Produit */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Identité Produit</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Marque *</label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Titre du produit *</label>
                <input
                  type="text"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Sous-titre</label>
                <input
                  type="text"
                  name="subtitle"
                  value={formData.subtitle}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Type de produit *</label>
                <select
                  name="product_type"
                  value={formData.product_type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                  required
                >
                  <option value="">Sélectionnez un type</option>
                  <option value="Produit pour le visage">Produit pour le visage</option>
                  <option value="Produit pour le corps">Produit pour le corps</option>
                  <option value="Cheveux">Cheveux</option>
                  <option value="Maquillage">Maquillage</option>
                  <option value="Parfum">Parfum</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2 - Identification & Logistique */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Identification & Logistique</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">SKU *</label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Code SH / HS *</label>
                <input
                  type="text"
                  name="sh"
                  value={formData.sh}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Poids/Volume *</label>
                <input
                  type="text"
                  name="weight_volume"
                  value={formData.weight_volume}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Numéro de lot</label>
                <input
                  type="text"
                  name="lot_number"
                  value={formData.lot_number}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">EAN</label>
                <input
                  type="text"
                  name="ean"
                  value={formData.ean}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Quantité disponible (UVC) *</label>
                <input
                  type="number"
                  name="quantity_uvc"
                  value={formData.quantity_uvc}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 4 - Prix */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Prix & Commission</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Prix standard HT *</label>
                <input
                  type="number"
                  name="price_standard_ht"
                  value={formData.price_standard_ht}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Prix standard TTC *</label>
                <input
                  type="number"
                  name="price_standard_ttc"
                  value={formData.price_standard_ttc}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Prix remisé GREEZ HT *</label>
                <input
                  type="number"
                  name="price_greez_ht"
                  value={formData.price_greez_ht}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 7 - Images Produit */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Images Produit</h4>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Images actuelles</label>
              {currentImages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {currentImages.map((imageUrl, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={imageUrl}
                        alt={`Produit ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleImageRemove(index, false)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Supprimer cette image"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-4">Aucune image actuelle</p>
              )}
              
              {/* Prévisualisation des nouvelles images */}
              {imagePreviewUrls.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nouvelles images à ajouter</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {imagePreviewUrls.map((previewUrl, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={previewUrl}
                          alt={`Nouvelle ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border-2 border-blue-300"
                        />
                        <button
                          type="button"
                          onClick={() => handleImageRemove(index, true)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Annuler l'ajout"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Bouton pour ajouter de nouvelles images */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ajouter de nouvelles images
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageAdd}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955] cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">Vous pouvez sélectionner plusieurs images à la fois</p>
              </div>
            </div>
          </div>

          {/* Section 5 - Contenu Produit */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Contenu Produit</h4>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description produit *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Actions & efficacités produit *</label>
              <input
                type="text"
                name="actions_efficacites"
                value={formData.actions_efficacites}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Liste INCI *</label>
              <textarea
                name="inci_list"
                value={formData.inci_list}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Conseils d'utilisation *</label>
              <textarea
                name="usage_advice"
                value={formData.usage_advice}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Perturbateurs endocriniens *</label>
              <select
                name="endocrine_disruptors"
                value={formData.endocrine_disruptors}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                required
              >
                <option value="NON">NON</option>
                <option value="OUI">OUI</option>
              </select>
            </div>
          </div>

          {/* Section 6 - Champs conditionnels */}
          {(formData.product_type === 'Parfum' || formData.product_type === 'Maquillage') && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Champs spécifiques</h4>
              {formData.product_type === 'Parfum' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Famille olfactive *</label>
                    <input
                      type="text"
                      name="fragrance_family"
                      value={formData.fragrance_family}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Notes olfactives *</label>
                    <input
                      type="text"
                      name="fragrance_notes"
                      value={formData.fragrance_notes}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                      required
                    />
                  </div>
                </div>
              )}
              {formData.product_type === 'Maquillage' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Couleur hexadécimale *</label>
                  <input
                    type="text"
                    name="color_hex"
                    value={formData.color_hex}
                    onChange={handleChange}
                    pattern="#[A-Fa-f0-9]{6}|#[A-Fa-f0-9]{3}"
                    placeholder="#FF5733"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                    required
                  />
                </div>
              )}
            </div>
          )}

          {/* Section 3 - Revalorisation */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Revalorisation (INTERNE)</h4>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Raison de la revalorisation *</label>
              <select
                name="revalorisation_reason"
                value={formData.revalorisation_reason}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                required
              >
                <option value="">Sélectionnez une raison</option>
                <option value="leger_defaut">Léger défaut esthétique</option>
                <option value="fin_collection">Fin de collection</option>
                <option value="surstock">Surstock</option>
                <option value="changement_packaging">Changement de packaging</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Détails de la revalorisation *</label>
              <textarea
                name="revalorisation_details"
                value={formData.revalorisation_details}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Souhait de revalorisation *</label>
              <input
                type="text"
                name="revalorisation_wish"
                value={formData.revalorisation_wish}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                required
              />
            </div>
          </div>

          {/* Boutons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || uploadingImages}
              className="px-6 py-2 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors flex items-center gap-2"
            >
              {(loading || uploadingImages) ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {uploadingImages ? 'Upload des images...' : 'Enregistrement...'}
                </>
              ) : (
                'Enregistrer les modifications'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


