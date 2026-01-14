// ============================================
// API: Vérifier un utilisateur dans la base de données
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 }
      );
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          found: false,
          message: 'Utilisateur non trouvé dans la base de données',
        });
      }
      console.error('Erreur:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la recherche' },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json({
        found: false,
        message: 'Utilisateur non trouvé',
      });
    }

    return NextResponse.json({
      found: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        has_password: !!user.password_hash,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      message: user.role === 'admin' 
        ? '✅ Utilisateur trouvé et est ADMIN (peut se connecter)'
        : `⚠️ Utilisateur trouvé mais n'est PAS admin (rôle: ${user.role})`,
    });

  } catch (error: any) {
    console.error('Erreur check-user:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification' },
      { status: 500 }
    );
  }
}



