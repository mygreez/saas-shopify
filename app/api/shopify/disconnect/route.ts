// ============================================
// API: Déconnexion Shopify
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
    const { connectionId } = body;

    if (!connectionId) {
      return NextResponse.json(
        { error: 'ID de connexion manquant' },
        { status: 400 }
      );
    }

    // Vérifier que la connexion appartient à l'utilisateur
    const { data: connection, error: fetchError } = await supabaseAdmin
      .from('shopify_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !connection) {
      return NextResponse.json(
        { error: 'Connexion non trouvée' },
        { status: 404 }
      );
    }

    // Désactiver la connexion (soft delete)
    const { error: updateError } = await supabaseAdmin
      .from('shopify_connections')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Erreur lors de la déconnexion:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la déconnexion' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Connexion Shopify déconnectée avec succès',
    });

  } catch (error: any) {
    console.error('Erreur déconnexion Shopify:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la déconnexion' },
      { status: 500 }
    );
  }
}

