// ============================================
// SERVICE: Shopify Publisher
// ============================================
// Publie un produit sur Shopify

import { prisma } from '@/lib/prisma/client';
import { ShopifyClient } from './client';
import { ShopifyTransformer } from './transformer';

export class ShopifyPublisher {
  /**
   * Publie un produit sur Shopify
   */
  static async publishProduct(
    productId: string,
    shopifyClient: ShopifyClient
  ): Promise<{ shopifyProductId: string; productUrl: string }> {
    // Récupérer le produit avec ses relations
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: true,
        images: true,
        store: true,
      },
    });

    if (!product) {
      throw new Error(`Produit non trouvé: ${productId}`);
    }

    // Vérifier que le produit est prêt
    if (product.status !== 'READY' && product.status !== 'DRAFT') {
      throw new Error(`Le produit n'est pas prêt à être publié. Status: ${product.status}`);
    }

    // Récupérer l'ID de l'emplacement de stock par défaut
    let defaultLocationId: string | undefined;
    try {
      defaultLocationId = await shopifyClient.getDefaultLocationId();
    } catch (error) {
      console.warn('Impossible de récupérer l\'emplacement de stock par défaut:', error);
    }

    // Transformer le produit
    const shopifyInput = ShopifyTransformer.transformProduct(product, defaultLocationId);

    // Créer le produit sur Shopify
    const result = await shopifyClient.createProduct(shopifyInput);

    // Extraire l'ID Shopify (format: gid://shopify/Product/123456)
    const shopifyProductId = result.product.id;

    // Mettre à jour le produit en base
    await prisma.product.update({
      where: { id: productId },
      data: {
        shopifyProductId,
        status: 'PUBLISHED',
      },
    });

    // Construire l'URL du produit
    const productUrl = `https://${product.store.shopifyShop}/products/${result.product.handle}`;

    return {
      shopifyProductId,
      productUrl,
    };
  }

  /**
   * Créer un client Shopify depuis un storeId
   */
  static async createClientFromStore(storeId: string): Promise<ShopifyClient> {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new Error(`Store non trouvé: ${storeId}`);
    }

    return new ShopifyClient({
      shop: store.shopifyShop,
      accessToken: store.accessToken,
    });
  }
}




