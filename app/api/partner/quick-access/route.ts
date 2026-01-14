// ============================================
// API: Accès rapide partenaire par email
// ============================================
// Permet à un partenaire d'accéder directement au Step 3 avec juste son email

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getUserId } from '@/lib/auth';
import crypto from 'crypto';

const QuickAccessSchema = z.object({
  email: z.string().email('Email invalide'),
});

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validatedData = QuickAccessSchema.parse(body);

    // Vérifier si une invitation existe déjà pour cet email
    let invitation;
    const { data: existingInvitation } = await supabaseAdmin
      .from('partner_invitations')
      .select('*')
      .eq('email', validatedData.email)
      .eq('admin_id', userId)
      .single();

    if (existingInvitation) {
      invitation = existingInvitation;
    } else {
      // Créer une nouvelle invitation
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 365); // 1 an d'expiration

      const { data: newInvitation, error: inviteError } = await supabaseAdmin
        .from('partner_invitations')
        .insert({
          admin_id: userId,
          email: validatedData.email,
          token,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
          company_name: `Entreprise-${Date.now()}`,
        })
        .select()
        .single();

      if (inviteError) {
        console.error('Erreur création invitation:', inviteError);
        return NextResponse.json(
          { success: false, error: 'Erreur lors de la création de l\'invitation' },
          { status: 500 }
        );
      }

      invitation = newInvitation;
    }

    // Vérifier si une soumission existe déjà
    let submission;
    const { data: existingSubmission } = await supabaseAdmin
      .from('partner_submissions')
      .select('*')
      .eq('invitation_id', invitation.id)
      .single();

    if (existingSubmission) {
      submission = existingSubmission;
    } else {
      // Créer une soumission avec status step2_completed pour bypass Step 1 et 2
      // Créer un brand temporaire
      const { data: brand, error: brandError } = await supabaseAdmin
        .from('brands')
        .insert({
          name: invitation.company_name || 'Marque',
          contact_email: validatedData.email,
        })
        .select()
        .single();

      if (brandError) {
        console.error('Erreur création brand:', brandError);
        return NextResponse.json(
          { success: false, error: 'Erreur lors de la création' },
          { status: 500 }
        );
      }

      // Créer la soumission avec status step2_completed
      const { data: newSubmission, error: submissionError } = await supabaseAdmin
        .from('partner_submissions')
        .insert({
          invitation_id: invitation.id,
          brand_id: brand.id,
          status: 'step2_completed',
        })
        .select()
        .single();

      if (submissionError) {
        console.error('Erreur création submission:', submissionError);
        return NextResponse.json(
          { success: false, error: 'Erreur lors de la création de la soumission' },
          { status: 500 }
        );
      }

      submission = newSubmission;
    }

    // Retourner le lien vers le dashboard Step 3
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const dashboardLink = `${appUrl}/partner/${invitation.token}/dashboard`;

    return NextResponse.json({
      success: true,
      data: {
        token: invitation.token,
        dashboard_link: dashboardLink,
      },
      message: 'Accès créé avec succès',
    });

  } catch (error: any) {
    console.error('Erreur accès rapide:', error);

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
        error: error?.message || 'Erreur lors de la création de l\'accès',
      },
      { status: 500 }
    );
  }
}

