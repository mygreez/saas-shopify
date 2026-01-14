// ============================================
// API: Mise à jour du profil utilisateur
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/db/supabase';
import { z } from 'zod';

const UpdateProfileSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long').optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Mode démo : pas de mise à jour possible
    if (userId === 'demo-user-id') {
      return NextResponse.json({
        success: true,
        message: 'Profil mis à jour (mode démo)',
        demo_mode: true,
      });
    }

    const body = await request.json();
    const validatedData = UpdateProfileSchema.parse(body);

    // Mise à jour dans Supabase
    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update({
        name: validatedData.name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Erreur mise à jour profil:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du profil' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: updatedUser,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Erreur mise à jour profil:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du profil' },
      { status: 500 }
    );
  }
}

