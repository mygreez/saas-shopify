// ============================================
// ENCRYPTION/DECRYPTION POUR TOKENS SHOPIFY
// ============================================

import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  console.warn('⚠️ ENCRYPTION_KEY doit faire 32 caractères pour la sécurité');
}

/**
 * Chiffre un token Shopify avant stockage en base
 */
export function encryptToken(token: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY non configurée');
  }
  return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
}

/**
 * Déchiffre un token Shopify depuis la base
 */
export function decryptToken(encryptedToken: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY non configurée');
  }
  const bytes = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

