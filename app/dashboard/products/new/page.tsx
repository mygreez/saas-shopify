// ============================================
// Page: Nouveau produit - Import Excel
// ============================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface ProductPreview {
  id: string;
  name: string;
  images?: string[];
  description?: string;
  variants?: Array<{
    title: string;
    price: string;
    option1?: string;
    option2?: string;
  }>;
  status: 'draft' | 'published';
}

export default function NewProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [products, setProducts] = useState<ProductPreview[]>([]);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [partnerToken, setPartnerToken] = useState<string | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<{ email: string; admin: { name: string; email: string } } | null>(null);
  const [viewMode, setViewMode] = useState<'import' | 'partner-link'>('import');
  
  // États pour la gestion des liens partenaires
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [partnerLinks, setPartnerLinks] = useState<Array<{
    id: string;
    email: string;
    name: string | null;
    partner_link: string;
    expires_at: string;
    status: string;
  }>>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Charger les liens partenaires disponibles
  const loadPartnerLinks = async () => {
    setLoadingLinks(true);
    try {
      const response = await fetch('/api/partners/invitations');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setPartnerLinks(data.data);
        }
      }
    } catch (error) {
      console.error('Erreur chargement liens:', error);
    } finally {
      setLoadingLinks(false);
    }
  };

  // Détecter le token dans l'URL
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setPartnerToken(token);
      setViewMode('import'); // Forcer le mode import si token présent
      // Valider le token
      fetch(`/api/partners/invitations/${token}`)
        .then(res => res.json())
        .then(data => {
          if (data.valid) {
            setPartnerInfo({
              email: data.data.email,
              admin: data.data.admin,
            });
          }
        })
        .catch(() => {});
    } else {
      // Charger les liens si on est en mode partenaire
      if (viewMode === 'partner-link') {
        loadPartnerLinks();
      }
    }
  }, [searchParams, viewMode]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const excelFile = files.find(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
    
    if (excelFile) {
      setExcelFile(excelFile);
      setError('');
    }
  };

  const handleExcelFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setExcelFile(file);
      setError('');
    }
  };

  const handleImport = async () => {
    if (!excelFile) {
      setError('Veuillez sélectionner un fichier Excel');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', excelFile);
      formData.append('type', 'excel');
      formData.append('confirm', 'true'); // Créer directement les produits

      // Ajouter le token partenaire si présent
      if (partnerToken) {
        formData.append('partner_token', partnerToken);
      }

      // Simuler la progression
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      const response = await fetch('/api/products/import', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || 'Erreur lors de l\'import';
        const details = data.details ? `\n\nDétails:\n${data.details.join('\n')}` : '';
        const debug = data.debug ? `\n\nDebug:\n${JSON.stringify(data.debug, null, 2)}` : '';
        throw new Error(errorMsg + details + debug);
      }

      // Vérifier si on a des données (soit data.data soit data.preview)
      const productsData = data.data || data.preview || [];
      
      if (productsData.length === 0) {
        const errorDetails = [];
        if (data.errors && data.errors.length > 0) {
          errorDetails.push(`Erreurs: ${data.errors.join(', ')}`);
        }
        if (data.stats) {
          errorDetails.push(`Lignes traitées: ${data.stats.lines_processed || 0}, Produits créés: ${data.stats.products_created || 0}`);
        }
        if (data.debug) {
          errorDetails.push(`Colonnes détectées: ${data.debug.headers_found?.join(', ') || 'Aucune'}`);
        }
        throw new Error(
          'Aucun produit n\'a été créé. Vérifiez le format de votre fichier Excel.\n\n' +
          errorDetails.join('\n')
        );
      }

      // Convertir les produits en format preview (utiliser data.data ou data.preview)
      const productsToMap = data.data || data.preview || [];
      const previews: ProductPreview[] = productsToMap.map((product: any, index: number) => ({
        id: product.id || `temp-${index}`,
        name: product.name || product.generated_content?.title || 'Produit sans nom',
        images: Array.isArray(product.images) ? product.images : [],
        description: product.generated_content?.short_description || product.generated_content?.long_description || '',
        variants: Array.isArray(product.variants) 
          ? product.variants.map((v: any) => ({
              title: v.title || `${v.option1 || ''} ${v.option2 || ''}`.trim() || 'Default',
              price: v.price?.toString() || '0',
              option1: v.option1,
              option2: v.option2,
            }))
          : [],
        status: product.status || 'draft',
      }));

      setProducts(previews);
      setCurrentProductIndex(0);
      
      if (data.errors && data.errors.length > 0) {
        setError(`Import réussi mais avec des avertissements:\n${data.errors.join('\n')}`);
      } else {
        setSuccess(`${previews.length} produit(s) importé(s) avec succès !`);
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'import');
    } finally {
      setProcessing(false);
    }
  };

  const scrollProduct = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      setCurrentProductIndex(prev => (prev > 0 ? prev - 1 : products.length - 1));
    } else {
      setCurrentProductIndex(prev => (prev < products.length - 1 ? prev + 1 : 0));
    }
  };

  // Gérer l'invitation d'un partenaire
  const handleInvitePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/partners/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail || undefined,
          name: inviteName || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Lien partenaire créé avec succès !`);
        setInviteEmail('');
        setInviteName('');
        // Recharger la liste des liens
        loadPartnerLinks();
      } else {
        setError(data.error || 'Erreur lors de la création du lien');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setInviting(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto flex-1 w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* En-tête */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-black mb-1">
              Nouveau produit
            </h1>
            <p className="text-sm text-black/60">
              {viewMode === 'import' 
                ? 'Importez vos produits depuis un fichier Excel'
                : 'Gérez les liens partenaires pour l\'import de produits'}
            </p>
          </div>
          
          {/* Boutons de bascule */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('import')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                viewMode === 'import'
                  ? 'bg-[#1b6955] text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Import Excel
            </button>
            <button
              onClick={() => {
                setViewMode('partner-link');
                loadPartnerLinks();
              }}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                viewMode === 'partner-link'
                  ? 'bg-[#1b6955] text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Lien Partenaire
            </button>
          </div>
        </div>
        
        {/* Info partenaire si token présent */}
        {partnerInfo && (
          <div className="mb-4 p-4 bg-[#1b6955]/5 border border-[#1b6955]/20 rounded-lg">
            <p className="text-sm text-[#1b6955]">
              <strong>Mode partenaire :</strong> Vous importez pour {partnerInfo.admin.name || partnerInfo.admin.email}
            </p>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <p className="text-sm whitespace-pre-line">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Section Gestion des Liens Partenaires */}
      {viewMode === 'partner-link' && (
        <div className="space-y-6">
          {/* Formulaire de création de lien */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Créer un nouveau lien partenaire</h2>
            <form onSubmit={handleInvitePartner} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom du partenaire (optionnel)
                  </label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Nom du partenaire"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email du partenaire (optionnel)
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@exemple.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955]"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Indiquez au moins un nom ou un email. Un lien unique sera généré pour ce partenaire.
              </p>
              <button
                type="submit"
                disabled={inviting || (!inviteEmail && !inviteName)}
                className="px-6 py-2 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {inviting ? 'Création...' : 'Créer le lien'}
              </button>
            </form>
          </div>

          {/* Liste des liens existants */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Liens partenaires actifs</h2>
            </div>
            {loadingLinks ? (
              <div className="p-8 text-center text-gray-500">Chargement...</div>
            ) : partnerLinks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Aucun lien partenaire pour le moment
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {partnerLinks.map((link) => (
                  <div key={link.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-black">
                            {link.name || link.email || 'Partenaire sans nom'}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            link.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : link.status === 'accepted'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {link.status === 'pending' ? 'En attente' : link.status === 'accepted' ? 'Accepté' : 'Expiré'}
                          </span>
                        </div>
                        {link.email && (
                          <p className="text-sm text-gray-600 mb-2">{link.email}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={link.partner_link}
                            readOnly
                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-700"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(link.partner_link);
                              setSuccess('Lien copié dans le presse-papiers !');
                              setTimeout(() => setSuccess(''), 2000);
                            }}
                            className="px-4 py-2 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] transition-colors text-sm"
                          >
                            Copier
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Expire le {new Date(link.expires_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Zone d'upload Excel */}
      {viewMode === 'import' && products.length === 0 && (
        <div className="mb-8">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
              isDragging
                ? 'border-[#1b6955] bg-[#1b6955]/5'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            }`}
          >
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelFileSelect}
              className="hidden"
            />
            
            {excelFile ? (
              <div className="space-y-4">
                <div className="text-4xl mb-4">📊</div>
                <p className="text-lg font-semibold text-black">{excelFile.name}</p>
                <p className="text-sm text-gray-600">{(excelFile.size / 1024).toFixed(2)} KB</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      setExcelFile(null);
                      if (excelInputRef.current) excelInputRef.current.value = '';
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Changer de fichier
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={processing}
                    className="px-6 py-2 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? 'Import en cours...' : 'Importer'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-black">Import Excel</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Glissez-déposez votre fichier Excel ou cliquez pour sélectionner
                </p>
                <button
                  onClick={() => excelInputRef.current?.click()}
                  className="px-6 py-3 bg-[#1b6955] text-white rounded-lg font-semibold hover:bg-[#165544] transition-colors"
                >
                  Sélectionner un fichier Excel
                </button>
                <p className="text-xs text-gray-500 mt-4">
                  Formats acceptés : .xlsx, .xls
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barre de progression */}
      {processing && (
        <div className="mb-8 bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-black">Traitement en cours...</span>
            <span className="text-sm text-gray-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-[#1b6955] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Carrousel des produits */}
      {products.length > 0 && !processing && (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="relative w-full max-w-md min-w-[20rem] flex items-center">
            {/* Bouton < à gauche */}
            {products.length > 1 && (
              <button
                onClick={() => scrollProduct('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 w-12 h-12 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-center shadow-lg z-10"
              >
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Carte produit actuelle */}
            {products[currentProductIndex] && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg w-full">
                {/* Image */}
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  {products[currentProductIndex].images && products[currentProductIndex].images!.length > 0 ? (
                    <img
                      src={products[currentProductIndex].images![0]}
                      alt={products[currentProductIndex].name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {products[currentProductIndex].status === 'published' && (
                    <div className="absolute top-2 right-2 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Publié
                    </div>
                  )}
                </div>

                {/* Contenu */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-black mb-2 line-clamp-2">
                    {products[currentProductIndex].name}
                  </h3>
                  
                  {products[currentProductIndex].description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {products[currentProductIndex].description}
                    </p>
                  )}

                  {/* Variantes */}
                  {products[currentProductIndex].variants && products[currentProductIndex].variants!.length > 0 && (
                    <div className="mb-4 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Variantes
                      </p>
                      <div className="space-y-1">
                        {products[currentProductIndex].variants!.slice(0, 3).map((variant, vIndex) => (
                          <div key={vIndex} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{variant.title}</span>
                            <span className="font-semibold text-black">{variant.price}€</span>
                          </div>
                        ))}
                        {products[currentProductIndex].variants!.length > 3 && (
                          <p className="text-xs text-gray-500">
                            +{products[currentProductIndex].variants!.length - 3} autres variantes
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/dashboard/products/${products[currentProductIndex].id}`)}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-center text-sm transition-colors"
                    >
                      Voir détails
                    </button>
                    {products[currentProductIndex].status !== 'published' && (
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/products/${products[currentProductIndex].id}/publish`, {
                              method: 'POST',
                            });
                            const data = await response.json();
                            if (data.success) {
                              setProducts(prev =>
                                prev.map(p =>
                                  p.id === products[currentProductIndex].id
                                    ? { ...p, status: 'published' as const }
                                    : p
                                )
                              );
                              setSuccess('Produit publié avec succès !');
                              setTimeout(() => setSuccess(''), 3000);
                            } else {
                              setError(data.error || 'Erreur lors de la publication');
                            }
                          } catch (err: any) {
                            setError(err.message || 'Erreur lors de la publication');
                          }
                        }}
                        className="flex-1 px-4 py-2 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] text-sm transition-colors"
                      >
                        Publier
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bouton > à droite */}
            {currentProductIndex < products.length - 1 && (
              <button
                onClick={() => scrollProduct('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 w-12 h-12 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-center shadow-lg z-10"
              >
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {/* Indicateurs de position */}
          {products.length > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {products.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentProductIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentProductIndex
                      ? 'bg-[#1b6955] w-8'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Compteur */}
          {products.length > 1 && (
            <p className="text-sm text-gray-500 mt-4">
              {currentProductIndex + 1} / {products.length}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
