// ============================================
// Composant: Désactive le scroll de page
// ============================================

'use client';

import { useEffect } from 'react';

export default function DisablePageScroll() {
  useEffect(() => {
    // Sauvegarder les styles originaux
    const originalStyle = window.getComputedStyle(document.body).overflow;
    const originalHtmlStyle = window.getComputedStyle(document.documentElement).overflow;
    
    // Désactiver le scroll
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100%';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';
    
    // Restaurer au démontage
    return () => {
      document.body.style.overflow = originalStyle;
      document.body.style.height = '';
      document.documentElement.style.overflow = originalHtmlStyle;
      document.documentElement.style.height = '';
    };
  }, []);

  return null;
}

