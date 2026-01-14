// ============================================
// API: Récupérer les produits d'une soumission (Admin)
// ============================================
// Permet de récupérer tous les produits associés à une soumission

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getUserId } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est admin
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accès refusé : Admin requis' },
        { status: 403 }
      );
    }

    // Gérer les params qui peuvent être une Promise dans Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params;
    const { id: submission_id } = resolvedParams;

    if (!submission_id) {
      return NextResponse.json(
        { error: 'ID de soumission manquant' },
        { status: 400 }
      );
    }

    // Vérifier que la soumission existe et appartient à cet admin
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('partner_submissions')
      .select(`
        id,
        brand:brands!inner(name)
      `)
      .eq('id', submission_id)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: 'Soumission non trouvée' },
        { status: 404 }
      );
    }

    // Récupérer les product_details qui ont le même brand_name
    const { data: productDetails, error: detailsError } = await supabaseAdmin
      .from('product_details')
      .select(`
        *,
        product:products(
          id,
          name,
          category,
          price,
          status,
          created_at
        )
      `)
      .eq('brand_name', submission.brand.name);

    if (detailsError) {
      console.error('Erreur récupération produits:', detailsError);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des produits' },
        { status: 500 }
      );
    }

    // Formater les produits
    const products = (productDetails || []).map((detail: any) => ({
      id: detail.product?.id || detail.product_id,
      name: detail.product?.name || detail.title || 'Produit sans nom',
      category: detail.product?.category || detail.product_type,
      price: detail.product?.price || detail.price_greez_ttc,
      status: detail.product?.status || 'draft',
      created_at: detail.product?.created_at || new Date().toISOString(),
      product_details: {
        title: detail.title || detail.product?.name || 'Produit sans nom',
        sku: detail.sku,
        description: detail.description,
        price_greez_ttc: detail.price_greez_ttc,
        quantity_uvc: detail.quantity_uvc,
      },
    }));

    return NextResponse.json({
      success: true,
      data: products,
    });

  } catch (error: any) {
    console.error('Erreur récupération produits:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
}

