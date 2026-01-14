// ============================================
// Page: Processus de traitement des fichiers
// ============================================

'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface ProcessStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
}

interface ProcessedProduct {
  id: string;
  name: string;
  images: string[];
  productData: any;
  folderId?: string;
}

function ProcessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filesCount = parseInt(searchParams.get('files') || '0');

  const [steps, setSteps] = useState<ProcessStep[]>([
    { id: '1', name: 'Ouverture des fichiers', status: 'pending' },
    { id: '2', name: 'Lecture de tous les fichiers', status: 'pending' },
    { id: '3', name: 'Analyse des fichiers', status: 'pending' },
    { id: '4', name: 'Lecture de toutes les photos', status: 'pending' },
    { id: '5', name: 'Tri des photos avec noms correspondants', status: 'pending' },
    { id: '6', name: 'Génération des fiches produit', status: 'pending' },
  ]);

  const [processedProducts, setProcessedProducts] = useState<ProcessedProduct[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [folders, setFolders] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const filesRef = useRef<File[]>([]);

  // Récupérer les dossiers
  useEffect(() => {
    fetch('/api/folders/list')
      .then(res => res.json())
      .then(data => {
        if (data.folders) {
          setFolders(data.folders);
        }
      })
      .catch(console.error);
  }, []);

  // Récupérer les fichiers depuis sessionStorage ou les traiter
  useEffect(() => {
    if (filesCount === 0) {
      router.push('/dashboard/products/new');
      return;
    }

    // Récupérer les fichiers depuis sessionStorage
    const storedFiles = sessionStorage.getItem('uploadedFiles');
    if (storedFiles) {
      try {
        const filesData = JSON.parse(storedFiles);
        filesRef.current = filesData;
      } catch (e) {
        console.error('Erreur parsing fichiers:', e);
      }
    }

    const processSteps = async () => {
      // Étape 1: Ouverture des fichiers
      setCurrentStep(0);
      setSteps(prev => prev.map((step, idx) => 
        idx === 0 ? { ...step, status: 'processing', message: `${filesCount} fichier(s) détecté(s)` } : step
      ));
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSteps(prev => prev.map((step, idx) => 
        idx === 0 ? { ...step, status: 'completed', message: 'Fichiers ouverts' } : step
      ));

      // Étape 2: Lecture de tous les fichiers
      setCurrentStep(1);
      setSteps(prev => prev.map((step, idx) => 
        idx === 1 ? { ...step, status: 'processing', message: 'Extraction en cours...' } : step
      ));
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSteps(prev => prev.map((step, idx) => 
        idx === 1 ? { ...step, status: 'completed', message: 'Fichiers lus' } : step
      ));

      // Étape 3: Analyse des fichiers
      setCurrentStep(2);
      setSteps(prev => prev.map((step, idx) => 
        idx === 2 ? { ...step, status: 'processing', message: 'Analyse IA en cours...' } : step
      ));
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSteps(prev => prev.map((step, idx) => 
        idx === 2 ? { ...step, status: 'completed', message: 'Analyse terminée' } : step
      ));

      // Étape 4: Lecture de toutes les photos
      setCurrentStep(3);
      setSteps(prev => prev.map((step, idx) => 
        idx === 3 ? { ...step, status: 'processing', message: 'Extraction des images...' } : step
      ));
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSteps(prev => prev.map((step, idx) => 
        idx === 3 ? { ...step, status: 'completed', message: 'Photos extraites' } : step
      ));

      // Étape 5: Tri des photos avec noms correspondants
      setCurrentStep(4);
      setSteps(prev => prev.map((step, idx) => 
        idx === 4 ? { ...step, status: 'processing', message: 'Association photos/noms...' } : step
      ));
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSteps(prev => prev.map((step, idx) => 
        idx === 4 ? { ...step, status: 'completed', message: 'Photos triées' } : step
      ));

      // Étape 6: Génération des fiches produit
      setCurrentStep(5);
      setSteps(prev => prev.map((step, idx) => 
        idx === 5 ? { ...step, status: 'processing', message: 'Création des fiches...' } : step
      ));
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSteps(prev => prev.map((step, idx) => 
        idx === 5 ? { ...step, status: 'completed', message: 'Fiches générées' } : step
      ));

      // Simuler des produits traités (en production, cela viendrait de l'API)
      // TODO: Remplacer par un appel API réel
      setProcessedProducts([
        {
          id: '1',
          name: 'Produit Exemple',
          images: ['/placeholder.jpg'],
          productData: { 
            name: 'Produit Exemple', 
            category: 'Catégorie',
            description: 'Description du produit',
            price_suggestion: 29.99
          }
        }
      ]);
    };

    processSteps();
  }, [filesCount, router]);

  const handleSaveProducts = async () => {
    if (!selectedFolderId) {
      alert('Veuillez sélectionner un dossier');
      return;
    }

    if (processedProducts.length === 0) {
      alert('Aucun produit à sauvegarder');
      return;
    }

    setSaving(true);

    try {
      // Sauvegarder chaque produit
      for (const product of processedProducts) {
        const response = await fetch('/api/products/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: product.productData.name,
            category: product.productData.category,
            price: product.productData.price_suggestion,
            images: product.images,
            folder_id: selectedFolderId,
            generated_content: {
              title: product.productData.name,
              short_description: product.productData.description?.substring(0, 150) || '',
              long_description: product.productData.description || '',
              bullet_points: [],
              tags: product.productData.tags || [],
              meta_title: product.productData.name,
              meta_description: product.productData.description?.substring(0, 160) || '',
            },
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erreur lors de la sauvegarde');
        }
      }

      // Nettoyer sessionStorage
      sessionStorage.removeItem('uploadedFiles');
      
      // Rediriger vers le dashboard
      router.push('/dashboard');
    } catch (error: any) {
      alert(`Erreur lors de la sauvegarde: ${error.message}`);
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-black">
            Traitement en cours
          </h1>
          <p className="text-slate-600">
            {filesCount} fichier{filesCount > 1 ? 's' : ''} en cours de traitement
          </p>
        </div>

        {/* Étapes du processus */}
        <div className="bg-white border-2 border-[#1b6955] rounded-2xl p-6 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-xl font-bold mb-6 text-black">Étapes du traitement</h2>
          
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-4 p-4 rounded-lg border-2 ${
                  step.status === 'completed'
                    ? 'border-[#1b6955] bg-[#1b6955]/5'
                    : step.status === 'processing'
                    ? 'border-[#1b6955] bg-[#1b6955]/10'
                    : 'border-slate-300 bg-slate-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${
                  step.status === 'completed'
                    ? 'bg-black text-white border-[#1b6955]'
                    : step.status === 'processing'
                    ? 'bg-black text-white border-[#1b6955] animate-pulse'
                    : 'bg-white text-slate-400 border-slate-300'
                }`}>
                  {step.status === 'completed' ? '✓' : step.status === 'processing' ? '...' : index + 1}
                </div>
                <div className="flex-1">
                  <p className={`font-semibold ${
                    step.status === 'completed' || step.status === 'processing'
                      ? 'text-black'
                      : 'text-slate-400'
                  }`}>
                    {step.name}
                  </p>
                  {step.message && (
                    <p className="text-xs text-slate-600 mt-1">{step.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Produits traités */}
        {processedProducts.length > 0 && (
          <div className="bg-white border-2 border-[#1b6955] rounded-2xl p-6 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-bold mb-6 text-black">
              Fiches produit générées ({processedProducts.length})
            </h2>

            <div className="space-y-4 mb-6">
              {processedProducts.map((product) => (
                <div
                  key={product.id}
                  className="p-4 border-2 border-[#1b6955] rounded-lg bg-white"
                >
                  <div className="flex items-start gap-4">
                    {product.images[0] && (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-24 h-24 object-cover rounded-lg border-2 border-[#1b6955]"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-bold text-black text-lg mb-2">{product.name}</h3>
                      <div className="space-y-1 text-sm">
                        <p className="text-slate-600"><span className="font-semibold">Catégorie:</span> {product.productData.category || 'Non spécifiée'}</p>
                        {product.productData.price_suggestion && (
                          <p className="text-slate-600"><span className="font-semibold">Prix:</span> {product.productData.price_suggestion} €</p>
                        )}
                        {product.productData.description && (
                          <p className="text-slate-600 line-clamp-2">{product.productData.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sélection du dossier */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-black mb-2">
                Choisir un dossier
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-[#1b6955] rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 bg-white text-black"
              >
                <option value="">Sélectionner un dossier...</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Bouton de validation */}
            <button
              onClick={handleSaveProducts}
              disabled={!selectedFolderId || saving}
              className="w-full px-6 py-4 bg-black text-white rounded-lg font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-[#1b6955]"
            >
              {saving ? '⏳ Enregistrement...' : '✅ Valider et enregistrer dans le dossier'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProcessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1b6955] mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    }>
      <ProcessContent />
    </Suspense>
  );
}

