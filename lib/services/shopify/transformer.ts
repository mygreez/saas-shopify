// ============================================
// SERVICE: Shopify Transformer
// ============================================
// Transforme les données Prisma vers le format Shopify

import { ShopifyProductInput, ShopifyVariantInput, ShopifyImageInput } from '@/lib/types';
import { Product, Variant, Image } from '@prisma/client';

export class ShopifyTransformer {
  /**
   * Transforme un produit Prisma en format Shopify
   */
  static transformProduct(
    product: Product & {
      variants: Variant[];
      images: Image[];
    },
    defaultLocationId?: string
  ): ShopifyProductInput {
    return {
      title: product.title,
      descriptionHtml: product.description || undefined,
      vendor: product.vendor || undefined,
      status: this.mapStatus(product.status),
      variants: product.variants.map((variant) =>
        this.transformVariant(variant, defaultLocationId)
      ),
      images: product.images
        .sort((a, b) => a.position - b.position)
        .map((img) => this.transformImage(img)),
    };
  }

  /**
   * Transforme une variante Prisma en format Shopify
   */
  private static transformVariant(
    variant: Variant,
    defaultLocationId?: string
  ): ShopifyVariantInput {
    const selectedOptions: Array<{ name: string; value: string }> = [];

    if (variant.option1Name && variant.option1Value) {
      selectedOptions.push({
        name: variant.option1Name,
        value: variant.option1Value,
      });
    }

    if (variant.option2Name && variant.option2Value) {
      selectedOptions.push({
        name: variant.option2Name,
        value: variant.option2Value,
      });
    }

    const shopifyVariant: ShopifyVariantInput = {
      price: variant.price.toString(),
      sku: variant.sku || undefined,
      selectedOptions: selectedOptions.length > 0 ? selectedOptions : undefined,
    };

    // Ajouter l'inventaire si locationId fourni
    if (defaultLocationId && variant.inventoryQty > 0) {
      shopifyVariant.inventoryQuantities = [
        {
          availableQuantity: variant.inventoryQty,
          locationId: defaultLocationId,
        },
      ];
    }

    return shopifyVariant;
  }

  /**
   * Transforme une image Prisma en format Shopify
   */
  private static transformImage(image: Image): ShopifyImageInput {
    return {
      src: image.url,
      altText: image.alt || undefined,
      position: image.position,
    };
  }

  /**
   * Map le status Prisma vers Shopify
   */
  private static mapStatus(status: string): 'ACTIVE' | 'DRAFT' | 'ARCHIVED' {
    switch (status) {
      case 'PUBLISHED':
        return 'ACTIVE';
      case 'DRAFT':
      case 'READY':
        return 'DRAFT';
      case 'ARCHIVED':
        return 'ARCHIVED';
      default:
        return 'DRAFT';
    }
  }
}




