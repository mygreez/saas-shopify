// ============================================
// API: Liste des partenaires (Admin)
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

    // Récupérer tous les partenaires actifs
    const { data: relationships, error } = await supabaseAdmin
      .from('partner_relationships')
      .select(`
        id,
        is_active,
        created_at,
        partner:users!partner_relationships_partner_id_fkey(
          id,
          email,
          name,
          created_at
        )
      `)
      .eq('admin_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur récupération partenaires:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération' },
        { status: 500 }
      );
    }

    // Compter les produits par partenaire
    const partnersWithStats = await Promise.all(
      (relationships || []).map(async (rel) => {
        // Supabase retourne toujours un tableau pour les relations
        const partner = Array.isArray(rel.partner) ? rel.partner[0] : rel.partner;
        const partnerId = partner?.id || rel.partner_id;
        const { count } = await supabaseAdmin
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('partner_id', partnerId);

        return {
          ...rel,
          products_count: count || 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: partnersWithStats,
    });

  } catch (error: any) {
    console.error('Erreur liste partenaires:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération' },
      { status: 500 }
    );
  }
}




