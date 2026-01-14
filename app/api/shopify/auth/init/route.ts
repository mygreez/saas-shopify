// ============================================
// API: Initie l'OAuth Shopify
// ============================================

import { NextRequest, NextResponse } from 'next/server';

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES || 'read_products,write_products';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    // Vérifier que les variables d'environnement Shopify sont configurées
    if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) {
      console.error('Variables d\'environnement Shopify manquantes:', {
        hasApiKey: !!SHOPIFY_API_KEY,
        hasApiSecret: !!SHOPIFY_API_SECRET,
      });
      return NextResponse.json(
        { 
          error: 'Configuration Shopify manquante',
          details: 'Les variables SHOPIFY_API_KEY et SHOPIFY_API_SECRET doivent être configurées dans .env.local. Consultez la documentation pour créer une application Shopify.',
          help: 'https://partners.shopify.com'
        },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop');

    if (!shop) {
      return NextResponse.json(
        { error: 'Paramètre "shop" manquant' },
        { status: 400 }
      );
    }

    // Validation du domaine Shopify
    if (!shop.endsWith('.myshopify.com')) {
      return NextResponse.json(
        { error: 'Domaine Shopify invalide' },
        { status: 400 }
      );
    }

    // Génération du nonce pour sécurité
    const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // URL de redirection après OAuth
    const redirectUri = `${APP_URL}/api/shopify/auth/callback`;

    // Construction de l'URL OAuth Shopify
    const authUrl = `https://${shop}/admin/oauth/authorize?` +
      `client_id=${SHOPIFY_API_KEY}&` +
      `scope=${SHOPIFY_SCOPES}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${nonce}`;

    return NextResponse.json({
      auth_url: authUrl,
      nonce,
    });

  } catch (error: any) {
    console.error('Erreur init OAuth:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'initialisation OAuth' },
      { status: 500 }
    );
  }
}

