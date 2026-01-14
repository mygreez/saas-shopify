// ============================================
// API: Publication produit vers Shopify
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { decryptToken } from '@/lib/encryption';
import { ShopifyClient } from '@/lib/shopify/client';
import { Product, GeneratedContent } from '@/types';

export async function POST(
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

    // Récupération du produit
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('*, shopify_connections(*)')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier que le produit est approuvé
    if (product.status !== 'approved') {
      return NextResponse.json(
        { error: 'Le produit doit être approuvé avant publication' },
        { status: 400 }
      );
    }

    if (!product.shopify_connection_id) {
      return NextResponse.json(
        { error: 'Aucune connexion Shopify associée' },
        { status: 400 }
      );
    }

    const connection = (product as any).shopify_connections;
    if (!connection || !connection.is_active) {
      return NextResponse.json(
        { error: 'Connexion Shopify inactive' },
        { status: 400 }
      );
    }

    // Déchiffrement du token
    const accessToken = decryptToken(connection.access_token_encrypted);
    const client = new ShopifyClient(connection.shop_domain, accessToken);

    // Préparation des données pour Shopify
    const generatedContent = product.generated_content as GeneratedContent;
    
    const shopifyProduct = {
      title: generatedContent?.title || product.name,
      body_html: generatedContent?.long_description || '',
      vendor: product.category || '',
      product_type: product.category || '',
      tags: generatedContent?.tags?.join(',') || '',
      status: 'draft', // Toujours créer en draft
      variants: product.variants.map((variant: any) => ({
        price: variant.price,
        sku: variant.sku,
        inventory_quantity: variant.inventory_quantity || 0,
        option1: variant.option1,
        option2: variant.option2,
      })),
      images: product.images.map((url: string, index: number) => ({
        src: url,
        position: index + 1,
      })),
    };

    // Création du produit sur Shopify
    const shopifyProductCreated = await client.createProduct(shopifyProduct);

    // Mise à jour du produit en base
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update({
        shopify_product_id: shopifyProductCreated.id.toString(),
        status: 'published',
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    if (updateError) {
      console.error('Erreur mise à jour produit:', updateError);
      // Le produit est créé sur Shopify mais pas mis à jour en base
      // On retourne quand même le succès avec un warning
    }

    return NextResponse.json({
      success: true,
      data: {
        product_id: productId,
        shopify_product_id: shopifyProductCreated.id,
        shopify_url: `https://${connection.shop_domain}/admin/products/${shopifyProductCreated.id}`,
      },
    });

  } catch (error: any) {
    console.error('Erreur publication produit:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la publication du produit' },
      { status: 500 }
    );
  }
}

