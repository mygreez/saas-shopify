// ============================================
// API: Traitement des fichiers pour créer des produits
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    // Traiter les fichiers
    const processedFiles: any[] = [];
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        // Convertir l'image en base64 pour l'analyse
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${file.type};base64,${base64}`;

        processedFiles.push({
          name: file.name,
          type: 'image',
          data: dataUrl,
          size: file.size,
        });
      } else if (file.name.endsWith('.zip')) {
        // Pour le ZIP, on retourne juste l'info pour l'instant
        // L'extraction sera faite côté client ou serveur selon la bibliothèque utilisée
        processedFiles.push({
          name: file.name,
          type: 'zip',
          size: file.size,
        });
      }
    }

    return NextResponse.json({
      success: true,
      files: processedFiles,
      count: processedFiles.length,
    });

  } catch (error: any) {
    console.error('Erreur traitement fichiers:', error);
    return NextResponse.json(
      { error: 'Erreur lors du traitement des fichiers' },
      { status: 500 }
    );
  }
}

