// ============================================
// API: Analyse de boutique Shopify
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/db/supabase';
import { decryptToken } from '@/lib/encryption';
import { ShopifyClient } from '@/lib/shopify/client';

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
    const shopDomain = searchParams.get('shop');

    if (!shopDomain) {
      return NextResponse.json(
        { error: 'Paramètre "shop" manquant' },
        { status: 400 }
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
    const client = new ShopifyClient(shopDomain, accessToken);

    // Récupération des données de la boutique
    const [products, collections, vendors, tags] = await Promise.all([
      client.getProducts(250),
      client.getCollections(),
      client.getVendors(),
      client.getTags(),
    ]);

    // Analyse des données
    const analysis = {
      shop_domain: shopDomain,
      total_products: products.length,
      total_collections: collections.length,
      vendors: vendors.length,
      unique_tags: tags.length,
      
      // Statistiques produits
      products_stats: {
        published: products.filter(p => p.status === 'active').length,
        draft: products.filter(p => p.status === 'draft').length,
        archived: products.filter(p => p.status === 'archived').length,
      },
      
      // Catégories les plus utilisées
      top_categories: getTopCategories(products),
      
      // Tags les plus utilisés
      top_tags: getTopTags(products, 10),
      
      // Vendors
      vendors_list: vendors,
      
      // Collections
      collections_list: collections.map(c => ({
        id: c.id,
        title: c.title,
        handle: c.handle,
      })),
      
      // Recommandations
      recommendations: generateRecommendations(products, collections),
    };

    return NextResponse.json({
      success: true,
      data: analysis,
    });

  } catch (error: any) {
    console.error('Erreur analyse boutique:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'analyse de la boutique' },
      { status: 500 }
    );
  }
}

/**
 * Récupère les catégories les plus utilisées
 */
function getTopCategories(products: any[]): Array<{ category: string; count: number }> {
  const categories: Record<string, number> = {};
  
  products.forEach(product => {
    const category = product.product_type || product.vendor || 'Non catégorisé';
    categories[category] = (categories[category] || 0) + 1;
  });

  return Object.entries(categories)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/**
 * Récupère les tags les plus utilisés
 */
function getTopTags(products: any[], limit: number = 10): Array<{ tag: string; count: number }> {
  const tags: Record<string, number> = {};
  
  products.forEach(product => {
    if (product.tags) {
      product.tags.split(',').forEach((tag: string) => {
        const trimmedTag = tag.trim();
        if (trimmedTag) {
          tags[trimmedTag] = (tags[trimmedTag] || 0) + 1;
        }
      });
    }
  });

  return Object.entries(tags)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Génère des recommandations basées sur l'analyse
 */
function generateRecommendations(products: any[], collections: any[]): string[] {
  const recommendations: string[] = [];

  // Vérifier les produits sans description
  const productsWithoutDescription = products.filter(p => !p.body_html || p.body_html.trim().length < 50);
  if (productsWithoutDescription.length > 0) {
    recommendations.push(`${productsWithoutDescription.length} produits sans description détaillée`);
  }

  // Vérifier les produits en draft
  const draftProducts = products.filter(p => p.status === 'draft');
  if (draftProducts.length > 0) {
    recommendations.push(`${draftProducts.length} produits en brouillon à publier`);
  }

  // Vérifier les collections vides
  if (collections.length === 0) {
    recommendations.push('Aucune collection créée - Créez des collections pour organiser vos produits');
  }

  // Vérifier les tags
  const productsWithoutTags = products.filter(p => !p.tags || p.tags.trim().length === 0);
  if (productsWithoutTags.length > 0) {
    recommendations.push(`${productsWithoutTags.length} produits sans tags - Ajoutez des tags pour améliorer la recherche`);
  }

  return recommendations;
}

