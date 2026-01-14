// ============================================
// TYPES BACKEND - SaaS Shopify Product Manager
// ============================================

import { z } from 'zod';

// ============================================
// SCHEMAS VALIDATION
// ============================================

export const ImportProductSchema = z.object({
  file: z.instanceof(File),
  storeId: z.string().uuid(),
  partnerId: z.string().uuid().optional(),
});

export const UploadImageSchema = z.object({
  productId: z.string().uuid(),
  files: z.array(z.instanceof(File)).min(1),
});

export const PublishProductSchema = z.object({
  productId: z.string().uuid(),
  storeId: z.string().uuid(),
});

// ============================================
// TYPES EXCEL
// ============================================

export interface ExcelRow {
  [key: string]: string | number | null;
}

export interface MappedProduct {
  title: string;
  description?: string;
  vendor?: string;
  variants: MappedVariant[];
}

export interface MappedVariant {
  option1Name?: string;
  option1Value?: string;
  option2Name?: string;
  option2Value?: string;
  price: number;
  sku?: string;
  inventoryQty?: number;
}

// ============================================
// TYPES SHOPIFY
// ============================================

export interface ShopifyProductInput {
  title: string;
  descriptionHtml?: string;
  vendor?: string;
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  variants: ShopifyVariantInput[];
  images: ShopifyImageInput[];
}

export interface ShopifyVariantInput {
  price: string;
  sku?: string;
  inventoryQuantities?: Array<{
    availableQuantity: number;
    locationId: string;
  }>;
  selectedOptions?: Array<{
    name: string;
    value: string;
  }>;
}

export interface ShopifyImageInput {
  src: string;
  altText?: string;
  position?: number;
}

// ============================================
// TYPES VALIDATION
// ============================================

export interface ValidationError {
  field: string;
  message: string;
  row?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// ============================================
// TYPES RESPONSE
// ============================================

export interface ImportResponse {
  jobId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  productsCreated: number;
  errors: ValidationError[];
}

export interface UploadResponse {
  images: Array<{
    id: string;
    url: string;
    position: number;
  }>;
}

export interface PublishResponse {
  shopifyProductId: string;
  status: 'PUBLISHED';
  productUrl?: string;
}




