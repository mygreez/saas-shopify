// ============================================
// SERVICE: Shopify Client (GraphQL Admin API)
// ============================================

import { createAdminApiClient } from '@shopify/admin-api-client';

export interface ShopifyClientConfig {
  shop: string;
  accessToken: string;
  apiVersion?: string;
}

export class ShopifyClient {
  private client: ReturnType<typeof createAdminApiClient>;
  private shop: string;

  constructor(config: ShopifyClientConfig) {
    this.shop = config.shop;
    this.client = createAdminApiClient({
      storeDomain: config.shop,
      apiVersion: config.apiVersion || '2024-01',
      accessToken: config.accessToken,
    });
  }

  /**
   * Exécute une requête GraphQL
   */
  async query<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
    const response = await this.client.request(query, { variables });

    if (response.errors && response.errors.length > 0) {
      throw new Error(`Shopify API Error: ${response.errors.map((e: any) => e.message).join(', ')}`);
    }

    return response.data as T;
  }

  /**
   * Créer un produit sur Shopify
   */
  async createProduct(input: {
    title: string;
    descriptionHtml?: string;
    vendor?: string;
    status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
    variants: Array<{
      price: string;
      sku?: string;
      inventoryQuantities?: Array<{ availableQuantity: number; locationId: string }>;
      selectedOptions?: Array<{ name: string; value: string }>;
    }>;
    images: Array<{
      src: string;
      altText?: string;
    }>;
  }): Promise<{ product: { id: string; handle: string } }> {
    const mutation = `
      mutation productCreate($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            handle
            title
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        title: input.title,
        descriptionHtml: input.descriptionHtml,
        vendor: input.vendor,
        status: input.status || 'DRAFT',
        variants: input.variants.map((v) => ({
          price: v.price,
          sku: v.sku,
          inventoryQuantities: v.inventoryQuantities,
          selectedOptions: v.selectedOptions,
        })),
        images: input.images.map((img) => ({
          src: img.src,
          altText: img.altText,
        })),
      },
    };

    const response = await this.query<{
      productCreate: {
        product: { id: string; handle: string; title: string } | null;
        userErrors: Array<{ field: string[]; message: string }>;
      };
    }>(mutation, variables);

    if (response.productCreate.userErrors.length > 0) {
      const errors = response.productCreate.userErrors
        .map((e) => `${e.field.join('.')}: ${e.message}`)
        .join(', ');
      throw new Error(`Erreur création produit Shopify: ${errors}`);
    }

    if (!response.productCreate.product) {
      throw new Error('Erreur création produit Shopify: produit non créé');
    }

    return {
      product: {
        id: response.productCreate.product.id,
        handle: response.productCreate.product.handle,
      },
    };
  }

  /**
   * Récupère l'ID de l'emplacement de stock par défaut
   */
  async getDefaultLocationId(): Promise<string> {
    const query = `
      query {
        locations(first: 1) {
          edges {
            node {
              id
            }
          }
        }
      }
    `;

    const response = await this.query<{
      locations: {
        edges: Array<{ node: { id: string } }>;
      };
    }>(query);

    if (response.locations.edges.length === 0) {
      throw new Error('Aucun emplacement de stock trouvé dans Shopify');
    }

    return response.locations.edges[0].node.id;
  }
}




