// ============================================
// API: Liste des dossiers de l'utilisateur
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/db/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { getServerSession } = await import('next-auth');
    const { authOptions } = await import('@/app/api/auth/[...nextauth]/route');
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const isDemo = !userId || userId === 'demo-user-id';

    // MODE DÉMO : Retourner un tableau vide (les dossiers sont gérés côté client avec localStorage)
    if (isDemo) {
      return NextResponse.json({ folders: [] });
    }

    // MODE PRODUCTION : Récupérer depuis Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl === '') {
      return NextResponse.json({ folders: [] });
    }

    const { data: folders, error } = await supabaseAdmin
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur récupération dossiers:', error);
      // En cas d'erreur, retourner un tableau vide plutôt qu'une erreur
      return NextResponse.json({ folders: [] });
    }

    return NextResponse.json({ folders: folders || [] });

  } catch (error: any) {
    console.error('Erreur API liste dossiers:', error);
    // En cas d'erreur, retourner un tableau vide pour le mode démo
    return NextResponse.json({ folders: [] });
  }
}

