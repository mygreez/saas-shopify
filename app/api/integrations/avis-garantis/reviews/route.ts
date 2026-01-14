// ============================================
// API: Récupérer les avis depuis Avis Garantis
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('product_id');

    // Récupérer la clé API
    const { data: connection } = await supabaseAdmin
      .from('avis_garantis_connections')
      .select('api_key')
      .eq('user_id', userId)
      .single();

    if (!connection) {
      return NextResponse.json(
        { error: 'Connexion Avis Garantis non configurée' },
        { status: 400 }
      );
    }

    // Appeler l'API de la Société des Avis Garantis
    // Note: Cette URL doit être remplacée par la vraie API de la Société des Avis Garantis
    // Pour l'instant, on retourne des données d'exemple
    const reviews = [
      {
        id: '1',
        author: 'Marie D.',
        rating: 5,
        comment: 'Excellent produit, très satisfaite de mon achat !',
        date: new Date().toISOString(),
        product_id: productId || undefined,
      },
      {
        id: '2',
        author: 'Jean P.',
        rating: 4,
        comment: 'Très bon produit, je recommande.',
        date: new Date(Date.now() - 86400000).toISOString(),
        product_id: productId || undefined,
      },
    ];

    // TODO: Remplacer par un vrai appel API à la Société des Avis Garantis
    // const response = await fetch(`https://api.societe-des-avis-garantis.fr/reviews?product_id=${productId}`, {
    //   headers: {
    //     'Authorization': `Bearer ${connection.api_key}`,
    //   },
    // });
    // const data = await response.json();

    return NextResponse.json({
      success: true,
      reviews: reviews,
    });
  } catch (error: any) {
    console.error('Erreur récupération avis:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des avis' },
      { status: 500 }
    );
  }
}

