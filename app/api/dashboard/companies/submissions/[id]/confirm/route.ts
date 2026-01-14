// ============================================
// API: Confirmer une soumission (Admin)
// ============================================
// Permet à un admin de confirmer une soumission (changer le statut à "confirmed")

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getUserId } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
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

    // Gérer les params qui peuvent être une Promise dans Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params;
    const { id: submission_id } = resolvedParams;

    if (!submission_id) {
      return NextResponse.json(
        { error: 'ID de soumission manquant' },
        { status: 400 }
      );
    }

    // Vérifier que la soumission existe et appartient à cet admin
    type SubmissionWithInvitation = {
      id: string;
      status: string;
      invitation: {
        admin_id: string;
      } | {
        admin_id: string;
      }[];
    };

    const { data: submissionData, error: submissionError } = await supabaseAdmin
      .from('partner_submissions')
      .select(`
        id,
        status,
        invitation:partner_invitations!inner(admin_id)
      `)
      .eq('id', submission_id)
      .single();

    if (submissionError || !submissionData) {
      return NextResponse.json(
        { error: 'Soumission non trouvée' },
        { status: 404 }
      );
    }

    // Type explicite pour éviter les erreurs TypeScript
    const submission = submissionData as SubmissionWithInvitation;

    // Vérifier que l'admin est le propriétaire de cette soumission
    const invitation = Array.isArray(submission.invitation) ? submission.invitation[0] : submission.invitation;
    if (!invitation || invitation.admin_id !== userId) {
      return NextResponse.json(
        { error: 'Accès refusé : Cette soumission ne vous appartient pas' },
        { status: 403 }
      );
    }

    // Mettre à jour le statut à "confirmed"
    const { data: updatedSubmission, error: updateError } = await supabaseAdmin
      .from('partner_submissions')
      .update({ status: 'confirmed' })
      .eq('id', submission_id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Erreur mise à jour soumission:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la confirmation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedSubmission,
      message: 'Soumission confirmée avec succès',
    });

  } catch (error: any) {
    console.error('Erreur confirmation soumission:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la confirmation' },
      { status: 500 }
    );
  }
}


