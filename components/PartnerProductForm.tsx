// ============================================
// COMPOSANT: Formulaire STEP 3 – FICHE PRODUIT PARTENAIRE
// ============================================

'use client';

import { useMemo, useState, useEffect } from 'react';

interface PartnerProductFormProps {
  token: string;
  submissionId: string;
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

type RevalorisationReason =
  | 'leger_defaut'
  | 'fin_collection'
  | 'surstock'
  | 'changement_packaging'
  | 'autre';

export default function PartnerProductForm({
  token,
  submissionId,
  onSubmit,
  onCancel,
  loading = false,
}: PartnerProductFormProps) {
  // Clé pour le localStorage
  const storageKey = `partner_product_form_${token}_${submissionId}`;
  
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 8;
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const [formData, setFormData] = useState({
    // Section 1 – Identité produit
    brand: '',
    product_name: '',
    subtitle: '',
    product_type: '',

    // Section 2 – Identification & logistique
    sku: '',
    sh: '',
    weight_volume: '',
    lot_number: '',
    ean: '',
    quantity_uvc: '',

    // Section 3 – Revalorisation (interne)
    revalorisation_reason: '' as RevalorisationReason | '',
    revalorisation_details: '',
    revalorisation_wish: '',
    defect_images: [] as File[],

    // Section 4 – Prix & commission
    price_standard_ht: '',
    price_standard_ttc: '',
    price_greez_ht: '',

    // Section 5 – Contenu produit (Shopify)
    description: '',
    actions_efficacites: '',
    inci_list: '',
    usage_advice: '',
    endocrine_disruptors: 'NON',

    // Section 6 – Champs conditionnels
    fragrance_family: '',
    fragrance_notes: '',
    color_hex: '',

    // Section 7 – Images produit
    images: [] as File[],

    // Section 8 – Validation
    confirm_accuracy: false,
    confirm_sale: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Charger les données sauvegardées au montage
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        // Restaurer les données (sauf les fichiers)
        Object.keys(parsed).forEach(key => {
          if (key !== 'images' && key !== 'defect_images' && key !== 'currentStep') {
            setFormData(prev => ({ ...prev, [key]: parsed[key] || prev[key] }));
          }
        });
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
      }
    } catch (err) {
      console.error('Erreur chargement données sauvegardées:', err);
    }
  }, [storageKey]);

  // Sauvegarder automatiquement quand les données changent (avec debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        const dataToSave = {
          ...formData,
          // Ne pas sauvegarder les fichiers dans localStorage
          images: [],
          defect_images: [],
          currentStep,
        };
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        setLastSaved(new Date());
      } catch (err) {
        console.error('Erreur sauvegarde données:', err);
      }
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [formData, currentStep, storageKey]);

  // Calculs automatiques en temps réel
  const computed = useMemo(() => {
    const priceGreezHt = parseFloat(formData.price_greez_ht || '0') || 0;
    const tva = 0.20; // TVA 20%
    const commissionRate = 0.57; // Commission GREEZ 57% TTC
    const priceGreezTtc = priceGreezHt * (1 + tva);
    const commissionTtc = priceGreezTtc * commissionRate;
    const priceFinalTtc = priceGreezTtc + commissionTtc;
    return {
      tva,
      commissionRate,
      priceGreezTtc,
      commissionTtc,
      priceFinalTtc,
    };
  }, [formData.price_greez_ht]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: 'images' | 'defect_images') => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setFormData(prev => ({ ...prev, [key]: files }));
      if (errors[key]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
      }
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    const isParfum = formData.product_type === 'Parfum';
    const isMaquillage = formData.product_type === 'Maquillage';
    const isDefaut = formData.revalorisation_reason === 'leger_defaut';

    if (step === 1) {
      // Section 1 – Identité produit
      if (!formData.brand.trim()) newErrors.brand = 'La marque est obligatoire';
      if (!formData.product_name.trim()) newErrors.product_name = 'Le titre du produit est obligatoire';
      if (!formData.product_type) newErrors.product_type = 'Le type de produit est obligatoire';
    } else if (step === 2) {
      // Section 2 – Identification & logistique
      if (!formData.sku.trim()) newErrors.sku = 'Le SKU est obligatoire';
      if (!formData.sh.trim()) newErrors.sh = 'Le code SH/HS est obligatoire';
      if (!formData.weight_volume.trim()) newErrors.weight_volume = 'Le poids/volume est obligatoire';
      if (!formData.quantity_uvc || parseInt(formData.quantity_uvc, 10) <= 0)
        newErrors.quantity_uvc = 'La quantité disponible est obligatoire';
    } else if (step === 3) {
      // Section 3 – Revalorisation
      if (!formData.revalorisation_reason) newErrors.revalorisation_reason = 'La raison est obligatoire';
      if (!formData.revalorisation_details.trim())
        newErrors.revalorisation_details = 'Les détails de la revalorisation sont obligatoires';
      if (!formData.revalorisation_wish.trim())
        newErrors.revalorisation_wish = 'Le souhait de revalorisation est obligatoire';
      if (isDefaut && formData.defect_images.length === 0) {
        newErrors.defect_images = 'Photos du produit et du défaut requises';
      }
    } else if (step === 4) {
      // Section 4 – Prix & commission
      if (!formData.price_standard_ht || parseFloat(formData.price_standard_ht) <= 0)
        newErrors.price_standard_ht = 'Prix standard HT obligatoire';
      if (!formData.price_standard_ttc || parseFloat(formData.price_standard_ttc) <= 0)
        newErrors.price_standard_ttc = 'Prix standard TTC obligatoire';
      if (!formData.price_greez_ht || parseFloat(formData.price_greez_ht) <= 0)
        newErrors.price_greez_ht = 'Prix remisé HT obligatoire';
    } else if (step === 5) {
      // Section 5 – Contenu produit
      if (!formData.description.trim()) newErrors.description = 'La description est obligatoire';
      if (!formData.actions_efficacites.trim()) newErrors.actions_efficacites = 'Ce champ est obligatoire';
      if (!formData.inci_list.trim()) newErrors.inci_list = 'La liste INCI est obligatoire';
      if (!formData.usage_advice.trim()) newErrors.usage_advice = "Les conseils d'utilisation sont obligatoires";
    } else if (step === 6) {
      // Section 6 – Champs conditionnels
      if (isParfum) {
        if (!formData.fragrance_family.trim()) newErrors.fragrance_family = 'Famille olfactive obligatoire';
        if (!formData.fragrance_notes.trim()) newErrors.fragrance_notes = 'Notes olfactives obligatoires';
      }
      if (isMaquillage) {
        if (!formData.color_hex.trim()) newErrors.color_hex = 'Couleur hexadécimale obligatoire';
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (formData.color_hex && !hexRegex.test(formData.color_hex)) {
          newErrors.color_hex = 'Format hexadécimal invalide (ex: #FF5733)';
        }
      }
    } else if (step === 7) {
      // Section 7 – Images produit
      if (formData.images.length === 0) newErrors.images = 'Au moins une image produit est requise';
    } else if (step === 8) {
      // Section 8 – Validation
      if (!formData.confirm_accuracy) newErrors.confirm_accuracy = "Veuillez confirmer l'exactitude";
      if (!formData.confirm_sale) newErrors.confirm_sale = 'Veuillez accepter la mise en vente';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = (): boolean => {
    // Valider toutes les étapes
    for (let step = 1; step <= totalSteps; step++) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const submitFormData = new FormData();
    submitFormData.append('token', token);
    submitFormData.append('submission_id', submissionId);

    // Section 1
    submitFormData.append('brand', formData.brand);
    submitFormData.append('product_name', formData.product_name);
    submitFormData.append('subtitle', formData.subtitle);
    submitFormData.append('product_type', formData.product_type);

    // Section 2
    submitFormData.append('sku', formData.sku);
    submitFormData.append('sh', formData.sh);
    submitFormData.append('weight_volume', formData.weight_volume);
    submitFormData.append('lot_number', formData.lot_number);
    submitFormData.append('ean', formData.ean);
    submitFormData.append('quantity_uvc', formData.quantity_uvc);

    // Section 3
    submitFormData.append('revalorisation_reason', formData.revalorisation_reason);
    submitFormData.append('revalorisation_details', formData.revalorisation_details);
    submitFormData.append('revalorisation_wish', formData.revalorisation_wish);
    formData.defect_images.forEach((file, index) => {
      submitFormData.append(`defect_image_${index}`, file);
    });
    submitFormData.append('defect_image_count', formData.defect_images.length.toString());

    // Section 4
    submitFormData.append('price_standard_ht', formData.price_standard_ht);
    submitFormData.append('price_standard_ttc', formData.price_standard_ttc);
    submitFormData.append('price_greez_ht', formData.price_greez_ht);
    submitFormData.append('price_greez_ttc', computed.priceGreezTtc.toString());
    submitFormData.append('commission_greez_ttc', computed.commissionTtc.toString());
    submitFormData.append('price_final_ttc', computed.priceFinalTtc.toString());

    // Section 5
    submitFormData.append('description', formData.description);
    submitFormData.append('actions_efficacites', formData.actions_efficacites);
    submitFormData.append('inci_list', formData.inci_list);
    submitFormData.append('usage_advice', formData.usage_advice);
    submitFormData.append('endocrine_disruptors', formData.endocrine_disruptors);

    // Section 6
    submitFormData.append('fragrance_family', formData.fragrance_family);
    submitFormData.append('fragrance_notes', formData.fragrance_notes);
    submitFormData.append('color_hex', formData.color_hex);

    // Section 7 images
    formData.images.forEach((image, index) => {
      submitFormData.append(`image_${index}`, image);
    });
    submitFormData.append('image_count', formData.images.length.toString());

    // Section 8 validation
    submitFormData.append('confirm_accuracy', formData.confirm_accuracy ? 'true' : 'false');
    submitFormData.append('confirm_sale', formData.confirm_sale ? 'true' : 'false');

    await onSubmit(submitFormData);
    
    // Supprimer les données sauvegardées après soumission réussie
    localStorage.removeItem(storageKey);
  };

  const steps = [
    { number: 1, title: 'Identité Produit' },
    { number: 2, title: 'Identification & Logistique' },
    { number: 3, title: 'Revalorisation' },
    { number: 4, title: 'Prix & Commission' },
    { number: 5, title: 'Contenu Produit' },
    { number: 6, title: 'Champs Conditionnels' },
    { number: 7, title: 'Images Produit' },
    { number: 8, title: 'Validation' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Barre de progression */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-bold text-gray-900">STEP 3 – Création de fiche produit</h2>
            {lastSaved && (
              <span className="text-xs text-gray-500">
                ✓ Sauvegardé {lastSaved.toLocaleTimeString('fr-FR')}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">Étape {currentStep} sur {totalSteps}</p>
        </div>
        
        {/* Barre de progression visuelle */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className="bg-[#1b6955] h-3 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Étapes */}
        <div className="flex justify-between overflow-x-auto pb-2">
          {steps.map((step) => (
            <div
              key={step.number}
              className={`flex flex-col items-center flex-1 min-w-[100px] ${
                step.number <= currentStep ? 'text-[#1b6955]' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold mb-2 transition-all ${
                  step.number < currentStep
                    ? 'bg-[#1b6955] text-white'
                    : step.number === currentStep
                    ? 'bg-[#1b6955] text-white ring-4 ring-[#1b6955]/20'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step.number < currentStep ? '✓' : step.number}
              </div>
              <span className="text-xs text-center leading-tight">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Introduction */}
      {currentStep === 1 && (
        <div className="bg-[#1b6955]/5 border border-[#1b6955]/20 rounded-xl p-6">
          <p className="text-gray-700 leading-relaxed">
            Ce formulaire permet de créer la fiche produit de votre article sur la boutique GREEZ.<br />
            <strong>1 formulaire = 1 produit.</strong><br />
            Temps estimé : 5 à 10 minutes.<br />
            <br />
            Certaines informations seront visibles sur la boutique (données publiques).<br />
            D'autres sont strictement internes et ne seront jamais affichées (données internes).
          </p>
        </div>
      )}

      {/* Contenu du formulaire par étape */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 space-y-6">
        {/* Step 1: Identité Produit */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Identité Produit</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldText label="Marque *" name="brand" value={formData.brand} onChange={handleInputChange} error={errors.brand} />
              <FieldText label="Titre du produit *" name="product_name" value={formData.product_name} onChange={handleInputChange} error={errors.product_name} />
              <FieldText label="Sous-titre" name="subtitle" value={formData.subtitle} onChange={handleInputChange} />
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Type de produit *</label>
                <select
                  name="product_type"
                  value={formData.product_type}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955] ${errors.product_type ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Sélectionnez un type</option>
                  <option value="Produit pour le visage">Produit pour le visage</option>
                  <option value="Produit pour le corps">Produit pour le corps</option>
                  <option value="Cheveux">Cheveux</option>
                  <option value="Maquillage">Maquillage</option>
                  <option value="Parfum">Parfum</option>
                </select>
                {errors.product_type && <p className="mt-1 text-sm text-red-600">{errors.product_type}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Identification & Logistique */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Identification & Logistique</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldText label="SKU *" name="sku" value={formData.sku} onChange={handleInputChange} error={errors.sku} />
              <FieldText label="Code SH / HS *" name="sh" value={formData.sh} onChange={handleInputChange} error={errors.sh} />
              <FieldText label="Poids (g) et/ou Volume (mL) *" name="weight_volume" value={formData.weight_volume} onChange={handleInputChange} error={errors.weight_volume} />
              <FieldText label="Numéro de lot" name="lot_number" value={formData.lot_number} onChange={handleInputChange} />
              <FieldText label="EAN" name="ean" value={formData.ean} onChange={handleInputChange} />
              <FieldText label="Quantité disponible (UVC) *" name="quantity_uvc" value={formData.quantity_uvc} onChange={handleInputChange} error={errors.quantity_uvc} type="number" />
            </div>
          </div>
        )}

        {/* Step 3: Revalorisation */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Revalorisation (INTERNE)</h3>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Raison de la revalorisation *</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { value: 'leger_defaut', label: 'Léger défaut esthétique' },
                  { value: 'fin_collection', label: 'Fin de collection' },
                  { value: 'surstock', label: 'Surstock' },
                  { value: 'changement_packaging', label: 'Changement de packaging' },
                  { value: 'autre', label: 'Autre' },
                ].map(option => (
                  <label key={option.value} className="flex items-center gap-2 text-sm font-medium text-gray-800">
                    <input
                      type="radio"
                      name="revalorisation_reason"
                      value={option.value}
                      checked={formData.revalorisation_reason === option.value}
                      onChange={handleInputChange}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              {errors.revalorisation_reason && <p className="mt-1 text-sm text-red-600">{errors.revalorisation_reason}</p>}
            </div>

            <FieldTextArea
              label="Détails de la revalorisation *"
              name="revalorisation_details"
              value={formData.revalorisation_details}
              onChange={handleInputChange}
              error={errors.revalorisation_details}
              helper="Inclure la date de fin d'utilisation (DDM / PAO), la description du défaut, l'évolution de la collection."
            />

            <FieldText
              label="Souhait de revalorisation *"
              name="revalorisation_wish"
              value={formData.revalorisation_wish}
              onChange={handleInputChange}
              error={errors.revalorisation_wish}
            />

            {formData.revalorisation_reason === 'leger_defaut' && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Photos du produit et du défaut *
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Veuillez uploader au minimum une photo du produit et une photo montrant le défaut esthétique.
                </p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileChange(e, 'defect_images')}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955] ${errors.defect_images ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.defect_images && <p className="mt-1 text-sm text-red-600">{errors.defect_images}</p>}
                {formData.defect_images.length > 0 && (
                  <p className="text-sm text-gray-700">{formData.defect_images.length} image(s) sélectionnée(s)</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Prix & Commission */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Prix & Commission (AUTO)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FieldNumber label="Prix de vente standard HT *" name="price_standard_ht" value={formData.price_standard_ht} onChange={handleInputChange} error={errors.price_standard_ht} />
              <FieldNumber label="Prix de vente standard TTC *" name="price_standard_ttc" value={formData.price_standard_ttc} onChange={handleInputChange} error={errors.price_standard_ttc} />
              <FieldNumber label="Prix remisé GREEZ HT (sans commission) *" name="price_greez_ht" value={formData.price_greez_ht} onChange={handleInputChange} error={errors.price_greez_ht} />
            </div>
            
            {/* Calculs automatiques en temps réel */}
            <div className="bg-gradient-to-br from-[#1b6955]/5 to-[#1b6955]/10 rounded-xl p-6 border border-[#1b6955]/20">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Calculs automatiques</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-1">TVA</p>
                  <p className="text-xl font-bold text-gray-900">{(computed.tva * 100).toFixed(0)}%</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Prix remisé TTC</p>
                  <p className="text-xl font-bold text-gray-900">{computed.priceGreezTtc.toFixed(2)} €</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Commission GREEZ TTC</p>
                  <p className="text-xl font-bold text-[#1b6955]">{(computed.commissionRate * 100).toFixed(0)}% = {computed.commissionTtc.toFixed(2)} €</p>
                </div>
                <div className="bg-[#1b6955]/10 rounded-lg p-4 border-2 border-[#1b6955]/30">
                  <p className="text-xs font-semibold text-[#1b6955] mb-1">Prix final TTC affiché sur GREEZ</p>
                  <p className="text-2xl font-bold text-[#1b6955]">{computed.priceFinalTtc.toFixed(2)} €</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Contenu Produit */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Contenu Produit (SHOPIFY)</h3>
            <FieldTextArea label="Description produit *" name="description" value={formData.description} onChange={handleInputChange} error={errors.description} rows={5} />
            <FieldTextArea label="Actions & efficacités produit *" name="actions_efficacites" value={formData.actions_efficacites} onChange={handleInputChange} error={errors.actions_efficacites} rows={3} />
            <FieldTextArea label="Liste INCI *" name="inci_list" value={formData.inci_list} onChange={handleInputChange} error={errors.inci_list} rows={3} />
            <FieldTextArea label="Conseils d'utilisation *" name="usage_advice" value={formData.usage_advice} onChange={handleInputChange} error={errors.usage_advice} rows={3} />
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Présence de perturbateurs endocriniens *</label>
              <div className="flex gap-4">
                {['NON', 'OUI'].map(option => (
                  <label key={option} className="flex items-center gap-2 text-sm font-medium text-gray-800">
                    <input
                      type="radio"
                      name="endocrine_disruptors"
                      value={option}
                      checked={formData.endocrine_disruptors === option}
                      onChange={handleInputChange}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Champs Conditionnels */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Champs Conditionnels</h3>
            {formData.product_type === 'Parfum' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldText label="Famille olfactive *" name="fragrance_family" value={formData.fragrance_family} onChange={handleInputChange} error={errors.fragrance_family} />
                <FieldText label="Notes olfactives *" name="fragrance_notes" value={formData.fragrance_notes} onChange={handleInputChange} error={errors.fragrance_notes} />
              </div>
            ) : formData.product_type === 'Maquillage' ? (
              <div className="space-y-2">
                <FieldText 
                  label="Couleur hexadécimale *" 
                  name="color_hex" 
                  value={formData.color_hex} 
                  onChange={handleInputChange} 
                  error={errors.color_hex} 
                  placeholder="#FF5733"
                />
                <p className="text-xs text-gray-500">
                  Format hexadécimal requis (ex: #FF5733 ou #F57)
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                Aucun champ conditionnel requis pour ce type de produit.
              </div>
            )}
          </div>
        )}

        {/* Step 7: Images Produit */}
        {currentStep === 7 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Images Produit</h3>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Images du produit (min. 1) *
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileChange(e, 'images')}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955] ${errors.images ? 'border-red-500' : 'border-gray-300'}`}
              />
              <p className="text-xs text-gray-500">Minimum 1 image. Fond clair recommandé.</p>
              {errors.images && <p className="mt-1 text-sm text-red-600">{errors.images}</p>}
              {formData.images.length > 0 && (
                <p className="text-sm text-gray-700">{formData.images.length} image(s) sélectionnée(s)</p>
              )}
            </div>
          </div>
        )}

        {/* Step 8: Validation */}
        {currentStep === 8 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Validation</h3>
            <div className="space-y-3">
              <label className="flex items-start gap-3 text-sm text-gray-800">
                <input
                  type="checkbox"
                  name="confirm_accuracy"
                  checked={formData.confirm_accuracy}
                  onChange={handleInputChange}
                  className="mt-1"
                />
                Je confirme l'exactitude des informations
              </label>
              {errors.confirm_accuracy && <p className="text-sm text-red-600">{errors.confirm_accuracy}</p>}

              <label className="flex items-start gap-3 text-sm text-gray-800">
                <input
                  type="checkbox"
                  name="confirm_sale"
                  checked={formData.confirm_sale}
                  onChange={handleInputChange}
                  className="mt-1"
                />
                J'accepte la mise en vente sur GREEZ
              </label>
              {errors.confirm_sale && <p className="text-sm text-red-600">{errors.confirm_sale}</p>}
            </div>

            {/* Message de confirmation */}
            <div className="bg-[#1b6955]/5 border border-[#1b6955]/20 rounded-lg p-4 mt-6">
              <p className="text-sm text-gray-700">
                <strong>Merci pour votre envoi.</strong><br />
                Votre produit sera vérifié puis ajouté en brouillon sur la boutique.<br />
                Nous vous contacterons uniquement si une information est manquante.
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="pt-4 flex justify-between gap-4 border-t">
          <button
            type="button"
            onClick={previousStep}
            disabled={currentStep === 1}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
          >
            Précédent
          </button>
          
          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-3 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] font-semibold transition-colors shadow-md"
            >
              Suivant
            </button>
          ) : (
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md transition-colors"
              >
                {loading ? 'Envoi en cours...' : 'Envoyer le formulaire'}
              </button>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}

// Components utilitaires
type FieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  rows?: number;
  helper?: string;
};

const FieldText = ({ label, name, value, onChange, error, placeholder, type = 'text' }: FieldProps) => (
  <div className="space-y-1">
    <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955] ${error ? 'border-red-500' : 'border-gray-300'}`}
    />
    {error && <p className="text-sm text-red-600">{error}</p>}
  </div>
);

const FieldNumber = (props: FieldProps) => <FieldText {...props} type="number" />;

const FieldTextArea = ({ label, name, value, onChange, error, rows = 4, helper }: FieldProps) => (
  <div className="space-y-1">
    <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      rows={rows}
      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955] ${error ? 'border-red-500' : 'border-gray-300'}`}
    />
    {helper && <p className="text-xs text-gray-500">{helper}</p>}
    {error && <p className="text-sm text-red-600">{error}</p>}
  </div>
);

