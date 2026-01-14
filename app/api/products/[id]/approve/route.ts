// ============================================
// API: Approuver un produit (Admin)
// ============================================
// Change le statut pending → approved

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getUserId } from '@/lib/auth';

const ApproveProductSchema = z.object({
  comment: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId();
    const productId = params.id;
    
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

    // Récupérer le produit
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier que le produit est en pending
    if (product.status !== 'pending') {
      return NextResponse.json(
        { error: 'Le produit doit être en attente de validation' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { comment } = ApproveProductSchema.parse(body);

    // Mettre à jour le statut
    const { data: updatedProduct, error: updateError } = await supabaseAdmin
      .from('products')
      .update({ 
        status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .select()
      .single();

    if (updateError) {
      console.error('Erreur approbation produit:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de l\'approbation' },
        { status: 500 }
      );
    }

    // Enregistrer l'action dans l'historique
    await supabaseAdmin
      .from('product_approvals')
      .insert({
        product_id: productId,
        admin_id: userId,
        action: 'approved',
        comment: comment || null,
      });

    return NextResponse.json({
      success: true,
      data: updatedProduct,
      message: 'Produit approuvé avec succès',
    });

  } catch (error: any) {
    console.error('Erreur approbation produit:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erreur lors de l\'approbation' },
      { status: 500 }
    );
  }
}




