// ============================================
// API: Supprimer une invitation partenaire (Admin)
// ============================================
// Permet à un admin de supprimer une invitation et toutes ses données associées

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getUserId } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
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
        { success: false, error: 'Accès refusé : Admin requis' },
        { status: 403 }
      );
    }

    // Récupérer l'ID depuis les query params
    const { searchParams } = new URL(request.url);
    const invitation_id = searchParams.get('id');

    if (!invitation_id) {
      return NextResponse.json(
        { success: false, error: 'ID d\'invitation manquant' },
        { status: 400 }
      );
    }

    // Vérifier que l'invitation existe et appartient à cet admin
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('partner_invitations')
      .select('id, admin_id')
      .eq('id', invitation_id)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { success: false, error: 'Invitation non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que l'admin est le propriétaire de cette invitation
    if (invitation.admin_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Accès refusé : Cette invitation ne vous appartient pas' },
        { status: 403 }
      );
    }

    // Supprimer l'invitation (cascade supprimera automatiquement les soumissions et relations)
    const { error: deleteError } = await supabaseAdmin
      .from('partner_invitations')
      .delete()
      .eq('id', invitation_id);

    if (deleteError) {
      console.error('Erreur suppression invitation:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la suppression' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation supprimée avec succès',
    });

  } catch (error: any) {
    console.error('Erreur suppression invitation:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}


