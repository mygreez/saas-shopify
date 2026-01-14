// ============================================
// API: Sauvegarder un seul produit
// ============================================
// Permet de sauvegarder un seul produit individuellement depuis Step 2

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { calculatePricing } from '@/lib/utils/partner-workflow';
import { ImageUploader } from '@/lib/services/image/uploader';

const ProductDetailSchema = z.object({
  brand_name: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  sku: z.string().min(1),
  sh: z.string().optional(),
  weight_volume: z.string().min(1),
  lot_number: z.string().optional(),
  revalorisation_reason: z.string().min(1),
  revalorisation_details: z.string().optional(),
  product_type: z.string().min(1),
  price_standard_ht: z.number().min(0),
  price_standard_ttc: z.number().min(0),
  price_greez_ht: z.number().min(0),
  price_greez_ttc: z.number().min(0),
  description: z.string().min(1),
  actions_efficacites: z.string().min(1),
  inci_list: z.string().min(1),
  usage_advice: z.string().min(1),
  endocrine_disruptors: z.boolean(),
  ean: z.string().optional(),
  quantity_uvc: z.number().int().min(1),
  perfume_family_notes: z.string().optional(),
  perfume_notes: z.string().optional(),
  makeup_color_hex: z.string().optional(),
  revalorisation_wish: z.string().min(1),
  image_count: z.number().int().min(0).max(5).optional(),
});

