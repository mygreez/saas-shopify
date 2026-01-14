// ============================================
// API: Upload Images
// ============================================
// POST /api/uploads/images

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { ImageUploader } from '@/lib/services/image/uploader';
import { ImageProcessor } from '@/lib/services/image/processor';
import { getUserId } from '@/lib/auth';
import { UploadResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const formData = await request.formData();
    const productId = formData.get('productId') as string;
    const files = formData.getAll('files') as File[];

    if (!productId) {
      return NextResponse.json({ error: 'productId manquant' }, { status: 400 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // Vérifier que le produit existe et appartient à l'utilisateur
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        store: {
          ownerId: userId,
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Produit non trouvé ou accès refusé' }, { status: 404 });
    }

    // Valider les images
    const validationErrors: string[] = [];
    const validFiles: File[] = [];

    for (const file of files) {
      const validation = ImageProcessor.validateImage(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        validationErrors.push(`${file.name}: ${validation.error}`);
      }
    }

    if (validFiles.length === 0) {
      return NextResponse.json(
        {
          error: 'Aucune image valide',
          details: validationErrors,
        },
        { status: 400 }
      );
    }

    // Initialiser l'uploader S3
    const uploader = ImageUploader.fromEnv();

    // Uploader les images
    const uploadedUrls = await uploader.uploadImages(validFiles, 'products');

    // Récupérer la position maximale actuelle
    const maxPosition = await prisma.image.findFirst({
      where: { productId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    let currentPosition = (maxPosition?.position ?? -1) + 1;

    // Créer les enregistrements d'images
    const createdImages = await Promise.all(
      uploadedUrls.map(async (url, index) => {
        const image = await prisma.image.create({
          data: {
            productId,
            url,
            position: currentPosition + index,
            alt: validFiles[index].name,
          },
        });
        return {
          id: image.id,
          url: image.url,
          position: image.position,
        };
      })
    );

    const response: UploadResponse = {
      images: createdImages,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Erreur upload images:', error);

    // Gérer les erreurs spécifiques
    if (error.message?.includes('Configuration S3')) {
      return NextResponse.json(
        { error: 'Configuration S3 manquante. Vérifiez les variables d\'environnement.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}




