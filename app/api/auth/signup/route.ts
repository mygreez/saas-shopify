// ============================================
// API: Inscription utilisateur
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import bcrypt from 'bcryptjs';

const SignupSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit faire au moins 6 caractères'),
  name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = SignupSchema.parse(body);

    // MODE DÉMO : Si Supabase n'est pas configuré, on simule la création
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl === '') {
      // En mode démo, on accepte n'importe quelle inscription
      return NextResponse.json({
        success: true,
        message: 'Compte créé avec succès (mode démo)',
        data: {
          id: `demo-${Date.now()}`,
          email: validatedData.email,
          name: validatedData.name || validatedData.email.split('@')[0],
        },
        demo_mode: true,
      });
    }

    // Vérification si l'utilisateur existe déjà
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', validatedData.email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 400 }
      );
    }

    // Hash du mot de passe
    const passwordHash = await bcrypt.hash(validatedData.password, 10);

    // Création de l'utilisateur avec rôle 'partner' par défaut
    // (Les admins doivent être créés via la route /api/admin/create-admin)
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({
        email: validatedData.email,
        name: validatedData.name || validatedData.email.split('@')[0],
        password_hash: passwordHash,
        role: 'partner', // Par défaut, les nouveaux comptes sont des partenaires
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création utilisateur:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la création du compte' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Compte créé avec succès',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });

  } catch (error: any) {
    console.error('Erreur signup:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erreur lors de l\'inscription' },
      { status: 500 }
    );
  }
}

