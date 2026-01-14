// ============================================
// COMPOSANT: Tableau de produits Step 2
// ============================================

'use client';

import React, { useState, useRef } from 'react';
import { parsePrice, parseIntSafe, calculatePricing } from '@/lib/utils/partner-workflow';

interface ProductRow {
  id: string;
  brand_name: string;
  title: string;
  subtitle: string;
  sku: string;
  sh: string;
  weight_volume: string;
  lot_number: string;
  revalorisation_reason: string;
  revalorisation_details: string;
  product_type: string;
  price_standard_ht: number;
  price_standard_ttc: number;
  price_greez_ht: number;
  price_greez_ttc: number;
  description: string;
  actions_efficacites: string;
  inci_list: string;
  usage_advice: string;
  endocrine_disruptors: boolean;
  ean: string;
  quantity_uvc: number;
  perfume_family_notes: string;
  perfume_notes: string; // Notes séparées de la famille olfactive
  makeup_color_hex: string;
  revalorisation_wish: string;
  product_images: File[]; // Photos du produit (max 5)
  product_images_preview: string[]; // URLs de prévisualisation
  [key: string]: any;
}

interface PartnerProductsTableProps {
  products: ProductRow[];
  brandName: string;
  onProductsChange: (products: ProductRow[]) => void;
  onSubmit: (products: ProductRow[]) => void;
  submitting?: boolean;
  token?: string;
  submissionId?: string;
}

