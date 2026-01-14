// ============================================
// API: Upload multiple d'images produit
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getUserId } from '@/lib/auth';

const UploadMultipleImagesSchema = z.object({
  product_id: z.string().uuid(),
  images: z.array(z.object({
    url: z.string().url('URL invalide'),
    filename: z.string().optional(),
    file_size: z.number().optional(),
    mime_type: z.string().optional(),
    position: z.number().default(0),
    is_primary: z.boolean().default(false),
  })),
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
    const { product_id, images } = UploadMultipleImagesSchema.parse(body);

    // Vérifier que le produit existe et que l'utilisateur y a accès
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id, user_id, partner_id, status')
      .eq('id', product_id)
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

    if (user.role === 'partner') {
      if (product.partner_id !== userId || product.status !== 'draft') {
        return NextResponse.json(
          { error: 'Accès refusé : Vous ne pouvez modifier que vos produits en brouillon' },
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

    // Préparer les données d'insertion
    const imagesToInsert = images.map((img, index) => ({
      product_id,
      url: img.url,
      filename: img.filename,
      file_size: img.file_size,
      mime_type: img.mime_type,
      position: img.position !== undefined ? img.position : index,
      is_primary: img.is_primary && index === 0, // Première image principale par défaut
    }));

    // S'assurer qu'une seule image est principale
    const primaryCount = imagesToInsert.filter(img => img.is_primary).length;
    if (primaryCount > 1) {
      // Garder seulement la première comme principale
      imagesToInsert.forEach((img, index) => {
        img.is_primary = index === 0;
      });
    }

    // Insérer toutes les images
    const { data: insertedImages, error } = await supabaseAdmin
      .from('product_images')
      .insert(imagesToInsert)
      .select();

    if (error) {
      console.error('Erreur upload images:', error);
      return NextResponse.json(
        { error: 'Erreur lors de l\'upload des images' },
        { status: 500 }
      );
    }

    // Mettre à jour le tableau images dans products
    const { data: allImages } = await supabaseAdmin
      .from('product_images')
      .select('url')
      .eq('product_id', product_id)
      .order('position', { ascending: true });

    await supabaseAdmin
      .from('products')
      .update({ images: allImages?.map(img => img.url) || [] })
      .eq('id', product_id);

    return NextResponse.json({
      success: true,
      data: insertedImages,
      count: insertedImages?.length || 0,
    });

  } catch (error: any) {
    console.error('Erreur upload multiple images:', error);

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




