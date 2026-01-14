// ============================================
// API: Soumettre un produit à validation
// ============================================
// Permet à un partenaire de soumettre un produit en draft → pending

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getUserId } from '@/lib/auth';

const SubmitProductSchema = z.object({
  product_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { product_id } = SubmitProductSchema.parse(body);

    // Récupérer le produit
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier que le produit est en draft
    if (product.status !== 'draft') {
      return NextResponse.json(
        { error: 'Le produit doit être en brouillon pour être soumis' },
        { status: 400 }
      );
    }

    // Vérifier les permissions
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Si admin, peut soumettre n'importe quel produit
    // Si partenaire, peut seulement soumettre ses propres produits
    if (user.role === 'partner' && product.partner_id !== userId) {
      return NextResponse.json(
        { error: 'Accès refusé : Vous ne pouvez soumettre que vos propres produits' },
        { status: 403 }
      );
    }

    // Mettre à jour le statut
    const { data: updatedProduct, error: updateError } = await supabaseAdmin
      .from('products')
      .update({ 
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', product_id)
      .select()
      .single();

    if (updateError) {
      console.error('Erreur soumission produit:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la soumission' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedProduct,
      message: 'Produit soumis à validation avec succès',
    });

  } catch (error: any) {
    console.error('Erreur soumission produit:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erreur lors de la soumission' },
      { status: 500 }
    );
  }
}




