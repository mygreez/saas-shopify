// ============================================
// API: Récupère images 360° d'un produit
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;

    // Récupération user_id depuis session
    const { getUserId } = await import('@/lib/auth');
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Récupération du produit
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .select('images, name')
      .eq('id', productId)
      .eq('user_id', userId)
      .single();

    if (error || !product) {
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      );
    }

    // Pour le MVP, on utilise simplement les images du produit
    // Dans une version avancée, on pourrait avoir des images 360° dédiées
    return NextResponse.json({
      success: true,
      data: {
        product_id: productId,
        product_name: product.name,
        images: product.images || [],
        // Format pour viewer 360° simple
        viewer_type: 'rotating', // 'rotating' ou 'spherical'
      },
    });

  } catch (error: any) {
    console.error('Erreur récupération 360°:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des images 360°' },
      { status: 500 }
    );
  }
}

