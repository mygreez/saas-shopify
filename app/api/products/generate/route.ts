// ============================================
// API: Génération contenu produit via IA
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { generateProductContent } from '@/lib/ai/generator';
import { ProductInput, PromptConfig } from '@/types';

const ProductInputSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  material: z.string().optional(),
  style: z.string().optional(),
  price: z.number().optional(),
  images: z.array(z.string().url()).default([]),
  variants: z.array(z.object({
    title: z.string(),
    price: z.string(),
    sku: z.string().optional(),
    inventory_quantity: z.number().optional(),
    option1: z.string().optional(),
    option2: z.string().optional(),
  })).default([]),
  shop_domain: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedInput = ProductInputSchema.parse(body);

    // Récupération user_id depuis session
    const { getUserId } = await import('@/lib/auth');
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Récupération de la config de calibration
    let promptConfig: PromptConfig | null = null;

    if (validatedInput.shop_domain) {
      const { data: configData } = await supabaseAdmin
        .from('prompt_configs')
        .select('config')
        .eq('user_id', userId)
        .eq('shop_domain', validatedInput.shop_domain)
        .single();

      if (configData) {
        promptConfig = configData.config as PromptConfig;
      }
    }

    // Config par défaut si aucune config trouvée
    if (!promptConfig) {
      promptConfig = getDefaultPromptConfig();
    }

    // Génération du contenu
    const result = await generateProductContent(
      validatedInput as ProductInput,
      promptConfig
    );

    // Log de la génération (optionnel)
    await supabaseAdmin.from('ai_generation_logs').insert({
      user_id: userId,
      provider: 'openai', // À récupérer depuis la config
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      tokens_used: result.tokens_used,
      cost: result.cost,
      latency_ms: result.latency_ms,
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error: any) {
    console.error('Erreur génération produit:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erreur lors de la génération du contenu' },
      { status: 500 }
    );
  }
}

/**
 * Config par défaut si aucune calibration n'existe
 */
function getDefaultPromptConfig(): PromptConfig {
  return {
    brand_voice: {
      positioning: 'e-commerce premium',
      tone: 'professionnel, authentique',
      target: 'consommateurs exigeants',
      values: ['qualité', 'durabilité'],
      recurring_words: [],
      do_not_say: [],
    },
    structure: {
      title_length: 'medium',
      short_desc_length: 'short',
      long_desc_length: 'medium',
      storytelling_enabled: true,
      bullet_points_enabled: true,
      bullet_count: 5,
      cta_required: false,
      seo_format: {
        use_h2: true,
        short_sentences: true,
        keyword_density: 0.02,
      },
    },
    examples: [],
    rules: {
      never_invent_data: true,
      always_mention_material: true,
      stay_brand_coherent: true,
      never_use_forbidden_words: true,
    },
  };
}

