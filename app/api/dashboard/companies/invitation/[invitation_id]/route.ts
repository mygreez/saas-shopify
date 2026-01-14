// ============================================
// API: Détails d'une invitation (Admin)
// ============================================
// Récupère les détails d'une invitation même si Step 2/3 ne sont pas complétés

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getUserId } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invitation_id: string }> | { invitation_id: string } }
) {
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

    const resolvedParams = params instanceof Promise ? await params : params;
    const { invitation_id } = resolvedParams;

    // Récupérer l'invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('partner_invitations')
      .select('*')
      .eq('id', invitation_id)
      .eq('admin_id', userId)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { success: false, error: 'Invitation non trouvée' },
        { status: 404 }
      );
    }

    // Récupérer la soumission si elle existe
    let submission: {
      id: string;
      status: string;
      brand: any;
      products?: any[];
    } | null = null;
    
    const { data: submissionData, error: submissionError } = await supabaseAdmin
      .from('partner_submissions')
      .select(`
        id,
        status,
        brand:brands(*)
      `)
      .eq('invitation_id', invitation_id)
      .single();

    if (!submissionError && submissionData) {
      submission = {
        ...submissionData,
        products: [],
      };

      // Récupérer les produits si Step 2 est complété
      if (submission.status === 'step2_completed' || submission.status === 'step3_active') {
        const { data: products, error: productsError } = await supabaseAdmin
          .from('products')
          .select('*')
          .eq('raw_data->>submission_id', submission.id)
          .order('created_at', { ascending: false });

        if (!productsError && products) {
          submission.products = products;
        } else {
          submission.products = [];
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        invitation_id: invitation.id,
        company_name: invitation.company_name,
        email: invitation.email,
        contact_name: invitation.contact_name,
        created_at: invitation.created_at,
        token: invitation.token,
        status: invitation.status,
        submission: submission,
      },
    });

  } catch (error: any) {
    console.error('Erreur récupération détails invitation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erreur lors de la récupération',
      },
      { status: 500 }
    );
  }
}

