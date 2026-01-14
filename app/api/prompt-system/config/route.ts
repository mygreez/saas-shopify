// ============================================
// API: Gestion config Prompt System
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { PromptConfig } from '@/types';

const PromptConfigSchema = z.object({
  brand_voice: z.object({
    positioning: z.string(),
    tone: z.string(),
    target: z.string(),
    values: z.array(z.string()),
    recurring_words: z.array(z.string()),
    do_not_say: z.array(z.string()),
  }),
  structure: z.object({
    title_length: z.enum(['short', 'medium', 'long']),
    short_desc_length: z.enum(['short', 'medium', 'long']),
    long_desc_length: z.enum(['short', 'medium', 'long']),
    storytelling_enabled: z.boolean(),
    bullet_points_enabled: z.boolean(),
    bullet_count: z.number().min(1).max(10),
    cta_required: z.boolean(),
    seo_format: z.object({
      use_h2: z.boolean(),
      short_sentences: z.boolean(),
      keyword_density: z.number().min(0).max(1),
    }),
  }),
  examples: z.array(z.object({
    product_name: z.string(),
    generated_content: z.object({
      title: z.string(),
      short_description: z.string(),
      long_description: z.string(),
      bullet_points: z.array(z.string()),
      tags: z.array(z.string()),
      meta_title: z.string(),
      meta_description: z.string(),
    }),
  })),
  rules: z.object({
    never_invent_data: z.boolean(),
    always_mention_material: z.boolean(),
    stay_brand_coherent: z.boolean(),
    never_use_forbidden_words: z.boolean(),
  }),
});

// GET: Récupère la config
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shopDomain = searchParams.get('shop');

    if (!shopDomain) {
      return NextResponse.json(
        { error: 'Paramètre "shop" manquant' },
        { status: 400 }
      );
    }

    // Récupération user_id depuis session
    const { getUserId } = await import('@/lib/auth');
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { data: config, error } = await supabaseAdmin
      .from('prompt_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('shop_domain', shopDomain)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Erreur récupération config:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de la config' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: config || null,
    });

  } catch (error: any) {
    console.error('Erreur GET config:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// PUT: Met à jour la config
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedConfig = PromptConfigSchema.parse(body.config);
    const shopDomain = body.shop_domain;

    if (!shopDomain) {
      return NextResponse.json(
        { error: 'Paramètre "shop_domain" manquant' },
        { status: 400 }
      );
    }

    // Récupération user_id depuis session
    const { getUserId } = await import('@/lib/auth');
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { data: config, error } = await supabaseAdmin
      .from('prompt_configs')
      .upsert({
        user_id: userId,
        shop_domain: shopDomain,
        config: validatedConfig,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,shop_domain',
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur sauvegarde config:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la sauvegarde de la config' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: config,
    });

  } catch (error: any) {
    console.error('Erreur PUT config:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Config invalide', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

