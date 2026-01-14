// ============================================
// API: Publish Product to Shopify
// ============================================
// POST /api/shopify/publish/:productId

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { ShopifyPublisher } from '@/lib/services/shopify/publisher';
import { getUserId } from '@/lib/auth';
import { PublishResponse } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { productId } = params;
    const body = await request.json();
    const { storeId } = body;

    if (!storeId) {
      return NextResponse.json({ error: 'storeId manquant' }, { status: 400 });
    }

    // Vérifier que le produit existe et appartient à l'utilisateur
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        store: {
          ownerId: userId,
        },
      },
      include: {
        variants: true,
        images: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Produit non trouvé ou accès refusé' }, { status: 404 });
    }

    // Vérifier que le produit est prêt
    if (product.status !== 'READY' && product.status !== 'DRAFT') {
      return NextResponse.json(
        {
          error: `Le produit n'est pas prêt à être publié`,
          currentStatus: product.status,
        },
        { status: 400 }
      );
    }

    // Vérifier qu'il y a au moins une variante
    if (product.variants.length === 0) {
      return NextResponse.json(
        { error: 'Le produit doit avoir au moins une variante' },
        { status: 400 }
      );
    }

    // Créer le client Shopify
    const shopifyClient = await ShopifyPublisher.createClientFromStore(storeId);

    // Publier le produit
    const result = await ShopifyPublisher.publishProduct(productId, shopifyClient);

    const response: PublishResponse = {
      shopifyProductId: result.shopifyProductId,
      status: 'PUBLISHED',
      productUrl: result.productUrl,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Erreur publication Shopify:', error);

    // Gérer les erreurs spécifiques Shopify
    if (error.message?.includes('Shopify API Error')) {
      return NextResponse.json(
        {
          error: 'Erreur API Shopify',
          details: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}




