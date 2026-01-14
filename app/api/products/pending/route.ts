// ============================================
// API: Liste des produits en attente (Admin)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
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

    // Récupérer tous les produits en attente pour cet admin
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select(`
        *,
        partner:users!products_partner_id_fkey(id, email, name)
      `)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur récupération produits:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: products || [],
      count: products?.length || 0,
    });

  } catch (error: any) {
    console.error('Erreur liste produits pending:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
}




