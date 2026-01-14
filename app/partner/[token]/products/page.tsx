// ============================================
// Page: Création produits Step 2
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PartnerProductsTable from '@/components/PartnerProductsTable';
import { parsePrice, parseIntSafe } from '@/lib/utils/partner-workflow';

export default function PartnerProductsPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        setLoading(true);
        
        // 1. Vérifier que le token est valide
        const tokenResponse = await fetch(`/api/partners/invitations/${token}`);
        const tokenData = await tokenResponse.json();
        
        if (!tokenData.valid) {
          setError('Token invalide ou expiré');
          setLoading(false);
          return;
        }

        // 2. Récupérer la submission (Step 1 doit être complété)
        const response = await fetch(`/api/partner/submission/${token}`);
        const data = await response.json();

        if (data.success && data.data) {
          // Step 1 complété, on peut afficher Step 2
          setSubmission(data.data);
          
          // Déterminer le nom de la marque à utiliser : company_name de l'invitation en priorité, sinon brand.name
          const brandName = data.data.company_name || data.data.brand?.name || '';
          
          // Si des produits sont parsés depuis Excel, les utiliser
          let productsList: any[] = [];
          if (data.data.products && data.data.products.length > 0) {
            // Transformer les produits Excel en format tableau avec IDs
            productsList = data.data.products.map((p: any, index: number) => ({
              id: `product-${index}-${Date.now()}`,
              brand_name: brandName,
              title: p.title || p['titre du produit'] || '',
              subtitle: p.subtitle || p['sous titre'] || '',
              sku: p.sku || p.SKU || '',
              sh: p.sh || p.SH || '',
              weight_volume: p.weight_volume || p['poids en g et volume en ml'] || '',
              lot_number: p.lot_number || p['n° lot'] || '',
              revalorisation_reason: p.revalorisation_reason || p['raison de la revalorisation'] || '',
              revalorisation_details: p.revalorisation_details || p.details || '',
              product_type: p.product_type || p.type || '',
              price_standard_ht: parsePrice(p.price_standard_ht || p['prix de vente standard ht']),
              price_standard_ttc: parsePrice(p.price_standard_ttc || p['prix de vente standard ttc']),
              price_greez_ht: parsePrice(p.price_greez_ht || p['prix remisé sur greez ht (sans commission)']),
              price_greez_ttc: parsePrice(p.price_greez_ttc || p['prix remisé sur greez ttc (sans commission)']),
              description: p.description || '',
              actions_efficacites: p.actions_efficacites || p['actions et efficacités produits'] || '',
              inci_list: p.inci_list || p['liste inci'] || '',
              usage_advice: p.usage_advice || p['conseils d\'utilisation'] || '',
              endocrine_disruptors: p.endocrine_disruptors || p['présence de perturbateurs endocrinien'] === 'oui' || false,
              ean: p.ean || p.EAN || '',
              quantity_uvc: parseIntSafe(p.quantity_uvc || p['quantité (uvc)']),
              perfume_family_notes: p.perfume_family_notes || p['si parfum : famille olfactive et notes'] || '',
              perfume_notes: p.perfume_notes || p['notes'] || '',
              makeup_color_hex: p.makeup_color_hex || p['si maquillage : couleur hexadécimale (#fffff)'] || '',
              revalorisation_wish: p.revalorisation_wish || p['souhait de revalorisation'] || '',
              product_images: [],
              product_images_preview: [],
            }));
          } else {
            // Sinon, créer un produit vide par défaut
            productsList = [{
              id: `product-${Date.now()}`,
              brand_name: brandName,
              title: '',
              subtitle: '',
              sku: '',
              sh: '',
              weight_volume: '',
              lot_number: '',
              revalorisation_reason: '',
              revalorisation_details: '',
              product_type: '',
              price_standard_ht: 0,
              price_standard_ttc: 0,
              price_greez_ht: 0,
              price_greez_ttc: 0,
              description: '',
              actions_efficacites: '',
              inci_list: '',
              usage_advice: '',
              endocrine_disruptors: false,
              ean: '',
              quantity_uvc: 0,
              perfume_family_notes: '',
              perfume_notes: '',
              makeup_color_hex: '',
              revalorisation_wish: '',
              product_images: [],
              product_images_preview: [],
            }];
          }
          setProducts(productsList);
        } else {
          // Step 1 pas complété, rediriger vers Step 1
          console.log('⚠️ Step 1 pas complété, redirection vers Step 1...');
          router.push(`/partner/${token}/form`);
          return;
        }
      } catch (err: any) {
        console.error('❌ Erreur:', err);
        setError(err.message || 'Erreur de connexion');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchSubmission();
    }
  }, [token, router]);

  const handleProductsChange = (updatedProducts: any[]) => {
    setProducts(updatedProducts);
  };

  const handleSubmit = async (allProductsData: any[]) => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Créer FormData pour envoyer les données avec les images
      const formData = new FormData();
      formData.append('token', token);
      
      if (!submission?.id) {
        setError('Submission ID manquant');
        setSubmitting(false);
        return;
      }
      
      formData.append('submission_id', submission.id);

      // Préparer les données des produits (sans les images pour le JSON)
      const productsData = allProductsData.map((productData: any, index: number) => {
        // Ajouter les images du produit au FormData
        if (productData.product_images && productData.product_images.length > 0) {
          productData.product_images.forEach((image: File, imgIndex: number) => {
            formData.append(`product_${index}_image_${imgIndex}`, image);
          });
        }
        
        return {
          brand_name: productData.brand_name,
          title: productData.title,
          subtitle: productData.subtitle || undefined,
          sku: productData.sku,
          sh: productData.sh || undefined,
          weight_volume: productData.weight_volume,
          lot_number: productData.lot_number || undefined,
          revalorisation_reason: productData.revalorisation_reason,
          revalorisation_details: productData.revalorisation_details || undefined,
          product_type: productData.product_type,
          price_standard_ht: productData.price_standard_ht,
          price_standard_ttc: productData.price_standard_ttc,
          price_greez_ht: productData.price_greez_ht,
          price_greez_ttc: productData.price_greez_ttc,
          description: productData.description,
          actions_efficacites: productData.actions_efficacites,
          inci_list: productData.inci_list,
          usage_advice: productData.usage_advice,
          endocrine_disruptors: productData.endocrine_disruptors,
          ean: productData.ean || undefined,
          quantity_uvc: productData.quantity_uvc,
          perfume_family_notes: productData.perfume_family_notes || undefined,
          perfume_notes: productData.perfume_notes || undefined,
          makeup_color_hex: productData.makeup_color_hex || undefined,
          revalorisation_wish: productData.revalorisation_wish,
          image_count: (productData.product_images || []).length, // Nombre d'images pour ce produit
        };
      });

      // Ajouter les produits au FormData
      formData.append('products', JSON.stringify(productsData));

      const response = await fetch('/api/partner/create-products', {
        method: 'POST',
        body: formData, // Pas de Content-Type, le navigateur le définit automatiquement avec FormData
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`✅ ${data.data.created_count} produit(s) créé(s) avec succès !`);
        // Rediriger après 2 secondes
        setTimeout(() => {
          router.push('/partner/success');
        }, 2000);
      } else {
        setError(data.error || 'Erreur lors de la création des produits');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setSubmitting(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  if (error && !submission) {
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
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-2">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-center mb-2">
            Remplissez les informations pour chaque produit de votre matrice
          </h1>
        </div>

        {error && (
          <div className="mb-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-2 p-2 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
            {success}
          </div>
        )}

        {submission && (
          <PartnerProductsTable
            products={products}
            brandName={submission.company_name || submission.brand?.name || ''}
            onProductsChange={handleProductsChange}
            onSubmit={handleSubmit}
            submitting={submitting}
            token={token}
            submissionId={submission.id}
          />
        )}
      </div>
    </div>
  );
}

