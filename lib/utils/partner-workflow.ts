// ============================================
// UTILITAIRES: Workflow Partenaire
// ============================================
// Utilitaires pour le workflow de revalorisation (Step 1 et Step 2)

/**
 * Valide les dimensions d'une image
 * @param file - Le fichier image
 * @param expectedWidth - Largeur attendue
 * @param expectedHeight - Hauteur attendue
 * @param tolerance - Tolérance en pixels (défaut: 10)
 */
export async function validateImageDimensions(
  file: File,
  expectedWidth: number,
  expectedHeight: number,
  tolerance: number = 10
): Promise<{ valid: boolean; error?: string; width?: number; height?: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const width = img.width;
      const height = img.height;

      const widthValid = Math.abs(width - expectedWidth) <= tolerance;
      const heightValid = Math.abs(height - expectedHeight) <= tolerance;

      if (!widthValid || !heightValid) {
        resolve({
          valid: false,
          error: `Dimensions incorrectes. Attendu: ${expectedWidth}x${expectedHeight}px, Reçu: ${width}x${height}px`,
          width,
          height,
        });
      } else {
        resolve({
          valid: true,
          width,
          height,
        });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        valid: false,
        error: 'Impossible de charger l\'image',
      });
    };

    img.src = url;
  });
}

/**
 * Valide le format PNG pour le logo
 */
export function validatePNGFormat(file: File): { valid: boolean; error?: string } {
  if (file.type !== 'image/png') {
    return {
      valid: false,
      error: 'Le logo doit être au format PNG',
    };
  }
  return { valid: true };
}

/**
 * Calcule la commission Greez (57% du prix TTC remisé)
 */
export function calculateGreezCommission(priceGreezTTC: number): number {
  return Math.round((priceGreezTTC * 0.57) * 100) / 100;
}

/**
 * Calcule la facturation marque (43% du prix TTC remisé - 100% - 57%)
 */
export function calculateBrandBilling(priceGreezTTC: number): number {
  return Math.round((priceGreezTTC * 0.43) * 100) / 100;
}

/**
 * Calcule automatiquement les prix et commissions à partir des prix de base
 */
export function calculatePricing(
  priceStandardHT: number,
  priceStandardTTC: number,
  priceGreezHT: number,
  priceGreezTTC: number
): {
  commissionGreezTTC: number;
  facturationMarqueTTC: number;
} {
  const commissionGreezTTC = calculateGreezCommission(priceGreezTTC);
  const facturationMarqueTTC = calculateBrandBilling(priceGreezTTC);

  return {
    commissionGreezTTC,
    facturationMarqueTTC,
  };
}

/**
 * Valide un lien Wetransfert
 */
export function validateWetransferLink(link: string): { valid: boolean; error?: string } {
  if (!link.trim()) {
    return {
      valid: false,
      error: 'Le lien Wetransfert est requis',
    };
  }

  // Vérifier que c'est une URL valide
  try {
    const url = new URL(link);
    if (!url.protocol.startsWith('http')) {
      return {
        valid: false,
        error: 'Le lien doit commencer par http:// ou https://',
      };
    }
  } catch {
    return {
      valid: false,
      error: 'Format de lien invalide',
    };
  }

  return { valid: true };
}

/**
 * Valide une couleur hexadécimale
 */
export function validateHexColor(color: string): { valid: boolean; error?: string } {
  if (!color) {
    return { valid: true }; // Optionnel
  }

  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (!hexPattern.test(color)) {
    return {
      valid: false,
      error: 'Format de couleur invalide. Utilisez le format #FFFFFF ou #FFF',
    };
  }

  return { valid: true };
}

/**
 * Formate un nombre en prix avec 2 décimales
 */
export function formatPrice(price: number): string {
  return price.toFixed(2);
}

/**
 * Parse un nombre depuis une chaîne (gère les virgules et points)
 */
export function parsePrice(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return value;
  }
  if (!value) {
    return 0;
  }
  const str = String(value).replace(/,/g, '.').trim();
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse un entier depuis une chaîne
 */
export function parseIntSafe(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return Math.floor(value);
  }
  if (!value) {
    return 0;
  }
  const str = String(value).trim();
  const parsed = parseInt(str, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Valide un email
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email.trim()) {
    return {
      valid: false,
      error: 'L\'email est requis',
    };
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return {
      valid: false,
      error: 'Format d\'email invalide',
    };
  }

  return { valid: true };
}


