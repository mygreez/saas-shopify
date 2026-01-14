// ============================================
// API: Upload d'images produit
// ============================================
// Upload une ou plusieurs images et les associe à un produit

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getUserId } from '@/lib/auth';

// Pour l'instant, on accepte des URLs (les images seront uploadées côté client)
// TODO: Implémenter l'upload réel vers S3/Supabase Storage

const UploadImageSchema = z.object({
  product_id: z.string().uuid(),
  url: z.string().url('URL invalide'),
  filename: z.string().optional(),
  file_size: z.number().optional(),
  mime_type: z.string().optional(),
  position: z.number().default(0),
  is_primary: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = UploadImageSchema.parse(body);

    // Vérifier que le produit existe et que l'utilisateur y a accès
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id, user_id, partner_id')
      .eq('id', validatedData.product_id)
      .single();

    if (!product) {
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier les permissions
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

    // Admin peut modifier tous les produits de sa boutique
    // Partenaire peut modifier uniquement ses propres produits en draft
    if (user.role === 'partner') {
      if (product.partner_id !== userId) {
        return NextResponse.json(
          { error: 'Accès refusé' },
          { status: 403 }
        );
      }

      // Vérifier que le produit est en draft (partenaire ne peut pas modifier après soumission)
      const { data: productStatus } = await supabaseAdmin
        .from('products')
        .select('status')
        .eq('id', validatedData.product_id)
        .single();

      if (productStatus?.status !== 'draft') {
        return NextResponse.json(
          { error: 'Vous ne pouvez modifier que les produits en brouillon' },
          { status: 403 }
        );
      }
    } else if (user.role === 'admin') {
      if (product.user_id !== userId) {
        return NextResponse.json(
          { error: 'Accès refusé' },
          { status: 403 }
        );
      }
    }

    // Si c'est l'image principale, désactiver les autres images principales
    if (validatedData.is_primary) {
      await supabaseAdmin
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', validatedData.product_id);
    }

    // Créer l'image
    const { data: image, error } = await supabaseAdmin
      .from('product_images')
      .insert({
        product_id: validatedData.product_id,
        url: validatedData.url,
        filename: validatedData.filename,
        file_size: validatedData.file_size,
        mime_type: validatedData.mime_type,
        position: validatedData.position,
        is_primary: validatedData.is_primary,
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création image:', error);
      return NextResponse.json(
        { error: 'Erreur lors de l\'upload de l\'image' },
        { status: 500 }
      );
    }

    // Mettre à jour le tableau images dans products (pour compatibilité)
    const { data: allImages } = await supabaseAdmin
      .from('product_images')
      .select('url')
      .eq('product_id', validatedData.product_id)
      .order('position', { ascending: true });

    await supabaseAdmin
      .from('products')
      .update({ images: allImages?.map(img => img.url) || [] })
      .eq('id', validatedData.product_id);

    return NextResponse.json({
      success: true,
      data: image,
    });

  } catch (error: any) {
    console.error('Erreur upload image:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erreur lors de l\'upload' },
      { status: 500 }
    );
  }
}




