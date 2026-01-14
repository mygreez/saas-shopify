// ============================================
// API: Gestion des paramètres système (Admin)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getUserId } from '@/lib/auth';

const SettingsSchema = z.object({
  commission_rate: z.number().min(0).max(1).optional(),
  tva_rate: z.number().min(0).max(1).optional(),
});

// GET: Récupérer les paramètres
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const { data: user } = await supabaseAdmin.from('users').select('role').eq('id', userId).single();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé : Admin requis' }, { status: 403 });
    }

    const { data: settings, error } = await supabaseAdmin
      .from('system_settings')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Erreur récupération paramètres:', error);
      return NextResponse.json({ success: false, error: 'Erreur lors de la récupération des paramètres' }, { status: 500 });
    }

    // Transformer en objet clé-valeur
    const settingsMap: Record<string, any> = {};
    settings?.forEach(setting => {
      // Les valeurs JSONB sont retournées telles quelles par Supabase
      // Si c'est un nombre, string, etc., on l'utilise directement
      let value = setting.value;
      
      // Si c'est une chaîne JSON, la parser
      if (typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          // Si ce n'est pas du JSON valide, garder la valeur telle quelle
        }
      }
      
      settingsMap[setting.key] = value;
    });

    // Valeurs par défaut si non définies
    const defaultSettings = {
      commission_rate: 0.57,
      tva_rate: 0.20,
    };

    return NextResponse.json({
      success: true,
      data: {
        commission_rate: settingsMap.commission_rate || defaultSettings.commission_rate,
        tva_rate: settingsMap.tva_rate || defaultSettings.tva_rate,
        raw: settings || [],
      },
    });

  } catch (error: any) {
    console.error('Erreur GET settings:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur lors de la récupération des paramètres' },
      { status: 500 }
    );
  }
}

// PUT: Mettre à jour les paramètres
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const { data: user } = await supabaseAdmin.from('users').select('role').eq('id', userId).single();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé : Admin requis' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = SettingsSchema.parse(body);

    const updates: any[] = [];

    // Mettre à jour chaque paramètre
    if (validatedData.commission_rate !== undefined) {
      const { error: commissionError } = await supabaseAdmin
        .from('system_settings')
        .upsert({
          user_id: userId,
          key: 'commission_rate',
          value: validatedData.commission_rate, // Supabase convertira automatiquement en JSONB
          description: 'Taux de commission GREEZ',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,key',
        });
      
      if (commissionError) {
        console.error('Erreur sauvegarde commission_rate:', commissionError);
        throw commissionError;
      }
    }

    if (validatedData.tva_rate !== undefined) {
      const { error: tvaError } = await supabaseAdmin
        .from('system_settings')
        .upsert({
          user_id: userId,
          key: 'tva_rate',
          value: validatedData.tva_rate, // Supabase convertira automatiquement en JSONB
          description: 'Taux de TVA',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,key',
        });
      
      if (tvaError) {
        console.error('Erreur sauvegarde tva_rate:', tvaError);
        throw tvaError;
      }
    }

    if (validatedData.commission_rate === undefined && validatedData.tva_rate === undefined) {
      return NextResponse.json({ success: false, error: 'Aucun paramètre à mettre à jour' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Paramètres mis à jour avec succès',
    });

  } catch (error: any) {
    console.error('Erreur PUT settings:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Données invalides',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur lors de la mise à jour des paramètres' },
      { status: 500 }
    );
  }
}

