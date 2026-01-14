// ============================================
// API: Créer une invitation partenaire publique (sans auth)
// ============================================
// Permet de créer une invitation sans authentification pour la page publique

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import crypto from 'crypto';

const PublicInviteSchema = z.object({
  company_name: z.string().min(1, 'Nom d\'entreprise requis'),
  email: z.string().email('Email invalide'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = PublicInviteSchema.parse(body);

    // Pour la page publique, on utilise un admin_id par défaut ou on crée une invitation sans admin_id
    // On va chercher le premier admin disponible ou utiliser un admin par défaut
    const { data: adminUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Aucun administrateur trouvé. Veuillez contacter le support.' },
        { status: 500 }
      );
    }

    // Vérifier si une invitation existe déjà pour cet email
    const { data: existingInvitation } = await supabaseAdmin
      .from('partner_invitations')
      .select('id, token, expires_at')
      .eq('email', validatedData.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Si une invitation existe et n'est pas expirée, la réutiliser
    if (existingInvitation) {
      const expiresAt = new Date(existingInvitation.expires_at);
      if (new Date() <= expiresAt) {
        return NextResponse.json({
          success: true,
          data: {
            token: existingInvitation.token,
            invitation_id: existingInvitation.id,
          },
        });
      }
    }

    // Générer un token unique
    const token = crypto.randomBytes(32).toString('hex');
    
    // Date d'expiration : 365 jours
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365);

    // Créer l'invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('partner_invitations')
      .insert({
        admin_id: adminUser.id,
        email: validatedData.email,
        company_name: validatedData.company_name,
        token,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Erreur création invitation publique:', inviteError);
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la création de l\'invitation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        token: invitation.token,
        invitation_id: invitation.id,
      },
    });

  } catch (error: any) {
    console.error('Erreur invitation publique:', error);

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
        error: error?.message || 'Erreur lors de la création de l\'invitation',
      },
      { status: 500 }
    );
  }
}

