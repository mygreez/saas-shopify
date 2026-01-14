// ============================================
// API: Liste des invitations (Admin)
// ============================================
// Permet à un admin de voir toutes ses invitations en attente

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getUserId, getSession } from '@/lib/auth';
import { formatApiError } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      // Vérifier si c'est un utilisateur démo
      const session = await getSession();
      const isDemo = session?.user?.id === 'demo-user-id' || session?.user?.id?.startsWith('demo-');
      
      if (isDemo) {
        return NextResponse.json(
          { error: 'Cette fonctionnalité n\'est pas disponible en mode démo. Veuillez vous connecter avec un compte admin.' },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est admin
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accès refusé : Admin requis' },
        { status: 403 }
      );
    }

    // Récupérer toutes les invitations (pas seulement pending pour voir tous les liens créés)
    const { data: invitations, error } = await supabaseAdmin
      .from('partner_invitations')
      .select('*')
      .eq('admin_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur récupération invitations:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération' },
        { status: 500 }
      );
    }

    // Générer les liens pour chaque invitation
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const invitationsWithLinks = (invitations || []).map(inv => ({
      ...inv,
      partner_link: `${appUrl}/partner/${inv.token}/form`,
      company_name: inv.company_name || null, // S'assurer que company_name est inclus
    }));

    return NextResponse.json({
      success: true,
      data: invitationsWithLinks,
    });

  } catch (error: any) {
    console.error('Erreur récupération invitations:', error);
    const errorResponse = formatApiError(error, 'GET /api/partners/invitations');
    return NextResponse.json(
      errorResponse,
      { status: 500 }
    );
  }
}


