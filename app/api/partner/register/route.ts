// ============================================
// API: Inscription Partenaire (Step 1)
// ============================================
// Permet à un partenaire de s'inscrire avec nom d'entreprise, email et nom du contact

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';

const RegisterSchema = z.object({
  token: z.string().min(1, 'Token requis'),
  company_name: z.string().min(1, 'Nom d\'entreprise requis'),
  email: z.string().email('Email invalide'),
  contact_name: z.string().min(1, 'Nom du contact requis'),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const token = formData.get('token') as string;
    const companyName = formData.get('company_name') as string;
    const email = formData.get('email') as string;
    const contactName = formData.get('contact_name') as string;

    // Valider les données
    const validatedData = RegisterSchema.parse({
      token,
      company_name: companyName,
      email,
      contact_name: contactName,
    });

    // Valider le token d'invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('partner_invitations')
      .select('*')
      .eq('token', validatedData.token)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { success: false, error: 'Token invalide' },
        { status: 404 }
      );
    }

    // Vérifier que l'invitation n'est pas expirée
    const expiresAt = new Date(invitation.expires_at);
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { success: false, error: 'Token expiré' },
        { status: 400 }
      );
    }

    // Vérifier si Step 1 est déjà complété
    const { data: existingSubmission } = await supabaseAdmin
      .from('partner_submissions')
      .select('id, status')
      .eq('invitation_id', invitation.id)
      .single();

    if (existingSubmission && existingSubmission.status === 'step1_completed') {
      // Step 1 déjà complété, rediriger vers Step 2
      return NextResponse.json({
        success: true,
        data: {
          next_step_url: `/partner/${validatedData.token}/form`,
          message: 'Step 1 déjà complété',
        },
      });
    }

    // Mettre à jour l'invitation avec les données Step 1
    const { error: updateError } = await supabaseAdmin
      .from('partner_invitations')
      .update({
        company_name: validatedData.company_name,
        email: validatedData.email,
        contact_name: validatedData.contact_name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Erreur mise à jour invitation:', updateError);
      // Ne pas bloquer si la mise à jour échoue, on continue quand même
      console.warn('⚠️ Mise à jour invitation échouée, mais on continue le processus');
    }

    // Créer une soumission avec status step1_completed
    // Note: On crée une soumission temporaire sans brand_id pour Step 1
    // Le brand_id sera ajouté lors du Step 2
    let submission;
    if (!existingSubmission) {
      // Créer une soumission temporaire (sans brand_id pour l'instant)
      // On devra peut-être modifier la table pour rendre brand_id nullable temporairement
      // Ou créer un brand temporaire
      const { data: tempBrand, error: brandError } = await supabaseAdmin
        .from('brands')
        .insert({
          name: validatedData.company_name,
          contact_email: validatedData.email,
        })
        .select()
        .single();

      if (brandError) {
        console.error('Erreur création brand temporaire:', brandError);
        return NextResponse.json(
          { success: false, error: 'Erreur lors de la création' },
          { status: 500 }
        );
      }

      const { data: newSubmission, error: submissionError } = await supabaseAdmin
        .from('partner_submissions')
        .insert({
          invitation_id: invitation.id,
          brand_id: tempBrand.id,
          status: 'step1_completed',
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
    } else {
      // Mettre à jour le statut existant
      const { data: updatedSubmission, error: updateSubmissionError } = await supabaseAdmin
        .from('partner_submissions')
        .update({
          status: 'step1_completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSubmission.id)
        .select()
        .single();

      if (updateSubmissionError) {
        console.error('Erreur mise à jour submission:', updateSubmissionError);
        // Si la mise à jour échoue, on peut quand même continuer si la soumission existe
        // Mais on retourne une erreur pour informer l'utilisateur
        return NextResponse.json(
          { success: false, error: 'Erreur lors de la mise à jour de votre inscription. Veuillez réessayer.' },
          { status: 500 }
        );
      }

      submission = updatedSubmission;
    }

    return NextResponse.json({
      success: true,
      data: {
        submission_id: submission.id,
        next_step_url: `/partner/${validatedData.token}/form`,
      },
      message: 'Inscription réussie',
    });

  } catch (error: any) {
    console.error('Erreur inscription partenaire:', error);

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
        error: error?.message || 'Erreur lors de l\'inscription',
      },
      { status: 500 }
    );
  }
}

