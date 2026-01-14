// ============================================
// API: Trouver un partenaire par email
// ============================================
// Permet de trouver une invitation partenaire par email et retourner le token

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';

const FindByEmailSchema = z.object({
  email: z.string().email('Email invalide'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = FindByEmailSchema.parse(body);

    // Chercher une invitation avec cet email
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('partner_invitations')
      .select('id, token, email, expires_at')
      .eq('email', validatedData.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { success: false, error: 'Email incorrect ou non inscrit' },
        { status: 404 }
      );
    }

    // Vérifier que l'invitation n'est pas expirée
    const expiresAt = new Date(invitation.expires_at);
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { success: false, error: 'Votre invitation a expiré. Veuillez contacter l\'administrateur.' },
        { status: 400 }
      );
    }

    // Vérifier si une soumission existe et son statut
    const { data: submission } = await supabaseAdmin
      .from('partner_submissions')
      .select('id, status')
      .eq('invitation_id', invitation.id)
      .single();

    // Si pas de soumission ou Step 1 non complété, rediriger vers Step 1
    if (!submission || submission.status === 'pending') {
      return NextResponse.json({
        success: true,
        data: {
          token: invitation.token,
          redirect_to: 'register',
        },
        message: 'Redirection vers l\'inscription',
      });
    }

    // Si Step 1 complété mais pas Step 2, rediriger vers Step 2
    if (submission.status === 'step1_completed') {
      return NextResponse.json({
        success: true,
        data: {
          token: invitation.token,
          redirect_to: 'form',
        },
        message: 'Redirection vers le formulaire',
      });
    }

    // Si Step 2 complété ou plus, rediriger vers le dashboard
    return NextResponse.json({
      success: true,
      data: {
        token: invitation.token,
        redirect_to: 'dashboard',
      },
      message: 'Accès autorisé',
    });

  } catch (error: any) {
    console.error('Erreur recherche par email:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Données invalides',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erreur lors de la recherche',
      },
      { status: 500 }
    );
  }
}

