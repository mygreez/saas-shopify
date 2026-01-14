// ============================================
// API: Statut de la connexion Avis Garantis
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { data: connection } = await supabaseAdmin
      .from('avis_garantis_connections')
      .select('id, created_at')
      .eq('user_id', userId)
      .single();

    return NextResponse.json({
      connected: !!connection,
      connection_date: connection?.created_at || null,
    });
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      connection_date: null,
    });
  }
}

