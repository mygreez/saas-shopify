// ============================================
// API: Créer les produits depuis Step 2
// ============================================
// Permet de créer les produits avec leurs détails depuis le formulaire Step 2

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

const CreateProductsSchema = z.object({
  token: z.string().min(1),
  submission_id: z.string().uuid(),
  products: z.array(ProductDetailSchema),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extraire les données JSON
    const productsJson = formData.get('products') as string;
    if (!productsJson) {
      return NextResponse.json(
        { error: 'Données produits manquantes' },
        { status: 400 }
      );
    }
    
    const productsData = JSON.parse(productsJson);
    const token = formData.get('token') as string;
    const submissionId = formData.get('submission_id') as string;
    
    const validatedData = CreateProductsSchema.parse({
      token,
      submission_id: submissionId,
      products: productsData,
    });

    // Valider le token
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('partner_invitations')
      .select('*')
      .eq('token', validatedData.token)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 404 }
      );
    }

    // Vérifier que l'invitation n'est pas expirée
    const expiresAt = new Date(invitation.expires_at);
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { error: 'Token expiré' },
        { status: 400 }
      );
    }

    // Vérifier la submission
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('partner_submissions')
      .select('*, brand:brands(*)')
      .eq('id', validatedData.submission_id)
      .eq('invitation_id', invitation.id)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: 'Soumission non trouvée' },
        { status: 404 }
      );
    }

    // Récupérer l'admin_id depuis l'invitation
    const adminId = invitation.admin_id;

    // Créer les produits
    const createdProducts = [];

    for (let productIndex = 0; productIndex < validatedData.products.length; productIndex++) {
      const productData = validatedData.products[productIndex];
      
      // Récupérer les images pour ce produit depuis FormData
      const productImages: File[] = [];
      const imageCount = productData.image_count || 0;
      for (let imgIndex = 0; imgIndex < imageCount; imgIndex++) {
        const imageKey = `product_${productIndex}_image_${imgIndex}`;
        const imageFile = formData.get(imageKey) as File | null;
        if (imageFile && imageFile instanceof File) {
          productImages.push(imageFile);
        }
      }
      
      // Upload des images du produit
      let productImagesUrls: string[] = [];
      if (productImages.length > 0) {
        try {
          const uploader = ImageUploader.fromEnv();
          productImagesUrls = await uploader.uploadImages(productImages, 'products/images');
        } catch (uploadError) {
          console.warn('Erreur upload images produit:', uploadError);
          // Continuer même si l'upload échoue
        }
      }
      
      // Calculer les prix automatiquement
      const pricing = calculatePricing(
        productData.price_standard_ht,
        productData.price_standard_ttc,
        productData.price_greez_ht,
        productData.price_greez_ttc
      );

      // Créer le produit dans products
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .insert({
          user_id: adminId,
          name: productData.title,
          category: productData.product_type,
          price: productData.price_greez_ttc,
          status: 'draft',
          images: productImagesUrls, // URLs des images uploadées
        })
        .select()
        .single();

      if (productError) {
        console.error('Erreur création produit:', productError);
        continue; // Continuer avec les autres produits
      }

      // Créer les détails du produit
      const { error: detailsError } = await supabaseAdmin
        .from('product_details')
        .insert({
          product_id: product.id,
          brand_name: productData.brand_name,
          subtitle: productData.subtitle || null,
          sku: productData.sku,
          sh: productData.sh || null,
          weight_volume: productData.weight_volume,
          lot_number: productData.lot_number || null,
          revalorisation_reason: productData.revalorisation_reason,
          revalorisation_details: productData.revalorisation_details || null,
          product_type: productData.product_type,
          price_standard_ht: productData.price_standard_ht,
          price_standard_ttc: productData.price_standard_ttc,
          price_greez_ht: productData.price_greez_ht,
          price_greez_ttc: productData.price_greez_ttc,
          commission_greez_ttc: pricing.commissionGreezTTC,
          facturation_marque_ttc: pricing.facturationMarqueTTC,
          description: productData.description,
          actions_efficacites: productData.actions_efficacites,
          inci_list: productData.inci_list,
          usage_advice: productData.usage_advice,
          endocrine_disruptors: productData.endocrine_disruptors,
          ean: productData.ean || null,
          quantity_uvc: productData.quantity_uvc,
          perfume_family_notes: productData.perfume_family_notes 
            ? (productData.perfume_notes 
                ? `${productData.perfume_family_notes} | Notes: ${productData.perfume_notes}` 
                : productData.perfume_family_notes)
            : (productData.perfume_notes || null),
          makeup_color_hex: productData.makeup_color_hex || null,
          revalorisation_wish: productData.revalorisation_wish,
        });

      if (detailsError) {
        console.error('Erreur création détails produit:', detailsError);
        // Supprimer le produit créé si les détails échouent
        await supabaseAdmin.from('products').delete().eq('id', product.id);
        continue;
      }

      createdProducts.push({
        product_id: product.id,
        title: productData.title,
      });
    }

    // Mettre à jour le statut de la submission
    await supabaseAdmin
      .from('partner_submissions')
      .update({ status: 'step2_completed' })
      .eq('id', validatedData.submission_id);

    return NextResponse.json({
      success: true,
      data: {
        created_count: createdProducts.length,
        products: createdProducts,
      },
      message: `${createdProducts.length} produit(s) créé(s) avec succès`,
    });

  } catch (error: any) {
    console.error('Erreur création produits:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Erreur lors de la création des produits' },
      { status: 500 }
    );
  }
}