const SaveProductSchema = z.object({
  token: z.string().min(1),
  submission_id: z.string().uuid(),
  product: ProductDetailSchema,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const token = formData.get('token') as string;
    const submissionId = formData.get('submission_id') as string;
    const productJson = formData.get('product_json') as string;

    if (!productJson) {
      return NextResponse.json({ success: false, error: 'Données produit manquantes' }, { status: 400 });
    }

    const productData = JSON.parse(productJson);

    const validatedData = SaveProductSchema.parse({
      token,
      submission_id: submissionId,
      product: productData,
    });

    // Valider le token et récupérer l'invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('partner_invitations')
      .select('id, admin_id')
      .eq('token', validatedData.token)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { success: false, error: 'Token invalide ou expiré' },
        { status: 401 }
      );
    }

    // Vérifier que la submission existe et appartient à cette invitation
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('partner_submissions')
      .select('id, invitation_id, brand_id')
      .eq('id', validatedData.submission_id)
      .eq('invitation_id', invitation.id)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json(
        { success: false, error: 'Soumission non trouvée' },
        { status: 404 }
      );
    }

    // Récupérer l'admin_id depuis l'invitation
    const adminId = invitation.admin_id;

    // Collecter les images pour ce produit
    const productImages: File[] = [];
    for (let j = 0; j < (validatedData.product.image_count || 0); j++) {
      const imageFile = formData.get(`product_image_${j}`) as File | null;
      if (imageFile) {
        productImages.push(imageFile);
      }
    }

    // Upload des images
    let uploadedImageUrls: string[] = [];
    if (productImages.length > 0) {
      try {
        const uploader = ImageUploader.fromEnv();
        uploadedImageUrls = await uploader.uploadImages(
          productImages,
          `products/${submission.id}/${validatedData.product.sku || validatedData.product.title}`
        );
      } catch (uploadError) {
        console.error(`Erreur upload images pour produit ${validatedData.product.title}:`, uploadError);
        // Continuer sans images si l'upload échoue
      }
    }

    // Calculer les prix
    const pricing = calculatePricing(
      validatedData.product.price_standard_ht,
      validatedData.product.price_standard_ttc,
      validatedData.product.price_greez_ht,
      validatedData.product.price_greez_ttc
    );

    // Vérifier si le produit existe déjà (par SKU)
    const { data: existingProduct, error: existingError } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('user_id', adminId)
      .eq('name', validatedData.product.title)
      .single();

    let productId: string;

    if (existingProduct && !existingError) {
      // Mettre à jour le produit existant
      const { data: updatedProduct, error: updateError } = await supabaseAdmin
        .from('products')
        .update({
          category: validatedData.product.product_type,
          price: validatedData.product.price_greez_ttc,
          images: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
        })
        .eq('id', existingProduct.id)
        .select()
        .single();

      if (updateError) {
        console.error('Erreur mise à jour produit:', updateError);
        return NextResponse.json(
          { success: false, error: 'Erreur lors de la mise à jour du produit' },
          { status: 500 }
        );
      }

      productId = updatedProduct.id;

      // Mettre à jour les détails du produit
      const { error: detailsUpdateError } = await supabaseAdmin
        .from('product_details')
        .update({
          brand_name: validatedData.product.brand_name,
          subtitle: validatedData.product.subtitle || null,
          sku: validatedData.product.sku,
          sh: validatedData.product.sh || null,
          weight_volume: validatedData.product.weight_volume,
          lot_number: validatedData.product.lot_number || null,
          revalorisation_reason: validatedData.product.revalorisation_reason,
          revalorisation_details: validatedData.product.revalorisation_details || null,
          product_type: validatedData.product.product_type,
          price_standard_ht: validatedData.product.price_standard_ht,
          price_standard_ttc: validatedData.product.price_standard_ttc,
          price_greez_ht: validatedData.product.price_greez_ht,
          price_greez_ttc: validatedData.product.price_greez_ttc,
          greez_commission_ttc: pricing.commissionGreezTTC,
          brand_billing_ttc: pricing.facturationMarqueTTC,
          description: validatedData.product.description,
          actions_efficacites: validatedData.product.actions_efficacites,
          inci_list: validatedData.product.inci_list,
          usage_advice: validatedData.product.usage_advice,
          endocrine_disruptors: validatedData.product.endocrine_disruptors,
          ean: validatedData.product.ean || null,
          quantity_uvc: validatedData.product.quantity_uvc,
          perfume_family_notes: validatedData.product.perfume_family_notes || null,
          makeup_color_hex: validatedData.product.makeup_color_hex || null,
          revalorisation_wish: validatedData.product.revalorisation_wish,
        })
        .eq('product_id', productId);

      if (detailsUpdateError) {
        console.error('Erreur mise à jour détails:', detailsUpdateError);
        return NextResponse.json(
          { success: false, error: 'Erreur lors de la mise à jour des détails' },
          { status: 500 }
        );
      }
    } else {
      // Créer un nouveau produit
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .insert({
          user_id: adminId,
          name: validatedData.product.title,
          category: validatedData.product.product_type,
          price: validatedData.product.price_greez_ttc,
          status: 'draft',
          images: uploadedImageUrls,
        })
        .select()
        .single();

      if (productError || !product) {
        console.error('Erreur création produit:', productError);
        return NextResponse.json(
          { success: false, error: 'Erreur lors de la création du produit' },
          { status: 500 }
        );
      }

      productId = product.id;

      // Créer les détails du produit
      const { error: detailsError } = await supabaseAdmin
        .from('product_details')
        .insert({
          product_id: productId,
          brand_name: validatedData.product.brand_name,
          subtitle: validatedData.product.subtitle || null,
          sku: validatedData.product.sku,
          sh: validatedData.product.sh || null,
          weight_volume: validatedData.product.weight_volume,
          lot_number: validatedData.product.lot_number || null,
          revalorisation_reason: validatedData.product.revalorisation_reason,
          revalorisation_details: validatedData.product.revalorisation_details || null,
          product_type: validatedData.product.product_type,
          price_standard_ht: validatedData.product.price_standard_ht,
          price_standard_ttc: validatedData.product.price_standard_ttc,
          price_greez_ht: validatedData.product.price_greez_ht,
          price_greez_ttc: validatedData.product.price_greez_ttc,
          greez_commission_ttc: pricing.commissionGreezTTC,
          brand_billing_ttc: pricing.facturationMarqueTTC,
          description: validatedData.product.description,
          actions_efficacites: validatedData.product.actions_efficacites,
          inci_list: validatedData.product.inci_list,
          usage_advice: validatedData.product.usage_advice,
          endocrine_disruptors: validatedData.product.endocrine_disruptors,
          ean: validatedData.product.ean || null,
          quantity_uvc: validatedData.product.quantity_uvc,
          perfume_family_notes: validatedData.product.perfume_family_notes || null,
          makeup_color_hex: validatedData.product.makeup_color_hex || null,
          revalorisation_wish: validatedData.product.revalorisation_wish,
        });

      if (detailsError) {
        console.error('Erreur création détails:', detailsError);
        return NextResponse.json(
          { success: false, error: 'Erreur lors de la création des détails' },
          { status: 500 }
        );
      }

      // Lier le produit à la submission
      const { error: linkError } = await supabaseAdmin
        .from('partner_submission_products')
        .insert({
          submission_id: submission.id,
          product_id: productId,
        });

      if (linkError) {
        console.error('Erreur liaison produit:', linkError);
        // Ne pas échouer si la liaison échoue, le produit est déjà créé
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        product_id: productId,
        message: 'Produit sauvegardé avec succès',
      },
    });

  } catch (error: any) {
    console.error('Erreur sauvegarde produit:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la sauvegarde' },
      { status: 500 }
    );
  }
}


