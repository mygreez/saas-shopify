// ============================================
// SERVICE: Image Processor
// ============================================
// Optimisation et redimensionnement d'images (optionnel)

export class ImageProcessor {
  /**
   * Valide le type de fichier
   */
  static isValidImageType(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    return validTypes.includes(file.type);
  }

  /**
   * Valide la taille du fichier (max 10MB par défaut)
   */
  static isValidSize(file: File, maxSizeMB: number = 10): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }

  /**
   * Valide une image
   */
  static validateImage(file: File): { valid: boolean; error?: string } {
    if (!this.isValidImageType(file)) {
      return {
        valid: false,
        error: `Type de fichier non supporté: ${file.type}. Types acceptés: JPEG, PNG, WebP, GIF`,
      };
    }

    if (!this.isValidSize(file)) {
      return {
        valid: false,
        error: `Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum: 10MB`,
      };
    }

    return { valid: true };
  }

  /**
   * Génère un nom de fichier unique
   */
  static generateFileName(originalName: string): string {
    const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}.${extension}`;
  }
}




