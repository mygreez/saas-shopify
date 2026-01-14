// ============================================
// API: Récupérer et mettre à jour un produit
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/db/supabase';

// GET: Récupérer un produit
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const productId = params.id;

    const { data: product, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('user_id', userId)
      .single();

    if (error || !product) {
      return NextResponse.json(
        { error: 'Produit non trouvé' },
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
      { error: 'Erreur lors de la récupération du produit' },
      { status: 500 }
    );
  }
}

// PUT: Mettre à jour un produit
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const productId = params.id;
    const body = await request.json();

    // Vérifier que le produit appartient à l'utilisateur
    const { data: existingProduct, error: checkError } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('user_id', userId)
      .single();

    if (checkError || !existingProduct) {
      return NextResponse.json(
        { error: 'Produit non trouvé ou accès refusé' },
        { status: 404 }
      );
    }

    // Préparer les données de mise à jour
    const updateData: any = {};

    if (body.name !== undefined) {
      updateData.name = body.name;
    }

    if (body.images !== undefined) {
      updateData.images = body.images;
    }

    if (body.variants !== undefined) {
      updateData.variants = body.variants;
    }

    // Mettre à jour la description dans generated_content
    if (body.description !== undefined) {
      const { data: currentProduct } = await supabaseAdmin
        .from('products')
        .select('generated_content')
        .eq('id', productId)
        .single();

      const currentContent = currentProduct?.generated_content || {};
      updateData.generated_content = {
        ...currentContent,
        short_description: body.description,
        long_description: body.description,
      };
    }

    // Mettre à jour le produit
    const { data: updatedProduct, error: updateError } = await supabaseAdmin
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Erreur mise à jour produit:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du produit' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Produit mis à jour avec succès',
      data: updatedProduct,
    });
  } catch (error: any) {
    console.error('Erreur mise à jour produit:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du produit' },
      { status: 500 }
    );
  }
}

