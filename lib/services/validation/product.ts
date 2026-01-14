// ============================================
// SERVICE: Product Validator
// ============================================
// Valide les produits et variantes avant création

import { MappedProduct, ValidationError, ValidationResult } from '@/lib/types';

export class ProductValidator {
  /**
   * Valide un produit complet
   */
  static validateProduct(product: MappedProduct, rowIndex: number): ValidationResult {
    const errors: ValidationError[] = [];

    // Vérifier le titre
    if (!product.title || product.title.trim().length === 0) {
      errors.push({
        field: 'title',
        message: 'Le titre est obligatoire',
        row: rowIndex,
      });
    }

    // Vérifier qu'il y a au moins une variante
    if (!product.variants || product.variants.length === 0) {
      errors.push({
        field: 'variants',
        message: 'Au moins une variante est requise',
        row: rowIndex,
      });
    }

    // Valider chaque variante
    product.variants?.forEach((variant, variantIndex) => {
      const variantErrors = this.validateVariant(variant, rowIndex, variantIndex);
      errors.push(...variantErrors);
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Valide une variante
   */
  static validateVariant(
    variant: any,
    rowIndex: number,
    variantIndex: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Prix obligatoire et valide
    if (variant.price === undefined || variant.price === null) {
      errors.push({
        field: 'variant.price',
        message: 'Le prix est obligatoire',
        row: rowIndex,
      });
    } else if (typeof variant.price !== 'number' || variant.price < 0) {
      errors.push({
        field: 'variant.price',
        message: 'Le prix doit être un nombre positif',
        row: rowIndex,
      });
    }

    // SKU unique (vérifié au niveau global, pas ici)
    // Mais on peut vérifier le format
    if (variant.sku && typeof variant.sku !== 'string') {
      errors.push({
        field: 'variant.sku',
        message: 'Le SKU doit être une chaîne de caractères',
        row: rowIndex,
      });
    }

    // Inventory Qty doit être un nombre positif
    if (
      variant.inventoryQty !== undefined &&
      (typeof variant.inventoryQty !== 'number' || variant.inventoryQty < 0)
    ) {
      errors.push({
        field: 'variant.inventoryQty',
        message: 'La quantité en stock doit être un nombre positif',
        row: rowIndex,
      });
    }

    return errors;
  }

  /**
   * Vérifie si un produit est complet (prêt à publier)
   */
  static isProductComplete(product: any): boolean {
    // Doit avoir un titre
    if (!product.title || product.title.trim().length === 0) return false;

    // Doit avoir au moins une variante
    if (!product.variants || product.variants.length === 0) return false;

    // Toutes les variantes doivent avoir un prix valide
    const allVariantsValid = product.variants.every(
      (v: any) => v.price !== undefined && v.price !== null && v.price >= 0
    );

    if (!allVariantsValid) return false;

    return true;
  }

  /**
   * Vérifie les SKU dupliqués dans une liste de produits
   */
  static checkDuplicateSKUs(products: MappedProduct[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const skuMap = new Map<string, { product: string; row: number }>();

    products.forEach((product, productIndex) => {
      product.variants?.forEach((variant, variantIndex) => {
        if (variant.sku) {
          const existing = skuMap.get(variant.sku);
          if (existing) {
            errors.push({
              field: 'variant.sku',
              message: `SKU dupliqué: ${variant.sku} (déjà utilisé par "${existing.product}")`,
              row: productIndex + 1,
            });
          } else {
            skuMap.set(variant.sku, {
              product: product.title,
              row: productIndex + 1,
            });
          }
        }
      });
    });

    return errors;
  }
}




