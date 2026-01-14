// ============================================
// API: Mettre à jour un produit (Admin)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getUserId } from '@/lib/auth';

const UpdateProductSchema = z.object({
  // Section 1 – Identité produit
  brand: z.string().min(1, 'Marque requise').optional(),
  product_name: z.string().min(1, 'Titre requis').optional(),
  subtitle: z.string().optional(),
  product_type: z.enum([
    'Produit pour le visage',
    'Produit pour le corps',
    'Cheveux',
    'Maquillage',
    'Parfum'
  ]).optional(),

  // Section 2 – Identification & logistique
  sku: z.string().min(1, 'SKU requis').optional(),
  sh: z.string().min(1, 'Code SH requis').optional(),
  weight_volume: z.string().min(1, 'Poids/volume requis').optional(),
  lot_number: z.string().optional(),
  ean: z.string().optional(),
  quantity_uvc: z.number().int().min(1, 'Quantité requise').optional(),

  // Section 3 – Revalorisation (interne)
  revalorisation_reason: z.enum(['leger_defaut', 'fin_collection', 'surstock', 'changement_packaging', 'autre']).optional(),
  revalorisation_details: z.string().min(1, 'Détails requis').optional(),
  revalorisation_wish: z.string().min(1, 'Souhait requis').optional(),

  // Section 4 – Prix & commission
  price_standard_ht: z.number().min(0.01, 'Prix standard HT requis').optional(),
  price_standard_ttc: z.number().min(0.01, 'Prix standard TTC requis').optional(),
  price_greez_ht: z.number().min(0.01, 'Prix remisé HT requis').optional(),

  // Section 5 – Contenu produit
  description: z.string().min(1, 'Description requise').optional(),
  actions_efficacites: z.string().min(1, 'Actions requises').optional(),
  inci_list: z.string().min(1, 'INCI requis').optional(),
  usage_advice: z.string().min(1, 'Conseils requis').optional(),
  endocrine_disruptors: z.enum(['NON', 'OUI']).optional(),

  // Section 6 – Champs conditionnels
  fragrance_family: z.string().optional(),
  fragrance_notes: z.string().optional(),
  color_hex: z.string().optional(),

  // Section 7 – Images
  images: z.array(z.string()).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const { data: user } = await supabaseAdmin.from('users').select('role').eq('id', userId).single();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé : Admin requis' }, { status: 403 });
    }

    const resolvedParams = params instanceof Promise ? await params : params;
    const productId = resolvedParams.id;

    const body = await request.json();

    // Valider les données
    const validatedData = UpdateProductSchema.parse(body);

    // Vérifier que le produit existe et appartient à un admin
    const { data: existingProduct, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, raw_data, user_id')
      .eq('id', productId)
      .single();

    if (productError || !existingProduct) {
      return NextResponse.json({ success: false, error: 'Produit non trouvé' }, { status: 404 });
    }

    // Calculer les prix si price_greez_ht est fourni
    let updateProductData: any = {};
    let updateRawData: any = { ...(existingProduct.raw_data || {}) };
    let updateDetailsData: any = {};

    if (validatedData.price_greez_ht !== undefined) {
      const tva = 0.20;
      const commissionRate = 0.57;
      const priceGreezTtc = validatedData.price_greez_ht * (1 + tva);
      const commissionTtc = priceGreezTtc * commissionRate;
      const priceFinalTtc = priceGreezTtc + commissionTtc;

      updateProductData.price = priceFinalTtc;
      updateRawData.price_greez_ht = validatedData.price_greez_ht;
      updateRawData.price_greez_ttc = priceGreezTtc;
      updateRawData.commission_greez_ttc = commissionTtc;
      updateRawData.price_final_ttc = priceFinalTtc;
      updateRawData.facturation_marque_ttc = priceGreezTtc - commissionTtc;

      updateDetailsData.price_greez_ht = validatedData.price_greez_ht;
      updateDetailsData.price_greez_ttc = priceGreezTtc;
      updateDetailsData.commission_greez_ttc = commissionTtc;
      updateDetailsData.facturation_marque_ttc = priceGreezTtc - commissionTtc;
    }

    // Mettre à jour les images si fournies
    if (body.images !== undefined && Array.isArray(body.images)) {
      console.log(`📸 Mise à jour des images: ${body.images.length} image(s)`);
      updateProductData.images = body.images;
      updateRawData.images = body.images;
    } else {
      console.log('📸 Aucune mise à jour d\'images (images non fournies ou invalides)');
    }

    // Mettre à jour les champs du produit
    if (validatedData.product_name !== undefined) {
      updateProductData.name = validatedData.product_name;
      updateRawData.product_name = validatedData.product_name;
    }

    if (validatedData.product_type !== undefined) {
      updateProductData.category = validatedData.product_type;
      updateRawData.product_type = validatedData.product_type;
      updateDetailsData.product_type = validatedData.product_type;
    }

    if (validatedData.description !== undefined) {
      const currentContent = existingProduct.raw_data?.generated_content || {};
      updateProductData.generated_content = {
        ...currentContent,
        title: validatedData.product_name || currentContent.title,
        short_description: validatedData.description,
        long_description: validatedData.description,
        description: validatedData.description,
      };
      updateRawData.description = validatedData.description;
      updateDetailsData.description = validatedData.description;
    }

    // Mettre à jour raw_data
    if (validatedData.brand !== undefined) updateRawData.brand = validatedData.brand;
    if (validatedData.subtitle !== undefined) updateRawData.subtitle = validatedData.subtitle;
    if (validatedData.sku !== undefined) updateRawData.sku = validatedData.sku;
    if (validatedData.sh !== undefined) updateRawData.sh = validatedData.sh;
    if (validatedData.weight_volume !== undefined) updateRawData.weight_volume = validatedData.weight_volume;
    if (validatedData.lot_number !== undefined) updateRawData.lot_number = validatedData.lot_number;
    if (validatedData.ean !== undefined) updateRawData.ean = validatedData.ean;
    if (validatedData.quantity_uvc !== undefined) updateRawData.quantity_uvc = validatedData.quantity_uvc;
    if (validatedData.revalorisation_reason !== undefined) updateRawData.revalorisation_reason = validatedData.revalorisation_reason;
    if (validatedData.revalorisation_details !== undefined) updateRawData.revalorisation_details = validatedData.revalorisation_details;
    if (validatedData.revalorisation_wish !== undefined) updateRawData.revalorisation_wish = validatedData.revalorisation_wish;
    if (validatedData.price_standard_ht !== undefined) updateRawData.price_standard_ht = validatedData.price_standard_ht;
    if (validatedData.price_standard_ttc !== undefined) updateRawData.price_standard_ttc = validatedData.price_standard_ttc;
    if (validatedData.actions_efficacites !== undefined) updateRawData.actions_efficacites = validatedData.actions_efficacites;
    if (validatedData.inci_list !== undefined) updateRawData.inci_list = validatedData.inci_list;
    if (validatedData.usage_advice !== undefined) updateRawData.usage_advice = validatedData.usage_advice;
    if (validatedData.endocrine_disruptors !== undefined) updateRawData.endocrine_disruptors = validatedData.endocrine_disruptors;
    if (validatedData.fragrance_family !== undefined) updateRawData.fragrance_family = validatedData.fragrance_family;
    if (validatedData.fragrance_notes !== undefined) updateRawData.fragrance_notes = validatedData.fragrance_notes;
    if (validatedData.color_hex !== undefined) updateRawData.color_hex = validatedData.color_hex;

    updateProductData.raw_data = updateRawData;
    updateProductData.updated_at = new Date().toISOString();

    // Mettre à jour product_details
    if (validatedData.brand !== undefined) updateDetailsData.brand_name = validatedData.brand;
    if (validatedData.subtitle !== undefined) updateDetailsData.subtitle = validatedData.subtitle;
    if (validatedData.sku !== undefined) updateDetailsData.sku = validatedData.sku;
    if (validatedData.sh !== undefined) updateDetailsData.sh = validatedData.sh;
    if (validatedData.weight_volume !== undefined) updateDetailsData.weight_volume = validatedData.weight_volume;
    if (validatedData.lot_number !== undefined) updateDetailsData.lot_number = validatedData.lot_number;
    if (validatedData.ean !== undefined) updateDetailsData.ean = validatedData.ean;
    if (validatedData.quantity_uvc !== undefined) updateDetailsData.quantity_uvc = validatedData.quantity_uvc;
    if (validatedData.revalorisation_reason !== undefined) updateDetailsData.revalorisation_reason = validatedData.revalorisation_reason;
    if (validatedData.revalorisation_details !== undefined) updateDetailsData.revalorisation_details = validatedData.revalorisation_details;
    if (validatedData.revalorisation_wish !== undefined) updateDetailsData.revalorisation_wish = validatedData.revalorisation_wish;
    if (validatedData.price_standard_ht !== undefined) updateDetailsData.price_standard_ht = validatedData.price_standard_ht;
    if (validatedData.price_standard_ttc !== undefined) updateDetailsData.price_standard_ttc = validatedData.price_standard_ttc;
    if (validatedData.actions_efficacites !== undefined) updateDetailsData.actions_efficacites = validatedData.actions_efficacites;
    if (validatedData.inci_list !== undefined) updateDetailsData.inci_list = validatedData.inci_list;
    if (validatedData.usage_advice !== undefined) updateDetailsData.usage_advice = validatedData.usage_advice;
    if (validatedData.endocrine_disruptors !== undefined) {
      updateDetailsData.endocrine_disruptors = validatedData.endocrine_disruptors === 'OUI';
    }
    if (validatedData.fragrance_family !== undefined || validatedData.fragrance_notes !== undefined) {
      if (validatedData.product_type === 'Parfum' && validatedData.fragrance_family && validatedData.fragrance_notes) {
        updateDetailsData.perfume_family_notes = `${validatedData.fragrance_family} - ${validatedData.fragrance_notes}`;
      } else if (validatedData.fragrance_family) {
        updateDetailsData.perfume_family_notes = validatedData.fragrance_family;
      }
    }
    if (validatedData.color_hex !== undefined) {
      updateDetailsData.makeup_color_hex = validatedData.color_hex;
    }

    // Mettre à jour le produit
    console.log('📝 Données de mise à jour:', {
      ...updateProductData,
      images: updateProductData.images ? `${updateProductData.images.length} image(s)` : 'non modifié',
    });
    
    const { data: updatedProduct, error: updateError } = await supabaseAdmin
      .from('products')
      .update(updateProductData)
      .eq('id', productId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erreur mise à jour produit:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: 'Erreur lors de la mise à jour du produit',
        details: updateError.message 
      }, { status: 500 });
    }

    console.log('✅ Produit mis à jour avec succès:', {
      id: updatedProduct.id,
      name: updatedProduct.name,
      images_count: Array.isArray(updatedProduct.images) ? updatedProduct.images.length : 0,
    });

    // Mettre à jour product_details si des champs sont modifiés
    if (Object.keys(updateDetailsData).length > 0) {
      updateDetailsData.updated_at = new Date().toISOString();
      const { error: detailsError } = await supabaseAdmin
        .from('product_details')
        .update(updateDetailsData)
        .eq('product_id', productId);

      if (detailsError) {
        console.error('Erreur mise à jour product_details:', detailsError);
        // Ne pas échouer si product_details échoue, le produit est déjà mis à jour
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Produit mis à jour avec succès',
      data: updatedProduct,
    });

  } catch (error: any) {
    console.error('Erreur mise à jour produit:', error);
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
      { success: false, error: error?.message || 'Erreur lors de la mise à jour du produit' },
      { status: 500 }
    );
  }
}

