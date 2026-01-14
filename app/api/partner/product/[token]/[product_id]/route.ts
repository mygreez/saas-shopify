// ============================================
// API: Récupérer un produit spécifique d'un partenaire
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; product_id: string }> | { token: string; product_id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const { token, product_id } = resolvedParams;

    if (!token || !product_id) {
      return NextResponse.json(
        { success: false, error: 'Token ou ID produit manquant' },
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

    if (submissionError || !submission) {
      return NextResponse.json(
        { success: false, error: 'Soumission non trouvée' },
        { status: 404 }
      );
    }

    // Récupérer le produit via product_details
    const { data: productDetail, error: productDetailError } = await supabaseAdmin
      .from('product_details')
      .select(`
        *,
        product:products(*)
      `)
      .eq('submission_id', submission.id)
      .eq('product_id', product_id)
      .single();

    let product: any = null;

    if (productDetail && !productDetailError && productDetail.product) {
      product = {
        ...productDetail.product,
        product_details: {
          title: productDetail.title,
          sku: productDetail.sku,
          description: productDetail.description,
          price_greez_ttc: productDetail.price_greez_ttc,
          quantity_uvc: productDetail.quantity_uvc,
        },
      };
    } else {
      // Fallback: récupérer via raw_data
      const { data: productByRawData, error: productRawDataError } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', product_id)
        .eq('user_id', invitation.admin_id)
        .filter('raw_data->>submission_id', 'eq', submission.id)
        .single();

      if (productByRawData && !productRawDataError) {
        product = productByRawData;
      }
    }

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Produit non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });

  } catch (error: any) {
    console.error('Erreur récupération produit:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erreur lors de la récupération',
      },
      { status: 500 }
    );
  }
}

