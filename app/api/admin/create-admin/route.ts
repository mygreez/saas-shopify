// ============================================
// API: Créer un compte admin (Admin uniquement)
// ============================================
// Cette route permet aux admins existants de créer de nouveaux comptes admin

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import bcrypt from 'bcryptjs';
import { getUserId } from '@/lib/auth';

const CreateAdminSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit faire au moins 6 caractères'),
  name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur actuel est admin
    const currentUserId = await getUserId();
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Vérifier le rôle admin
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', currentUserId)
      .single();

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accès refusé : Admin requis' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = CreateAdminSchema.parse(body);

    // Vérification si l'utilisateur existe déjà
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('email', validatedData.email)
      .single();

    if (existingUser) {
      // Si l'utilisateur existe déjà, on peut le promouvoir admin
      if (existingUser.role === 'admin') {
        return NextResponse.json(
          { error: 'Cet utilisateur est déjà admin' },
          { status: 400 }
        );
      }

      // Promouvoir en admin
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ role: 'admin' })
        .eq('id', existingUser.id);

      if (updateError) {
        console.error('Erreur promotion admin:', updateError);
        return NextResponse.json(
          { error: 'Erreur lors de la promotion en admin' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Utilisateur promu admin avec succès',
        data: {
          id: existingUser.id,
          email: validatedData.email,
          role: 'admin',
        },
      });
    }

    // Hash du mot de passe
    const passwordHash = await bcrypt.hash(validatedData.password, 10);

    // Création de l'utilisateur admin
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({
        email: validatedData.email,
        name: validatedData.name || validatedData.email.split('@')[0],
        password_hash: passwordHash,
        role: 'admin',
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création admin:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la création du compte admin' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Compte admin créé avec succès',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'admin',
      },
    });

  } catch (error: any) {
    console.error('Erreur create-admin:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erreur lors de la création du compte admin' },
      { status: 500 }
    );
  }
}



