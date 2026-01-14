// ============================================
// API: Liste des produits (filtré par rôle)
// ============================================
// Admin : voit tous les produits de sa boutique
// Partenaire : voit uniquement ses propres produits

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getUserId } from '@/lib/auth';
import { formatApiError } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Récupérer le rôle de l'utilisateur
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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // Filtre optionnel par statut

    let query = supabaseAdmin
      .from('products')
      .select(`
        *,
        partner:users!products_partner_id_fkey(id, email, name)
      `);

    // Filtrage selon le rôle
    if (user.role === 'admin') {
      // Admin voit tous les produits de sa boutique
      query = query.eq('user_id', userId);
    } else if (user.role === 'partner') {
      // Partenaire voit uniquement ses propres produits
      query = query.eq('partner_id', userId);
    } else {
      return NextResponse.json(
        { error: 'Rôle invalide' },
        { status: 403 }
      );
    }

    // Filtre par statut si fourni
    if (status) {
      query = query.eq('status', status);
    }

    // Tri par date de création (plus récent en premier)
    query = query.order('created_at', { ascending: false });

    const { data: products, error } = await query;

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
      filters: {
        status: status || 'all',
        role: user.role,
      },
    });

  } catch (error: any) {
    console.error('Erreur liste produits:', error);
    const errorResponse = formatApiError(error, 'GET /api/products');
    return NextResponse.json(
      errorResponse,
      { status: 500 }
    );
  }
}


