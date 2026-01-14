// ============================================
// CLIENT SHOPIFY API
// ============================================

import axios, { AxiosInstance } from 'axios';
import { ShopifyProduct, ShopifyCollection } from '@/types';

export class ShopifyClient {
  private client: AxiosInstance;
  private shopDomain: string;
  private accessToken: string;

  constructor(shopDomain: string, accessToken: string) {
    this.shopDomain = shopDomain;
    this.accessToken = accessToken;
    
    this.client = axios.create({
      baseURL: `https://${shopDomain}/admin/api/2024-01`,
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Récupère la liste des produits
   */
  async getProducts(limit = 50, page = 1): Promise<ShopifyProduct[]> {
    const response = await this.client.get('/products.json', {
      params: {
        limit,
        page,
      },
    });
    return response.data.products;
  }

  /**
   * Récupère un produit par ID
   */
  async getProduct(productId: string): Promise<ShopifyProduct> {
    const response = await this.client.get(`/products/${productId}.json`);
    return response.data.product;
  }

  /**
   * Crée un produit (draft par défaut)
   */
  async createProduct(productData: Partial<ShopifyProduct>): Promise<ShopifyProduct> {
    const product = {
      ...productData,
      status: 'draft', // Toujours créer en draft
    };

    const response = await this.client.post('/products.json', {
      product,
    });
    return response.data.product;
  }

  /**
   * Met à jour un produit
   */
  async updateProduct(productId: string, productData: Partial<ShopifyProduct>): Promise<ShopifyProduct> {
    const response = await this.client.put(`/products/${productId}.json`, {
      product: productData,
    });
    return response.data.product;
  }

  /**
   * Publie un produit (change status de draft à active)
   */
  async publishProduct(productId: string): Promise<ShopifyProduct> {
    return this.updateProduct(productId, { status: 'active' });
  }

  /**
   * Récupère les collections
   */
  async getCollections(): Promise<ShopifyCollection[]> {
    const response = await this.client.get('/collections.json');
    return response.data.collections;
  }

  /**
   * Récupère les vendors uniques
   */
  async getVendors(): Promise<string[]> {
    const response = await this.client.get('/products.json', {
      params: {
        limit: 250,
        fields: 'vendor',
      },
    });
    
    const vendors = new Set<string>();
    response.data.products.forEach((product: ShopifyProduct) => {
      if (product.vendor) {
        vendors.add(product.vendor);
      }
    });
    
    return Array.from(vendors);
  }

  /**
   * Récupère les tags uniques
   */
  async getTags(): Promise<string[]> {
    const response = await this.client.get('/products.json', {
      params: {
        limit: 250,
        fields: 'tags',
      },
    });
    
    const tags = new Set<string>();
    response.data.products.forEach((product: ShopifyProduct) => {
      if (product.tags) {
        product.tags.split(',').forEach((tag: string) => {
          tags.add(tag.trim());
        });
      }
    });
    
    return Array.from(tags);
  }
}

