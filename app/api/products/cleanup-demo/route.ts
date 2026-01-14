// ============================================
// API: Supprimer les produits de démonstration
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getUserId } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
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

    // Supprimer les produits de démonstration avec name='ff' et price=12
    const { data: deletedProducts, error: deleteError } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('name', 'ff')
      .eq('price', 12)
      .eq('user_id', userId)
      .select();

    if (deleteError) {
      console.error('Erreur suppression produits demo:', deleteError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Erreur lors de la suppression',
          details: process.env.NODE_ENV === 'development' ? deleteError.message : undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${deletedProducts?.length || 0} produit(s) de démonstration supprimé(s)`,
      deletedCount: deletedProducts?.length || 0,
    });

  } catch (error: any) {
    console.error('Erreur suppression produits demo:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error?.message || 'Erreur lors de la suppression',
      },
      { status: 500 }
    );
  }
}

