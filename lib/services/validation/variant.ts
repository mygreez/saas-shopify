// ============================================
// SERVICE: Variant Validator
// ============================================
// Validation spécifique aux variantes

import { MappedVariant, ValidationError } from '@/lib/types';

export class VariantValidator {
  /**
   * Valide une variante individuelle
   */
  static validate(variant: MappedVariant): ValidationError[] {
    const errors: ValidationError[] = [];

    // Prix obligatoire
    if (variant.price === undefined || variant.price === null) {
      errors.push({
        field: 'price',
        message: 'Le prix est obligatoire',
      });
    } else if (variant.price < 0) {
      errors.push({
        field: 'price',
        message: 'Le prix doit être positif',
      });
    }

    // Si option1Name est défini, option1Value doit l'être aussi
    if (variant.option1Name && !variant.option1Value) {
      errors.push({
        field: 'option1Value',
        message: 'option1Value est requis si option1Name est défini',
      });
    }

    // Si option2Name est défini, option2Value doit l'être aussi
    if (variant.option2Name && !variant.option2Value) {
      errors.push({
        field: 'option2Value',
        message: 'option2Value est requis si option2Name est défini',
      });
    }

    // Inventory Qty doit être positif
    if (variant.inventoryQty !== undefined && variant.inventoryQty < 0) {
      errors.push({
        field: 'inventoryQty',
        message: 'La quantité en stock doit être positive',
      });
    }

    return errors;
  }

  /**
   * Normalise une variante (valeurs par défaut, formatage)
   */
  static normalize(variant: MappedVariant): MappedVariant {
    return {
      ...variant,
      price: variant.price ?? 0,
      inventoryQty: variant.inventoryQty ?? 0,
      option1Name: variant.option1Name?.trim() || undefined,
      option1Value: variant.option1Value?.trim() || undefined,
      option2Name: variant.option2Name?.trim() || undefined,
      option2Value: variant.option2Value?.trim() || undefined,
      sku: variant.sku?.trim() || undefined,
    };
  }
}




