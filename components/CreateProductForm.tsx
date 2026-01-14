// ============================================
// Composant: Formulaire création produit avec analyse IA
// ============================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CreateProductFormProps {
  folderId: string;
  folderName: string;
  shopDomain?: string;
  shopifyConnectionId?: string;
}

export default function CreateProductForm({ folderId, folderName, shopDomain, shopifyConnectionId }: CreateProductFormProps) {
  const router = useRouter();
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [productData, setProductData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      setProductData(null); // Reset si nouvelle image
    }
  };

  const handleAnalyze = async () => {
    if (!image) {
      setError('Veuillez sélectionner une image');
      return;
    }

    setAnalyzing(true);
    setError('');

    try {
      // Convertir l'image en base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;

        // Appeler l'API d'analyse
        const response = await fetch('/api/images/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_url: base64Image,
            folder_id: folderId,
            shop_domain: shopDomain,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erreur lors de l\'analyse');
        }

        setProductData(data.data);
      };
      reader.readAsDataURL(image);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'analyse de l\'image');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleValidate = async () => {
    if (!productData) return;

    setSaving(true);
    setError('');

    try {
      // Sauvegarder le produit
      const response = await fetch('/api/products/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
          body: JSON.stringify({
            name: productData.name,
            category: productData.category,
            material: productData.material,
            style: productData.style,
            price: productData.price_suggestion,
            images: [imagePreview],
            variants: [],
            generated_content: {
              title: productData.name,
              short_description: productData.description?.substring(0, 150) || '',
              long_description: productData.description || '',
              bullet_points: [],
              tags: productData.tags || [],
              meta_title: productData.name,
              meta_description: productData.description?.substring(0, 160) || '',
            },
            folder_id: folderId,
            shop_domain: shopDomain,
            shopify_connection_id: shopifyConnectionId,
          }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      // Rediriger vers la page du dossier
      if (shopDomain) {
        router.push(`/dashboard/shop/${encodeURIComponent(shopDomain)}`);
      } else {
        router.push(`/dashboard/folder/${folderId}`);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Upload Image */}
      <div className="bg-white border-2 border-dashed border-[#1b6955] rounded-2xl p-12 text-center hover:border-[#1b6955] transition-colors">
        {!imagePreview ? (
          <div>
            <svg className="w-16 h-16 text-black mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <span className="inline-block px-6 py-3 bg-[#1b6955] text-white rounded-lg font-bold hover:bg-slate-800 transition-colors border-2 border-[#1b6955]">
                Choisir une image
              </span>
            </label>
            <p className="text-sm text-slate-600 mt-4 font-medium">
              PNG, JPG, WEBP jusqu'à 10MB
            </p>
          </div>
        ) : (
          <div>
            <img
              src={imagePreview}
              alt="Aperçu"
              className="max-w-md mx-auto rounded-lg border-2 border-[#1b6955] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6"
            />
            <div className="flex gap-4 justify-center">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <span className="inline-block px-6 py-3 bg-white text-black rounded-lg font-bold hover:bg-slate-100 transition-colors border-2 border-[#1b6955]">
                  Changer l'image
                </span>
              </label>
              {!productData && (
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="px-6 py-3 bg-[#1b6955] text-white rounded-lg font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 border-2 border-[#1b6955]"
                >
                  {analyzing ? 'Analyse en cours...' : '🔍 Analyser avec l\'IA'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-[#1b6955] border-2 border-[#1b6955] text-white px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Résultat de l'analyse IA */}
      {productData && (
        <div className="bg-white border-2 border-[#1b6955] rounded-2xl p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl font-bold text-black mb-6">
            Résultat de l'analyse IA
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Nom du produit
              </label>
              <input
                type="text"
                value={productData.name || ''}
                onChange={(e) => setProductData({ ...productData, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-[#1b6955] rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-all bg-white text-black"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Catégorie
                </label>
                <input
                  type="text"
                  value={productData.category || ''}
                  onChange={(e) => setProductData({ ...productData, category: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-[#1b6955] rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-all bg-white text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Prix suggéré
                </label>
                <input
                  type="number"
                  value={productData.price_suggestion || ''}
                  onChange={(e) => setProductData({ ...productData, price_suggestion: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-[#1b6955] rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-all bg-white text-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Description
              </label>
              <textarea
                value={productData.description || ''}
                onChange={(e) => setProductData({ ...productData, description: e.target.value })}
                rows={6}
                className="w-full px-4 py-3 border-2 border-[#1b6955] rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-all bg-white text-black resize-none"
              />
            </div>

            {productData.tags && productData.tags.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {productData.tags.map((tag: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-[#1b6955] text-white rounded-full text-sm font-medium border-2 border-[#1b6955]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setProductData(null)}
                className="flex-1 px-6 py-3 bg-white text-black rounded-lg font-bold hover:bg-slate-100 transition-colors border-2 border-[#1b6955]"
              >
                Réanalyser
              </button>
              <button
                onClick={handleValidate}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-[#1b6955] text-white rounded-lg font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 border-2 border-[#1b6955]"
              >
                {saving ? 'Enregistrement...' : '✅ Valider et enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

