// ============================================
// API: Connexion mode démo
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { signIn } from 'next-auth/react';

/**
 * Crée ou récupère un utilisateur démo
 */
export async function POST(request: NextRequest) {
  try {
    // Identifiants démo
    const demoEmail = 'demo@photify.app';
    const demoPassword = 'demo123456';

    // Pour le mode démo, on retourne directement les credentials
    // L'utilisateur pourra se connecter avec ces identifiants
    return NextResponse.json({
      success: true,
      message: 'Compte démo créé',
      credentials: {
        email: demoEmail,
        password: demoPassword,
      },
      login_url: '/auth/login',
    });

  } catch (error: any) {
    console.error('Erreur création compte démo:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du compte démo' },
      { status: 500 }
    );
  }
}

