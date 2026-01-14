// ============================================
// API: Création produit (draft en base)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { ProductInput, GeneratedContent } from '@/types';
import { formatApiError } from '@/lib/utils/errors';

const CreateProductSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  material: z.string().optional(),
  style: z.string().optional(),
  price: z.number().optional(),
  images: z.array(z.string()).default([]),
  variants: z.array(z.any()).default([]),
  generated_content: z.object({
    title: z.string(),
    short_description: z.string(),
    long_description: z.string(),
    bullet_points: z.array(z.string()),
    tags: z.array(z.string()),
    meta_title: z.string(),
    meta_description: z.string(),
  }).optional(),
  folder_id: z.string().uuid().optional(),
  shop_domain: z.string().optional(),
  shopify_connection_id: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreateProductSchema.parse(body);

    // Récupération user_id depuis session
    const { getUserId } = await import('@/lib/auth');
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Récupérer le rôle de l'utilisateur
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Déterminer user_id et partner_id selon le rôle
    let adminUserId = userId;
    let partnerId: string | undefined = undefined;

    if (user.role === 'partner') {
      // Si c'est un partenaire, on doit trouver son admin
      const { data: relationship } = await supabaseAdmin
        .from('partner_relationships')
        .select('admin_id')
        .eq('partner_id', userId)
        .eq('is_active', true)
        .single();

      if (!relationship) {
        return NextResponse.json(
          { error: 'Aucune relation partenaire trouvée' },
          { status: 403 }
        );
      }

      adminUserId = relationship.admin_id;
      partnerId = userId;
    }

    // Vérifier que le dossier appartient à l'admin si folder_id fourni
    if (validatedData.folder_id) {
      const { data: folder } = await supabaseAdmin
        .from('folders')
        .select('id')
        .eq('id', validatedData.folder_id)
        .eq('user_id', adminUserId)
        .single();

      if (!folder) {
        return NextResponse.json(
          { error: 'Dossier non trouvé ou accès refusé' },
          { status: 403 }
        );
      }
    }

    // Récupération de la connexion Shopify si shop_domain fourni
    let shopifyConnectionId: string | undefined = validatedData.shopify_connection_id;
    if (!shopifyConnectionId && validatedData.shop_domain) {
      const { data: connection } = await supabaseAdmin
        .from('shopify_connections')
        .select('id')
        .eq('user_id', adminUserId)
        .eq('shop_domain', validatedData.shop_domain)
        .eq('is_active', true)
        .single();

      if (connection) {
        shopifyConnectionId = connection.id;
      }
    }

    // Si partenaire, récupérer la connexion Shopify depuis la relation
    if (!shopifyConnectionId && partnerId) {
      const { data: relationship } = await supabaseAdmin
        .from('partner_relationships')
        .select('shopify_connection_id')
        .eq('partner_id', partnerId)
        .eq('is_active', true)
        .single();

      if (relationship?.shopify_connection_id) {
        shopifyConnectionId = relationship.shopify_connection_id;
      }
    }

    // Création du produit en draft
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .insert({
        user_id: adminUserId, // L'admin est le propriétaire
        partner_id: partnerId, // Le partenaire est le créateur (si applicable)
        folder_id: validatedData.folder_id,
        shopify_connection_id: shopifyConnectionId,
        name: validatedData.name,
        category: validatedData.category,
        material: validatedData.material,
        style: validatedData.style,
        price: validatedData.price,
        images: validatedData.images,
        variants: validatedData.variants,
        generated_content: validatedData.generated_content,
        raw_data: validatedData,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création produit:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la création du produit' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });

  } catch (error: any) {
    console.error('Erreur création produit:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }

    const errorResponse = formatApiError(error, 'POST /api/products/create');
    return NextResponse.json(
      errorResponse,
      { status: 500 }
    );
  }
}

