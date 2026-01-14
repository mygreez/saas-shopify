// ============================================
// API: Analyse d'image pour créer fiche produit
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserId } from '@/lib/auth';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const AnalyzeImageSchema = z.object({
  image_url: z.string().url('URL d\'image invalide'),
  shop_domain: z.string().optional(),
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
    const validatedData = AnalyzeImageSchema.parse(body);

    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI non configuré' },
        { status: 500 }
      );
    }

    // Analyse de l'image avec GPT-4 Vision
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'system',
          content: `Tu es un expert e-commerce. Analyse cette image de produit et génère une fiche produit complète.
          
          Retourne un JSON avec :
          - name: Nom du produit
          - category: Catégorie
          - material: Matière (si visible)
          - style: Style/positionnement
          - description: Description détaillée
          - tags: Tags pertinents (array)
          - price_suggestion: Suggestion de prix (si visible)
          
          Sois précis et ne invente rien. Si tu ne peux pas voir quelque chose, mets null.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyse cette image de produit et génère une fiche produit complète au format JSON.',
            },
            {
              type: 'image_url',
              image_url: {
                url: validatedData.image_url,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return NextResponse.json(
        { error: 'Aucune réponse de l\'IA' },
        { status: 500 }
      );
    }

    // Extraction du JSON de la réponse
    let productData;
    try {
      // Essaie de parser directement
      productData = JSON.parse(content);
    } catch {
      // Si échec, essaie d'extraire le JSON du texte
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        productData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Impossible d\'extraire les données JSON');
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...productData,
        image_url: validatedData.image_url,
        analyzed_at: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    console.error('Erreur analyse image:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erreur lors de l\'analyse de l\'image' },
      { status: 500 }
    );
  }
}