export default function PartnerProductsTable({
  products,
  brandName,
  onProductsChange,
  onSubmit,
  submitting = false,
  token,
  submissionId,
}: PartnerProductsTableProps) {
  // Références pour les inputs file de chaque produit
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  // État pour suivre quelle ligne est en train d'être sauvegardée
  const [savingProductId, setSavingProductId] = useState<string | null>(null);

  // Calcul automatique des prix pour chaque produit
  const getPricing = (product: ProductRow) => {
    return calculatePricing(
      product.price_standard_ht,
      product.price_standard_ttc,
      product.price_greez_ht,
      product.price_greez_ttc
    );
  };

  const handleAddProduct = () => {
    const newProduct: ProductRow = {
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
    };
    onProductsChange([...products, newProduct]);
    setEditingRow(newProduct.id);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      onProductsChange(products.filter(p => p.id !== id));
    }
  };

  const handleFieldChange = (id: string, field: string, value: any) => {
    const updatedProducts = products.map(p => {
      if (p.id === id) {
        const updated = { ...p, [field]: value };
        
        // Calculer automatiquement les prix si price_greez_ttc change
        if (field === 'price_greez_ttc' && value > 0) {
          const pricing = calculatePricing(
            updated.price_standard_ht,
            updated.price_standard_ttc,
            updated.price_greez_ht,
            value
          );
          // Les prix calculés sont automatiques, on ne les modifie pas ici
        }
        
        return updated;
      }
      return p;
    });
    onProductsChange(updatedProducts);
  };

  const handleImageUpload = (productId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const updatedProducts = products.map(p => {
      if (p.id === productId) {
        const currentImages = p.product_images || [];
        const newFiles = Array.from(files);
        const totalImages = currentImages.length + newFiles.length;

        if (totalImages > 5) {
          alert(`Maximum 5 photos autorisées. Vous avez déjà ${currentImages.length} photo(s).`);
          return p;
        }

        // Ajouter les nouveaux fichiers
        const allImages = [...currentImages, ...newFiles];
        
        // Créer les prévisualisations
        const newPreviews = newFiles.map(file => URL.createObjectURL(file));
        const allPreviews = [...(p.product_images_preview || []), ...newPreviews];

        return {
          ...p,
          product_images: allImages,
          product_images_preview: allPreviews,
        };
      }
      return p;
    });
    onProductsChange(updatedProducts);
  };

  const handleImageRemove = (productId: string, index: number) => {
    const updatedProducts = products.map(p => {
      if (p.id === productId) {
        const currentImages = p.product_images || [];
        const currentPreviews = p.product_images_preview || [];
        
        // Supprimer l'image et sa prévisualisation
        const newImages = currentImages.filter((_, i) => i !== index);
        const previewToRevoke = currentPreviews[index];
        if (previewToRevoke) {
          URL.revokeObjectURL(previewToRevoke);
        }
        const newPreviews = currentPreviews.filter((_, i) => i !== index);

        return {
          ...p,
          product_images: newImages,
          product_images_preview: newPreviews,
        };
      }
      return p;
    });
    onProductsChange(updatedProducts);
  };

  const handleSaveProduct = async (productId: string) => {
    if (!token || !submissionId) {
      alert('Token ou submission ID manquant');
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (!product) {
      alert('Produit non trouvé');
      return;
    }

    // Validation basique pour ce produit
    if (
      !product.brand_name.trim() ||
      !product.title.trim() ||
      !product.sku.trim() ||
      !product.weight_volume.trim() ||
      !product.revalorisation_reason.trim() ||
      !product.product_type.trim() ||
      product.price_standard_ht <= 0 ||
      product.price_standard_ttc <= 0 ||
      product.price_greez_ht <= 0 ||
      product.price_greez_ttc <= 0 ||
      !product.description.trim() ||
      !product.actions_efficacites.trim() ||
      !product.inci_list.trim() ||
      !product.usage_advice.trim() ||
      product.quantity_uvc <= 0 ||
      !product.revalorisation_wish.trim()
    ) {
      alert('Veuillez remplir tous les champs obligatoires pour ce produit');
      return;
    }

    setSavingProductId(productId);

    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('submission_id', submissionId);
      
      // Préparer les données du produit (sans les images pour le JSON)
      const productData = {
        brand_name: product.brand_name,
        title: product.title,
        subtitle: product.subtitle || undefined,
        sku: product.sku,
        sh: product.sh || undefined,
        weight_volume: product.weight_volume,
        lot_number: product.lot_number || undefined,
        revalorisation_reason: product.revalorisation_reason,
        revalorisation_details: product.revalorisation_details || undefined,
        product_type: product.product_type,
        price_standard_ht: product.price_standard_ht,
        price_standard_ttc: product.price_standard_ttc,
        price_greez_ht: product.price_greez_ht,
        price_greez_ttc: product.price_greez_ttc,
        description: product.description,
        actions_efficacites: product.actions_efficacites,
        inci_list: product.inci_list,
        usage_advice: product.usage_advice,
        endocrine_disruptors: product.endocrine_disruptors,
        ean: product.ean || undefined,
        quantity_uvc: product.quantity_uvc,
        perfume_family_notes: product.perfume_family_notes || undefined,
        perfume_notes: product.perfume_notes || undefined,
        makeup_color_hex: product.makeup_color_hex || undefined,
        revalorisation_wish: product.revalorisation_wish,
        image_count: (product.product_images || []).length,
      };

      formData.append('product_json', JSON.stringify(productData));

      // Ajouter les images du produit
      if (product.product_images && product.product_images.length > 0) {
        product.product_images.forEach((image: File, imgIndex: number) => {
          formData.append(`product_image_${imgIndex}`, image);
        });
      }

      const response = await fetch('/api/partner/save-product', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Produit enregistré avec succès !');
      } else {
        alert(`❌ Erreur: ${data.error || 'Erreur lors de l\'enregistrement'}`);
      }
    } catch (err: any) {
      console.error('Erreur sauvegarde produit:', err);
      alert(`❌ Erreur: ${err.message || 'Erreur de connexion'}`);
    } finally {
      setSavingProductId(null);
    }
  };

  const handleSubmit = () => {
    // Validation basique
    const hasErrors = products.some(p => 
      !p.title.trim() || 
      !p.sku.trim() || 
      !p.weight_volume.trim() ||
      !p.revalorisation_reason.trim() ||
      !p.product_type.trim() ||
      p.price_standard_ht <= 0 ||
      p.price_standard_ttc <= 0 ||
      p.price_greez_ht <= 0 ||
      p.price_greez_ttc <= 0 ||
      !p.description.trim() ||
      !p.actions_efficacites.trim() ||
      !p.inci_list.trim() ||
      !p.usage_advice.trim() ||
      p.quantity_uvc <= 0 ||
      !p.revalorisation_wish.trim()
    );

    if (hasErrors) {
      alert('Veuillez remplir tous les champs obligatoires pour tous les produits');
      return;
    }

    onSubmit(products);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden w-full border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-[#1b6955]/5 to-transparent">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Produits</h2>
          <p className="text-sm text-gray-600 mt-1">Remplissez les informations pour chaque produit</p>
        </div>
        <button
          onClick={handleAddProduct}
          className="px-6 py-3 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] font-semibold transition-colors shadow-md"
        >
          + Ajouter un produit
        </button>
      </div>

      <div className="overflow-x-auto w-full" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <table className="w-full" style={{ minWidth: '4500px', width: '100%' }}>
          <thead className="bg-gradient-to-r from-[#1b6955]/10 to-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b sticky left-0 bg-gray-50 z-10" style={{ minWidth: '150px' }}>
                Marque (*)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '200px' }}>
                Titre du produit (*)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '150px' }}>
                Sous titre
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '120px' }}>
                SKU (*)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '100px' }}>
                SH(*)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '180px' }}>
                Poids en g et volume en mL (*)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '120px' }}>
                N° Lot
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '220px' }}>
                Raison de la revalorisation (*)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '250px' }}>
                Détails
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '120px' }}>
                Type (*)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '150px' }}>
                Prix standard HT (*)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '150px' }}>
                Prix standard TTC (*)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '180px' }}>
                Prix Greez HT (*)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '180px' }}>
                Prix Greez TTC (*)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '180px' }}>
                Commission Greez (57%) TTC
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '180px' }}>
                Facturation Marque (43%) TTC
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '250px' }}>
                Description (*)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '250px' }}>
                Actions et efficacités (*)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '200px' }}>
                Liste INCI (*)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '200px' }}>
                Conseils d'utilisation (*)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '220px' }}>
                Perturbateurs endocriniens (*)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '120px' }}>
                EAN
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '140px' }}>
                Quantité (UVC) (*)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '180px' }}>
                Famille olfactive
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '150px' }}>
                Notes
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '180px' }}>
                Couleur hex (#FFFFF)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '250px' }}>
                Souhait de revalorisation (*)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b" style={{ minWidth: '200px' }}>
                Photos produit (max 5)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b sticky right-0 bg-gray-50 z-10" style={{ minWidth: '120px' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.length === 0 ? (
              <tr>
                <td colSpan={28} className="px-4 py-8 text-center text-gray-500">
                  Aucun produit. Cliquez sur "Ajouter un produit" pour commencer.
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const pricing = getPricing(product);
                
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap border-b sticky left-0 bg-white z-10">
                      <input
                        type="text"
                        value={product.brand_name}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-900 cursor-not-allowed"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-b">
                      <input
                        type="text"
                        value={product.title}
                        onChange={(e) => handleFieldChange(product.id, 'title', e.target.value)}
                        placeholder="Titre"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] cursor-text transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-b">
                      <input
                        type="text"
                        value={product.subtitle}
                        onChange={(e) => handleFieldChange(product.id, 'subtitle', e.target.value)}
                        placeholder="Sous titre"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] cursor-text transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-b">
                      <input
                        type="text"
                        value={product.sku}
                        onChange={(e) => handleFieldChange(product.id, 'sku', e.target.value)}
                        placeholder="SKU"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] cursor-text transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-b">
                      <input
                        type="text"
                        value={product.sh}
                        onChange={(e) => handleFieldChange(product.id, 'sh', e.target.value)}
                        placeholder="SH"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] cursor-text transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-b">
                      <input
                        type="text"
                        value={product.weight_volume}
                        onChange={(e) => handleFieldChange(product.id, 'weight_volume', e.target.value)}
                        placeholder="250g / 500mL"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] cursor-text transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-b">
                      <input
                        type="text"
                        value={product.lot_number}
                        onChange={(e) => handleFieldChange(product.id, 'lot_number', e.target.value)}
                        placeholder="N° Lot"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] cursor-text transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 border-b">
                      <input
                        type="text"
                        value={product.revalorisation_reason}
                        onChange={(e) => handleFieldChange(product.id, 'revalorisation_reason', e.target.value)}
                        placeholder="Raison"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] cursor-text transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 border-b">
                      <textarea
                        value={product.revalorisation_details}
                        onChange={(e) => handleFieldChange(product.id, 'revalorisation_details', e.target.value)}
                        placeholder="Détails"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] resize-none cursor-text transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-b">
                      <input
                        type="text"
                        value={product.product_type}
                        onChange={(e) => handleFieldChange(product.id, 'product_type', e.target.value)}
                        placeholder="Type"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] cursor-text transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-b">
                      <input
                        type="number"
                        step="0.01"
                        value={product.price_standard_ht}
                        onChange={(e) => handleFieldChange(product.id, 'price_standard_ht', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] cursor-text transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-b">
                      <input
                        type="number"
                        step="0.01"
                        value={product.price_standard_ttc}
                        onChange={(e) => handleFieldChange(product.id, 'price_standard_ttc', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] cursor-text transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-b">
                      <input
                        type="number"
                        step="0.01"
                        value={product.price_greez_ht}
                        onChange={(e) => handleFieldChange(product.id, 'price_greez_ht', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] cursor-text transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-b">
                      <input
                        type="number"
                        step="0.01"
                        value={product.price_greez_ttc}
                        onChange={(e) => handleFieldChange(product.id, 'price_greez_ttc', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] cursor-text transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-b bg-gray-50">
                      <input
                        type="text"
                        value={`${pricing.commissionGreezTTC.toFixed(2)} €`}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-900 cursor-not-allowed"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-b bg-gray-50">
                      <input
                        type="text"
                        value={`${pricing.facturationMarqueTTC.toFixed(2)} €`}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-900 cursor-not-allowed"
                      />
                    </td>
                    <td className="px-4 py-3 border-b">
                      <textarea
                        value={product.description}
                        onChange={(e) => handleFieldChange(product.id, 'description', e.target.value)}
                        placeholder="Description"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] resize-none cursor-text transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 border-b">
                      <textarea
                        value={product.actions_efficacites}
                        onChange={(e) => handleFieldChange(product.id, 'actions_efficacites', e.target.value)}
                        placeholder="Actions et efficacités"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] resize-none cursor-text transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 border-b">
                      <textarea
                        value={product.inci_list}
                        onChange={(e) => handleFieldChange(product.id, 'inci_list', e.target.value)}
                        placeholder="Liste INCI"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] resize-none cursor-text transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 border-b">
                      <textarea
                        value={product.usage_advice}
                        onChange={(e) => handleFieldChange(product.id, 'usage_advice', e.target.value)}
                        placeholder="Conseils d'utilisation"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] resize-none cursor-text transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-b">
                      <select
                        value={product.endocrine_disruptors ? 'oui' : 'non'}
                        onChange={(e) => handleFieldChange(product.id, 'endocrine_disruptors', e.target.value === 'oui')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] cursor-pointer transition-colors"
                      >
                        <option value="non">Non</option>
                        <option value="oui">Oui</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-b">
                      <input
                        type="text"
                        value={product.ean}
                        onChange={(e) => handleFieldChange(product.id, 'ean', e.target.value)}
                        placeholder="EAN"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] cursor-text transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-b">
                      <input
                        type="number"
                        value={product.quantity_uvc}
                        onChange={(e) => handleFieldChange(product.id, 'quantity_uvc', parseIntSafe(e.target.value))}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] cursor-text transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 border-b">
                      <input
                        type="text"
                        value={product.perfume_family_notes || ''}
                        onChange={(e) => handleFieldChange(product.id, 'perfume_family_notes', e.target.value)}
                        placeholder="Famille olfactive"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] cursor-text transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 border-b">
                      <input
                        type="text"
                        value={product.perfume_notes || ''}
                        onChange={(e) => handleFieldChange(product.id, 'perfume_notes', e.target.value)}
                        placeholder="Notes"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] cursor-text transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-b">
                      <input
                        type="text"
                        value={product.makeup_color_hex}
                        onChange={(e) => handleFieldChange(product.id, 'makeup_color_hex', e.target.value)}
                        placeholder="#FFFFFF"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] cursor-text transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 border-b">
                      <textarea
                        value={product.revalorisation_wish}
                        onChange={(e) => handleFieldChange(product.id, 'revalorisation_wish', e.target.value)}
                        placeholder="Souhait de revalorisation"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] resize-none cursor-text transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 border-b">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {(product.product_images_preview || []).map((preview, index) => (
                            <div key={index} className="relative">
                              <img
                                src={preview}
                                alt={`Photo ${index + 1}`}
                                className="w-16 h-16 object-cover rounded border border-gray-300"
                              />
                              <button
                                onClick={() => handleImageRemove(product.id, index)}
                                className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-700 cursor-pointer"
                                title="Supprimer"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            ref={(el) => {
                              fileInputRefs.current[product.id] = el;
                            }}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => handleImageUpload(product.id, e.target.files)}
                            disabled={(product.product_images || []).length >= 5}
                            className="hidden"
                            id={`file-input-${product.id}`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const input = fileInputRefs.current[product.id];
                              if (input) {
                                input.click();
                              }
                            }}
                            disabled={(product.product_images || []).length >= 5}
                            className="px-4 py-2 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 font-semibold transition-colors text-xs"
                          >
                            <span>📷</span>
                            <span>Ajouter photo</span>
                          </button>
                          <p className="text-xs text-gray-500">
                            {(product.product_images || []).length}/5
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-b sticky right-0 bg-white z-10">
                      <div className="flex gap-2">
                        {token && submissionId && (
                          <button
                            onClick={() => handleSaveProduct(product.id)}
                            disabled={savingProductId === product.id}
                            className="px-4 py-2 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-semibold transition-colors text-sm"
                            title="Enregistrer"
                          >
                            {savingProductId === product.id ? '⏳' : '💾'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer font-semibold transition-colors text-sm"
                          title="Supprimer"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-transparent flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={submitting || products.length === 0}
          className="px-8 py-3 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors shadow-md"
        >
          {submitting ? 'Envoi en cours...' : `Valider ${products.length} produit(s)`}
        </button>
      </div>
    </div>
  );
}

