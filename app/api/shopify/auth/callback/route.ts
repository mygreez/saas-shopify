// ============================================
// API: Callback OAuth Shopify
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/db/supabase';
import { encryptToken } from '@/lib/encryption';

const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET!;

/**
 * Vérifie la signature HMAC de Shopify
 */
function verifyHMAC(query: URLSearchParams): boolean {
  const hmac = query.get('hmac');
  if (!hmac) return false;

  query.delete('hmac');
  query.delete('signature');

  const message = Array.from(query.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const hash = crypto
    .createHmac('sha256', SHOPIFY_API_SECRET)
    .update(message)
    .digest('hex');

  return hash === hmac;
}

/**
 * Échange le code d'autorisation contre un access token
 */
async function exchangeCodeForToken(shop: string, code: string): Promise<string> {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY!,
      client_secret: SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error('Échec échange code/token');
  }

  const data = await response.json();
  return data.access_token;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Vérification HMAC
    if (!verifyHMAC(searchParams)) {
      return NextResponse.redirect(new URL('/auth/error?reason=invalid_signature', request.url));
    }

    const shop = searchParams.get('shop');
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Nonce (à vérifier)

    if (!shop || !code) {
      return NextResponse.redirect(new URL('/auth/error?reason=missing_params', request.url));
    }

    // Échange code → access token
    const accessToken = await exchangeCodeForToken(shop, code);
    const scope = searchParams.get('scope') || '';

    // Récupération de l'user_id depuis la session
    const { getUserId } = await import('@/lib/auth');
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.redirect(new URL('/auth/login?error=session_required', request.url));
    }

    // Chiffrement du token
    const encryptedToken = encryptToken(accessToken);

    // Sauvegarde en base
    const { error } = await supabaseAdmin
      .from('shopify_connections')
      .upsert({
        user_id: userId,
        shop_domain: shop,
        access_token_encrypted: encryptedToken,
        scope,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,shop_domain',
      });

    if (error) {
      console.error('Erreur sauvegarde connexion:', error);
      return NextResponse.redirect(new URL('/auth/error?reason=db_error', request.url));
    }

    // Redirection vers le dashboard
    return NextResponse.redirect(new URL('/dashboard?shop=' + shop, request.url));

  } catch (error: any) {
    console.error('Erreur callback OAuth:', error);
    return NextResponse.redirect(new URL('/auth/error?reason=server_error', request.url));
  }
}

