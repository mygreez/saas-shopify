// ============================================
// API: Récupérer les produits d'un partenaire
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const { token } = resolvedParams;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token manquant' },
        { status: 400 }
      );
    }

    // Valider le token
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('partner_invitations')
      .select('id, admin_id')
      .eq('token', token)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { success: false, error: 'Token invalide' },
        { status: 404 }
      );
    }

    // Récupérer la submission pour ce token
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('partner_submissions')
      .select('id')
      .eq('invitation_id', invitation.id)
      .single();

    // Récupérer les produits associés à cette submission spécifique
    // Les produits sont liés via product_details.submission_id ou products.raw_data->>'submission_id'
    let products: any[] = [];

    if (submission && !submissionError) {
      console.log('🔍 Récupération produits pour submission:', submission.id);
      
      // Méthode 1: Récupérer les produits via product_details
      // Note: submission_id n'existe pas dans product_details, on récupère tous les product_details
      // et on filtre ensuite via raw_data->>submission_id dans les produits
      const { data: productDetails, error: productDetailsError } = await supabaseAdmin
        .from('product_details')
        .select(`
          *,
          product:products(*)
        `);

      console.log('📦 Produits via product_details:', productDetails?.length || 0, productDetailsError);

      if (productDetails && !productDetailsError) {
        productDetails.forEach((detail: any) => {
          if (detail.product && detail.product.name !== 'ff') {
            // Vérifier si le produit est lié à cette submission via raw_data
            const rawDataSubmissionId = detail.product.raw_data?.submission_id;
            const isLinkedToSubmission = rawDataSubmissionId === submission.id || 
                                       rawDataSubmissionId === submission.id.toString();
            
            if (isLinkedToSubmission) {
              // Exclure les produits de démonstration "ff"
              products.push({
                ...detail.product,
                product_details: {
                  title: detail.title || detail.product.name,
                  sku: detail.sku,
                  description: detail.description,
                  price_greez_ttc: detail.price_greez_ttc,
                  quantity_uvc: detail.quantity_uvc,
                },
              });
            }
          }
        });
      }

      // Méthode 2: Récupérer directement les produits via raw_data->>submission_id (plus efficace)
      const { data: productsByRawData, error: productsRawDataError } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('user_id', invitation.admin_id)
        .filter('raw_data->>submission_id', 'eq', submission.id)
        .neq('name', 'ff') // Exclure les produits de démonstration
        .order('created_at', { ascending: false });

      console.log('📦 Produits via raw_data->>submission_id:', productsByRawData?.length || 0, productsRawDataError);

      if (productsByRawData && !productsRawDataError) {
        productsByRawData.forEach((product: any) => {
          // Vérifier si le produit n'est pas déjà dans la liste
          const alreadyInList = products.find(p => p.id === product.id);
          
          if (!alreadyInList) {
            // Récupérer les product_details si disponibles
            const productDetail = productDetails?.find((pd: any) => pd.product_id === product.id);
            products.push({
              ...product,
              product_details: productDetail ? {
                title: productDetail.title || product.name,
                sku: productDetail.sku,
                description: productDetail.description,
                price_greez_ttc: productDetail.price_greez_ttc,
                quantity_uvc: productDetail.quantity_uvc,
              } : {
                title: product.name,
                sku: product.raw_data?.sku || `SKU-${product.id.substring(0, 8).toUpperCase()}`,
                description: product.raw_data?.description || product.generated_content?.long_description || '',
                price_greez_ttc: product.raw_data?.price_ttc || product.price,
                quantity_uvc: product.raw_data?.stock_quantity || 1,
              },
            });
          }
        });
      }


      const productsError = productDetailsError || productsRawDataError;
      
      if (productsError) {
        console.error('❌ Erreur récupération produits:', productsError);
        return NextResponse.json(
          { success: false, error: 'Erreur lors de la récupération des produits' },
          { status: 500 }
        );
      }

      console.log('✅ Produits récupérés:', products.length);
    } else {
      // Pas de submission, retourner une liste vide
      products = [];
      console.log('⚠️ Pas de submission trouvée');
    }

    return NextResponse.json({
      success: true,
      data: products || [],
    });

  } catch (error: any) {
    console.error('Erreur récupération produits:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erreur lors de la récupération',
      },
      { status: 500 }
    );
  }
}

