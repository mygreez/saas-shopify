// ============================================
// API: Connexion à la Société des Avis Garantis
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/db/supabase';

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
    const { api_key } = body;

    if (!api_key) {
      return NextResponse.json(
        { error: 'Clé API manquante' },
        { status: 400 }
      );
    }

    // Vérifier si une connexion existe déjà
    const { data: existing } = await supabaseAdmin
      .from('avis_garantis_connections')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Mettre à jour la clé API
      const { error } = await supabaseAdmin
        .from('avis_garantis_connections')
        .update({
          api_key: api_key,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Erreur mise à jour connexion:', error);
        return NextResponse.json(
          { error: 'Erreur lors de la mise à jour de la connexion' },
          { status: 500 }
        );
      }
    } else {
      // Créer la connexion
      const { error } = await supabaseAdmin
        .from('avis_garantis_connections')
        .insert({
          user_id: userId,
          api_key: api_key,
        });

      if (error) {
        console.error('Erreur création connexion:', error);
        return NextResponse.json(
          { error: 'Erreur lors de la création de la connexion' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Connexion à la Société des Avis Garantis établie avec succès',
    });
  } catch (error: any) {
    console.error('Erreur connexion Avis Garantis:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la connexion' },
      { status: 500 }
    );
  }
}

