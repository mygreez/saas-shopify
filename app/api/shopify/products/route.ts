// ============================================
// API: Liste des produits Shopify
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { decryptToken } from '@/lib/encryption';
import { ShopifyClient } from '@/lib/shopify/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shopDomain = searchParams.get('shop');

    if (!shopDomain) {
      return NextResponse.json(
        { error: 'Paramètre "shop" manquant' },
        { status: 400 }
      );
    }

    // Récupération user_id depuis session
    const { getUserId } = await import('@/lib/auth');
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Récupération de la connexion Shopify
    const { data: connection, error: connError } = await supabaseAdmin
      .from('shopify_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('shop_domain', shopDomain)
      .eq('is_active', true)
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { error: 'Connexion Shopify non trouvée' },
        { status: 404 }
      );
    }

    // Déchiffrement du token
    const accessToken = decryptToken(connection.access_token_encrypted);

    // Récupération des produits depuis Shopify
    const client = new ShopifyClient(shopDomain, accessToken);
    const products = await client.getProducts();

    return NextResponse.json({
      success: true,
      data: products,
    });

  } catch (error: any) {
    console.error('Erreur récupération produits:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des produits' },
      { status: 500 }
    );
  }
}

