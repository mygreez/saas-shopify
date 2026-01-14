// ============================================
// SERVICE: Excel Mapper
// ============================================
// Map les colonnes Excel vers le format produit/variante

import { ExcelRow, MappedProduct, MappedVariant } from '@/lib/types';

// Mapping des colonnes Shopify standards
const SHOPIFY_COLUMN_MAPPING: Record<string, string[]> = {
  title: ['title', 'name', 'product name', 'nom', 'produit', 'titre'],
  description: ['description', 'desc', 'body', 'body html', 'description html'],
  vendor: ['vendor', 'brand', 'marque', 'fabricant'],
  option1Name: ['option1 name', 'option 1 name', 'variante 1 nom', 'size', 'taille'],
  option1Value: ['option1 value', 'option 1 value', 'variante 1 valeur', 'size value'],
  option2Name: ['option2 name', 'option 2 name', 'variante 2 nom', 'color', 'couleur'],
  option2Value: ['option2 value', 'option 2 value', 'variante 2 valeur', 'color value'],
  price: ['price', 'prix', 'variant price', 'prix variante'],
  sku: ['sku', 'reference', 'référence', 'variant sku'],
  inventoryQty: ['inventory', 'stock', 'quantity', 'qty', 'variant inventory qty'],
};

export class ExcelMapper {
  /**
   * Map les lignes Excel vers des produits avec variantes
   * Groupement par titre de produit
   */
  static mapToProducts(rows: ExcelRow[]): MappedProduct[] {
    const productMap = new Map<string, MappedProduct>();

    rows.forEach((row, index) => {
      const title = this.getColumnValue(row, 'title');
      if (!title) {
        console.warn(`Ligne ${index + 1}: Titre manquant, ignorée`);
        return;
      }

      // Créer ou récupérer le produit
      if (!productMap.has(title)) {
        productMap.set(title, {
          title: String(title),
          description: this.getColumnValue(row, 'description'),
          vendor: this.getColumnValue(row, 'vendor'),
          variants: [],
        });
      }

      const product = productMap.get(title)!;

      // Créer la variante
      const variant: MappedVariant = {
        option1Name: this.getColumnValue(row, 'option1Name'),
        option1Value: this.getColumnValue(row, 'option1Value'),
        option2Name: this.getColumnValue(row, 'option2Name'),
        option2Value: this.getColumnValue(row, 'option2Value'),
        price: this.parsePrice(this.getColumnValue(row, 'price')),
        sku: this.getColumnValue(row, 'sku'),
        inventoryQty: this.parseInt(this.getColumnValue(row, 'inventoryQty'), 0),
      };

      product.variants.push(variant);
    });

    return Array.from(productMap.values());
  }

  /**
   * Trouve la valeur d'une colonne en cherchant dans les mappings
   */
  private static getColumnValue(row: ExcelRow, targetKey: string): string | undefined {
    const possibleKeys = SHOPIFY_COLUMN_MAPPING[targetKey] || [targetKey];

    for (const key of possibleKeys) {
      // Chercher exact
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
        return String(row[key]).trim();
      }

      // Chercher avec variations (case-insensitive)
      const foundKey = Object.keys(row).find(
        (k) => k.toLowerCase().trim() === key.toLowerCase().trim()
      );
      if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && row[foundKey] !== '') {
        return String(row[foundKey]).trim();
      }
    }

    return undefined;
  }

  /**
   * Parse un prix (supporte différents formats)
   */
  private static parsePrice(value: string | number | null | undefined): number {
    if (value === null || value === undefined) return 0;

    if (typeof value === 'number') return value;

    // Enlever les espaces et caractères non numériques (sauf point/virgule)
    const cleaned = String(value)
      .replace(/[^\d.,]/g, '')
      .replace(',', '.');

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Parse un entier
   */
  private static parseInt(value: string | number | null | undefined, defaultValue: number): number {
    if (value === null || value === undefined) return defaultValue;

    if (typeof value === 'number') return Math.floor(value);

    const parsed = parseInt(String(value), 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Détecte le mapping automatique des colonnes
   */
  static detectColumnMapping(columns: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};

    Object.keys(SHOPIFY_COLUMN_MAPPING).forEach((targetKey) => {
      const possibleKeys = SHOPIFY_COLUMN_MAPPING[targetKey];
      const foundColumn = columns.find((col) =>
        possibleKeys.some((key) => col.toLowerCase().includes(key.toLowerCase()))
      );

      if (foundColumn) {
        mapping[targetKey] = foundColumn;
      }
    });

    return mapping;
  }
}




