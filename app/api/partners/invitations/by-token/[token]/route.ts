// ============================================
// API: Valider un token d'invitation
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token manquant' },
        { status: 400 }
      );
    }

    // Valider le token d'invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('partner_invitations')
      .select(`
        *,
        admin:users!partner_invitations_admin_id_fkey(
          id,
          name,
          email
        )
      `)
      .eq('token', token)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { valid: false, error: 'Token invalide' },
        { status: 404 }
      );
    }

    // Vérifier que l'invitation n'est pas expirée
    const expiresAt = new Date(invitation.expires_at);
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { valid: false, error: 'Token expiré' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      data: {
        email: invitation.email,
        company_name: invitation.company_name,
        admin: invitation.admin,
      },
    });

  } catch (error: any) {
    console.error('Erreur validation token:', error);
    return NextResponse.json(
      { valid: false, error: 'Erreur lors de la validation' },
      { status: 500 }
    );
  }
}



