// ============================================
// API: Créer un produit (Step 3 - Dashboard)
// ============================================
// Permet à un partenaire de créer un produit simple (titre, description, prix, photo)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { ImageUploader } from '@/lib/services/image/uploader';

const CreateProductSchema = z.object({
  token: z.string().min(1, 'Token requis'),
  submission_id: z.string().uuid('ID de soumission invalide'),

  // Section 1 – Identité produit
  brand: z.string().min(1, 'Marque requise'),
  product_name: z.string().min(1, 'Titre du produit requis'),
  subtitle: z.string().optional(),
  product_type: z.enum([
    'Produit pour le visage',
    'Produit pour le corps',
    'Cheveux',
    'Maquillage',
    'Parfum'
  ], {
    errorMap: () => ({ message: 'Type de produit invalide. Doit être: Produit pour le visage, Produit pour le corps, Cheveux, Maquillage, ou Parfum' })
  }),

  // Section 2 – Identification & logistique
  sku: z.string().min(1, 'SKU requis'),
  sh: z.string().min(1, 'Code SH / HS requis'),
  weight_volume: z.string().min(1, 'Poids (en g) et/ou Volume (en mL) requis'),
  lot_number: z.string().optional(),
  ean: z.string().optional(),
  quantity_uvc: z.number().int().min(1, 'Quantité disponible (UVC) requise'),

  // Section 3 – Revalorisation (interne)
  revalorisation_reason: z.enum(['leger_defaut', 'fin_collection', 'surstock', 'changement_packaging', 'autre'], {
    errorMap: () => ({ message: 'Raison de la revalorisation invalide' })
  }),
  revalorisation_details: z.string().min(1, 'Détails de la revalorisation requis'),
  revalorisation_wish: z.string().min(1, 'Souhait de revalorisation requis'),
  defect_image_count: z.number().int().min(0).optional(),

  // Section 4 – Prix & commission (les calculs sont automatiques côté serveur)
  price_standard_ht: z.number().min(0.01, 'Prix de vente standard HT requis'),
  price_standard_ttc: z.number().min(0.01, 'Prix de vente standard TTC requis'),
  price_greez_ht: z.number().min(0.01, 'Prix remisé GREEZ HT (sans commission) requis'),
  price_greez_ttc: z.number().min(0.01, 'Prix remisé TTC requis'),
  commission_greez_ttc: z.number().min(0, 'Commission GREEZ TTC requise'),
  price_final_ttc: z.number().min(0.01, 'Prix final TTC requis'),

  // Section 5 – Contenu produit (SHOPIFY)
  description: z.string().min(1, 'Description produit requise'),
  actions_efficacites: z.string().min(1, 'Actions & efficacités produit requises'),
  inci_list: z.string().min(1, 'Liste INCI requise'),
  usage_advice: z.string().min(1, 'Conseils d\'utilisation requis'),
  endocrine_disruptors: z.enum(['NON', 'OUI'], {
    errorMap: () => ({ message: 'Présence de perturbateurs endocriniens doit être NON ou OUI' })
  }),

  // Section 6 – Champs conditionnels
  fragrance_family: z.string().optional(),
  fragrance_notes: z.string().optional(),
  color_hex: z.string().optional(),

  // Section 7 – Images produit
  image_count: z.number().int().min(1, 'Au moins une image produit est requise'),

  // Section 8 – Validation
  confirm_accuracy: z.enum(['true', 'false'], {
    errorMap: () => ({ message: 'Vous devez confirmer l\'exactitude des informations' })
  }),
  confirm_sale: z.enum(['true', 'false'], {
    errorMap: () => ({ message: 'Vous devez accepter la mise en vente sur GREEZ' })
  }),
}).refine((data) => {
  // Validation conditionnelle pour Parfum
  if (data.product_type === 'Parfum') {
    if (!data.fragrance_family || data.fragrance_family.trim() === '') {
      return false;
    }
    if (!data.fragrance_notes || data.fragrance_notes.trim() === '') {
      return false;
    }
  }
  return true;
}, {
  message: 'Famille olfactive et notes olfactives sont obligatoires pour les parfums',
  path: ['fragrance_family'],
}).refine((data) => {
  // Validation conditionnelle pour Maquillage
  if (data.product_type === 'Maquillage') {
    if (!data.color_hex || data.color_hex.trim() === '') {
      return false;
    }
    // Validation format hexadécimal
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexRegex.test(data.color_hex)) {
      return false;
    }
  }
  return true;
}, {
  message: 'Couleur hexadécimale valide est obligatoire pour le maquillage (format: #FF5733)',
  path: ['color_hex'],
}).refine((data) => {
  // Validation conditionnelle pour images de défaut
  if (data.revalorisation_reason === 'leger_defaut') {
    if (!data.defect_image_count || data.defect_image_count === 0) {
      return false;
    }
  }
  return true;
}, {
  message: 'Au moins une photo du produit et du défaut est requise pour "Léger défaut esthétique"',
  path: ['defect_image_count'],
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extraire les données du formulaire
    const token = formData.get('token') as string;
    const submissionId = formData.get('submission_id') as string;

    // Section 1
    const brand = formData.get('brand') as string;
    const productName = formData.get('product_name') as string;
    const subtitle = formData.get('subtitle') as string | null;
    const productType = formData.get('product_type') as string;

    // Section 2
    const sku = formData.get('sku') as string;
    const sh = formData.get('sh') as string;
    const weightVolume = formData.get('weight_volume') as string;
    const lotNumber = formData.get('lot_number') as string | null;
    const ean = formData.get('ean') as string | null;
    const quantityUvcStr = formData.get('quantity_uvc') as string;

    // Section 3
    const revalorisationReason = formData.get('revalorisation_reason') as string;
    const revalorisationDetails = formData.get('revalorisation_details') as string;
    const revalorisationWish = formData.get('revalorisation_wish') as string;
    const defectImageCountStr = formData.get('defect_image_count') as string | null;

    // Section 4
    const priceStandardHtStr = formData.get('price_standard_ht') as string;
    const priceStandardTtcStr = formData.get('price_standard_ttc') as string;
    const priceGreezHtStr = formData.get('price_greez_ht') as string;
    const priceGreezTtcStr = formData.get('price_greez_ttc') as string;
    const commissionGreezTtcStr = formData.get('commission_greez_ttc') as string;
    const priceFinalTtcStr = formData.get('price_final_ttc') as string;

    // Section 5
    const description = formData.get('description') as string;
    const actionsEfficacites = formData.get('actions_efficacites') as string;
    const inciList = formData.get('inci_list') as string;
    const usageAdvice = formData.get('usage_advice') as string;
    const endocrineDisruptors = formData.get('endocrine_disruptors') as string;

    // Section 6
    const fragranceFamily = formData.get('fragrance_family') as string | null;
    const fragranceNotes = formData.get('fragrance_notes') as string | null;
    const colorHex = formData.get('color_hex') as string | null;

    // Section 7
    const imageCountStr = formData.get('image_count') as string | null;

    // Section 8
    const confirmAccuracy = formData.get('confirm_accuracy') as string;
    const confirmSale = formData.get('confirm_sale') as string;

    // Log des données reçues pour débogage
    console.log('📥 Données reçues du formulaire:', {
      token: token ? 'présent' : 'manquant',
      submission_id: submissionId,
      product_name: productName,
      brand,
      product_type: productType,
      sku,
      sh,
      weight_volume: weightVolume,
      quantity_uvc: quantityUvcStr,
      revalorisation_reason: revalorisationReason,
      price_standard_ht: priceStandardHtStr,
      price_standard_ttc: priceStandardTtcStr,
      price_greez_ht: priceGreezHtStr,
      image_count: imageCountStr,
      defect_image_count: defectImageCountStr,
    });

    // Parser les valeurs numériques
    const quantityUvc = quantityUvcStr && quantityUvcStr.trim() !== '' ? parseInt(quantityUvcStr, 10) : 0;
    const defectImageCountParsed = defectImageCountStr && defectImageCountStr.trim() !== '' ? parseInt(defectImageCountStr, 10) : 0;
    const priceStandardHt = priceStandardHtStr && priceStandardHtStr.trim() !== '' ? parseFloat(priceStandardHtStr) : 0;
    const priceStandardTtc = priceStandardTtcStr && priceStandardTtcStr.trim() !== '' ? parseFloat(priceStandardTtcStr) : 0;
    const priceGreezHt = priceGreezHtStr && priceGreezHtStr.trim() !== '' ? parseFloat(priceGreezHtStr) : 0;
    const priceGreezTtc = priceGreezTtcStr && priceGreezTtcStr.trim() !== '' ? parseFloat(priceGreezTtcStr) : 0;
    const commissionGreezTtc = commissionGreezTtcStr && commissionGreezTtcStr.trim() !== '' ? parseFloat(commissionGreezTtcStr) : 0;
    const priceFinalTtc = priceFinalTtcStr && priceFinalTtcStr.trim() !== '' ? parseFloat(priceFinalTtcStr) : 0;
    const imageCountValue = imageCountStr && imageCountStr.trim() !== '' ? parseInt(imageCountStr, 10) : 0;

    // Validation des valeurs numériques de base
    if (quantityUvc <= 0) {
      return NextResponse.json({ success: false, error: 'Quantité invalide' }, { status: 400 });
    }
    if (priceStandardHt <= 0 || priceStandardTtc <= 0 || priceGreezHt <= 0) {
      return NextResponse.json({ success: false, error: 'Prix invalides' }, { status: 400 });
    }

    // Calculer et valider les prix selon les règles GREEZ
    // TVA = 20%, Commission GREEZ = 57% TTC
    const tva = 0.20;
    const commissionRate = 0.57;
    const calculatedPriceGreezTtc = priceGreezHt * (1 + tva);
    const calculatedCommissionTtc = calculatedPriceGreezTtc * commissionRate;
    const calculatedPriceFinalTtc = calculatedPriceGreezTtc + calculatedCommissionTtc;

    // Vérifier que les valeurs calculées correspondent (tolérance de 0.01€ pour les arrondis)
    if (Math.abs(calculatedPriceGreezTtc - priceGreezTtc) > 0.01) {
      console.warn(`⚠️ Prix remisé TTC calculé (${calculatedPriceGreezTtc}) ne correspond pas à la valeur reçue (${priceGreezTtc})`);
    }
    if (Math.abs(calculatedCommissionTtc - commissionGreezTtc) > 0.01) {
      console.warn(`⚠️ Commission TTC calculée (${calculatedCommissionTtc}) ne correspond pas à la valeur reçue (${commissionGreezTtc})`);
    }
    if (Math.abs(calculatedPriceFinalTtc - priceFinalTtc) > 0.01) {
      console.warn(`⚠️ Prix final TTC calculé (${calculatedPriceFinalTtc}) ne correspond pas à la valeur reçue (${priceFinalTtc})`);
    }

    // Utiliser les valeurs calculées pour garantir la cohérence
    const finalPriceGreezTtc = calculatedPriceGreezTtc;
    const finalCommissionTtc = calculatedCommissionTtc;
    const finalPriceFinalTtc = calculatedPriceFinalTtc;
    // Calculer facturation_marque_ttc (43% TTC = prix remisé TTC - commission TTC)
    // Commission GREEZ = 57% TTC, donc facturation marque = 43% TTC
    const facturationMarqueTtc = finalPriceGreezTtc - finalCommissionTtc;

    // Valider les données avec gestion d'erreurs détaillée
    let validatedData;
    try {
      validatedData = CreateProductSchema.parse({
        token,
        submission_id: submissionId, // Sera remplacé par actualSubmissionId plus tard
        product_name: productName,
        brand,
        subtitle: subtitle || undefined,
        product_type: productType,
        sku,
        sh,
        weight_volume: weightVolume,
        lot_number: lotNumber || undefined,
        ean: ean || undefined,
        quantity_uvc: quantityUvc,
        revalorisation_reason: revalorisationReason as any,
        revalorisation_details: revalorisationDetails,
        revalorisation_wish: revalorisationWish,
        defect_image_count: defectImageCountParsed,
        price_standard_ht: priceStandardHt,
        price_standard_ttc: priceStandardTtc,
        price_greez_ht: priceGreezHt,
        price_greez_ttc: finalPriceGreezTtc,
        commission_greez_ttc: finalCommissionTtc,
        price_final_ttc: finalPriceFinalTtc,
        description,
        actions_efficacites: actionsEfficacites,
        inci_list: inciList,
        usage_advice: usageAdvice,
        endocrine_disruptors: endocrineDisruptors as any,
        fragrance_family: fragranceFamily || undefined,
        fragrance_notes: fragranceNotes || undefined,
        color_hex: colorHex || undefined,
        image_count: imageCountValue,
        confirm_accuracy: confirmAccuracy,
        confirm_sale: confirmSale,
      });
    } catch (validationError: any) {
      console.error('Erreur validation:', validationError);
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Données invalides',
            details: validationError.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Valider le token
    if (validatedData.confirm_accuracy !== 'true' || validatedData.confirm_sale !== 'true') {
      return NextResponse.json(
        { success: false, error: 'Merci de confirmer l’exactitude et la mise en vente' },
        { status: 400 }
      );
    }

    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('partner_invitations')
      .select('*, admin:users!partner_invitations_admin_id_fkey(id)')
      .eq('token', validatedData.token)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { success: false, error: 'Token invalide' },
        { status: 404 }
      );
    }

    // Vérifier que l'invitation n'est pas expirée
    const expiresAt = new Date(invitation.expires_at);
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { success: false, error: 'Token expiré' },
        { status: 400 }
      );
    }

    // Vérifier que Step 1 et 2 sont complétés
    // Utiliser le submission_id du formulaire OU récupérer depuis l'invitation
    let submission: any;
    if (submissionId) {
      // Vérifier que le submission_id fourni correspond bien à cette invitation
      const { data: submissionById, error: submissionByIdError } = await supabaseAdmin
        .from('partner_submissions')
        .select('id, status, invitation_id, brand:brands(id, name)')
        .eq('id', submissionId)
        .eq('invitation_id', invitation.id)
        .single();
      
      if (submissionByIdError || !submissionById) {
        return NextResponse.json(
          { success: false, error: 'Soumission non trouvée ou non liée à cette invitation' },
          { status: 400 }
        );
      }
      submission = submissionById;
    } else {
      // Fallback : récupérer la submission depuis l'invitation
      const { data: submissionByInvitation, error: submissionError } = await supabaseAdmin
        .from('partner_submissions')
        .select('id, status, brand:brands(id, name)')
        .eq('invitation_id', invitation.id)
        .single();

      if (submissionError || !submissionByInvitation) {
        return NextResponse.json(
          { success: false, error: 'Step 1 ou 2 non complété' },
          { status: 400 }
        );
      }
      submission = submissionByInvitation;
    }

    if (submission.status !== 'step2_completed') {
      return NextResponse.json(
        { success: false, error: 'Step 1 et 2 doivent être complétés' },
        { status: 400 }
      );
    }

    // Vérifier l'unicité du SKU
    const { data: existingSku, error: skuCheckError } = await supabaseAdmin
      .from('product_details')
      .select('id, sku')
      .eq('sku', validatedData.sku)
      .maybeSingle();

    if (skuCheckError) {
      console.error('Erreur vérification SKU:', skuCheckError);
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la vérification du SKU' },
        { status: 500 }
      );
    }

    if (existingSku) {
      return NextResponse.json(
        { success: false, error: 'Ce SKU existe déjà. Veuillez utiliser un SKU unique.' },
        { status: 400 }
      );
    }

    // Utiliser l'ID de la submission récupérée (plus fiable)
    const actualSubmissionId = submission.id;

    // Upload des images produit
    const imageUrls: string[] = [];
    const imageCount = validatedData.image_count || 0;
    console.log(`📸 Upload de ${imageCount} image(s) produit...`);
    for (let i = 0; i < imageCount; i++) {
      const imageFile = formData.get(`image_${i}`) as File | null;
      if (imageFile && imageFile.size > 0) {
        console.log(`📸 Upload image ${i + 1}/${imageCount}: ${imageFile.name} (${imageFile.size} bytes)`);
        try {
          const uploader = ImageUploader.fromEnv();
          const imageUrl = await uploader.uploadImage(imageFile, 'products');
          if (imageUrl) {
            console.log(`✅ Image ${i + 1} uploadée: ${imageUrl}`);
            imageUrls.push(imageUrl);
          } else {
            console.warn(`⚠️ Image ${i + 1} uploadée mais URL vide`);
          }
        } catch (uploadError) {
          console.error(`❌ Erreur upload image ${i}:`, uploadError);
        }
      } else {
        console.warn(`⚠️ Image ${i} manquante ou vide`);
      }
    }
    console.log(`📸 Total images uploadées: ${imageUrls.length}/${imageCount}`);

    // Upload des images de défaut (conditionnel)
    const defectImageUrls: string[] = [];
    const defectImageCount = validatedData.defect_image_count || 0;
    for (let i = 0; i < defectImageCount; i++) {
      const imageFile = formData.get(`defect_image_${i}`) as File | null;
      if (imageFile && imageFile.size > 0) {
        try {
          const uploader = ImageUploader.fromEnv();
          const imageUrl = await uploader.uploadImage(imageFile, 'products/defects');
          if (imageUrl) defectImageUrls.push(imageUrl);
        } catch (uploadError) {
          console.warn(`Erreur upload image défaut ${i}:`, uploadError);
        }
      }
    }

    // Récupérer l'admin_id depuis l'invitation
    const adminId = invitation.admin_id;

    // Créer le produit
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .insert({
        user_id: adminId,
        name: validatedData.product_name,
        category: validatedData.product_type || null,
        price: finalPriceFinalTtc, // Prix final TTC (avec commission 57%)
        images: imageUrls.length > 0 ? imageUrls : [], // Tableau d'URLs des images
        variants: [],
        generated_content: {
          title: validatedData.product_name,
          short_description: validatedData.description,
          long_description: validatedData.description,
          description: validatedData.description,
        },
        raw_data: {
          submission_id: actualSubmissionId,
          brand: validatedData.brand,
          product_name: validatedData.product_name,
          subtitle: validatedData.subtitle || null,
          product_type: validatedData.product_type,
          sku: validatedData.sku,
          sh: validatedData.sh,
          weight_volume: validatedData.weight_volume,
          lot_number: validatedData.lot_number || null,
          ean: validatedData.ean || null,
          quantity_uvc: validatedData.quantity_uvc,
          revalorisation_reason: validatedData.revalorisation_reason,
          revalorisation_details: validatedData.revalorisation_details,
          revalorisation_wish: validatedData.revalorisation_wish,
          defect_images: defectImageUrls,
          // Prix et calculs (utiliser les valeurs calculées pour garantir la cohérence)
          price_standard_ht: validatedData.price_standard_ht,
          price_standard_ttc: validatedData.price_standard_ttc,
          price_greez_ht: validatedData.price_greez_ht,
          price_greez_ttc: finalPriceGreezTtc, // Prix remisé TTC calculé (HT × 1.20)
          commission_greez_ttc: finalCommissionTtc, // Commission GREEZ = 57% TTC
          facturation_marque_ttc: facturationMarqueTtc, // Facturation marque = 43% TTC
          price_final_ttc: finalPriceFinalTtc, // Prix final TTC (prix remisé TTC + commission)
          // Calculs automatiques (pour référence)
          tva_rate: 0.20, // TVA = 20%
          commission_rate: 0.57, // Commission GREEZ = 57% TTC
          // Contenu produit
          description: validatedData.description,
          actions_efficacites: validatedData.actions_efficacites,
          inci_list: validatedData.inci_list,
          usage_advice: validatedData.usage_advice,
          endocrine_disruptors: validatedData.endocrine_disruptors,
          // Champs conditionnels
          fragrance_family: validatedData.fragrance_family || null,
          fragrance_notes: validatedData.fragrance_notes || null,
          color_hex: validatedData.color_hex || null,
          // Validation
          confirm_accuracy: validatedData.confirm_accuracy === 'true',
          confirm_sale: validatedData.confirm_sale === 'true',
        },
        status: 'draft',
      })
      .select()
      .single();

    if (productError) {
      console.error('Erreur création produit:', productError);
      console.error('Détails erreur:', {
        code: productError.code,
        message: productError.message,
        details: productError.details,
        hint: productError.hint,
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erreur lors de la création du produit',
          details: process.env.NODE_ENV === 'development' ? productError.message : undefined
        },
        { status: 500 }
      );
    }

    // Créer l'entrée dans product_details pour lier le produit à la submission
    console.log('📝 Création product_details pour produit:', product.id, 'submission:', actualSubmissionId);
    
    // Combiner famille olfactive et notes olfactives pour les parfums
    let perfumeFamilyNotes: string | null = null;
    if (validatedData.product_type === 'Parfum' && validatedData.fragrance_family && validatedData.fragrance_notes) {
      perfumeFamilyNotes = `${validatedData.fragrance_family} - ${validatedData.fragrance_notes}`;
    } else if (validatedData.fragrance_family) {
      perfumeFamilyNotes = validatedData.fragrance_family;
    }
    
    const productDetailsData = {
      product_id: product.id,
      brand_name: validatedData.brand || (Array.isArray(submission.brand) ? submission.brand[0]?.name : submission.brand?.name) || null,
      subtitle: validatedData.subtitle || null,
      sku: validatedData.sku,
      sh: validatedData.sh,
      weight_volume: validatedData.weight_volume || 'N/A',
      lot_number: validatedData.lot_number || null,
      revalorisation_reason: validatedData.revalorisation_reason,
      revalorisation_details: validatedData.revalorisation_details,
      product_type: validatedData.product_type || 'Autre',
      price_standard_ht: validatedData.price_standard_ht,
      price_standard_ttc: validatedData.price_standard_ttc,
      price_greez_ht: validatedData.price_greez_ht,
      price_greez_ttc: finalPriceGreezTtc, // Utiliser la valeur calculée pour garantir la cohérence
      commission_greez_ttc: finalCommissionTtc, // Commission GREEZ = 57% TTC
      facturation_marque_ttc: facturationMarqueTtc, // Facturation marque = 43% TTC (prix remisé TTC - commission)
      description: validatedData.description,
      actions_efficacites: validatedData.actions_efficacites,
      inci_list: validatedData.inci_list,
      usage_advice: validatedData.usage_advice,
      endocrine_disruptors: validatedData.endocrine_disruptors === 'OUI',
      ean: validatedData.ean || null,
      quantity_uvc: validatedData.quantity_uvc || 1,
      perfume_family_notes: perfumeFamilyNotes, // Famille olfactive + notes olfactives combinées
      makeup_color_hex: validatedData.color_hex || null,
      revalorisation_wish: validatedData.revalorisation_wish,
    };
    
    console.log('📋 Données product_details à insérer:', {
      product_id: productDetailsData.product_id,
      brand_name: productDetailsData.brand_name,
      product_type: productDetailsData.product_type,
      price_standard_ht: productDetailsData.price_standard_ht,
      price_standard_ttc: productDetailsData.price_standard_ttc,
      price_greez_ht: productDetailsData.price_greez_ht,
      price_greez_ttc: productDetailsData.price_greez_ttc,
      commission_greez_ttc: productDetailsData.commission_greez_ttc,
      facturation_marque_ttc: productDetailsData.facturation_marque_ttc,
      quantity_uvc: productDetailsData.quantity_uvc,
      weight_volume: productDetailsData.weight_volume,
      perfume_family_notes: productDetailsData.perfume_family_notes,
      makeup_color_hex: productDetailsData.makeup_color_hex,
    });

    const { data: createdDetails, error: detailsError } = await supabaseAdmin
      .from('product_details')
      .insert(productDetailsData)
      .select()
      .single();

    if (detailsError) {
      console.error('❌ Erreur création product_details:', detailsError);
      console.error('Détails erreur:', {
        code: detailsError.code,
        message: detailsError.message,
        details: detailsError.details,
        hint: detailsError.hint,
      });
      // Ne pas échouer si product_details échoue, le produit est déjà créé
      // Mais on log l'erreur pour déboguer
    } else {
      console.log('✅ product_details créé avec succès:', createdDetails?.id);
    }

    // Retourner le produit avec toutes les informations
    const productResponse: any = {
      ...product,
      // Ajouter les informations supplémentaires pour faciliter l'affichage
      brand: validatedData.brand || null,
      category: validatedData.product_type || null,
      description: validatedData.description,
      product_details: createdDetails || null,
    };

    console.log('✅ Produit créé avec succès:', {
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      images_count: product.images?.length || 0,
      variants_count: product.variants?.length || 0,
    });

    return NextResponse.json({
      success: true,
      data: productResponse,
      message: 'Produit créé avec succès',
    });

  } catch (error: any) {
    console.error('Erreur création produit:', error);
    console.error('Stack trace:', error?.stack);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Données invalides',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erreur lors de la création du produit',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
      { status: 500 }
    );
  }
}

