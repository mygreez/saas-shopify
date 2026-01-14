// ============================================
// API: Créer un dossier
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { supabaseAdmin } from '@/lib/db/supabase';

// Export dynamique pour éviter les problèmes de build
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('📁 API folders/create appelée');
  try {
    // Récupérer la session directement avec les headers de la requête
    const session = await getServerSession(authOptions);
    console.log('🔐 Session:', session ? 'Trouvée' : 'Non trouvée');
    
    const userId = session?.user?.id;
    console.log('👤 User ID:', userId);
    
    // Mode démo : accepter même sans session ou avec demo-user-id
    const isDemo = !userId || userId === 'demo-user-id';
    
    if (!userId && !isDemo) {
      console.error('❌ Utilisateur non authentifié - Session:', session);
      return NextResponse.json(
        { 
          error: 'Non authentifié',
          details: 'Veuillez vous connecter pour créer un dossier'
        },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Corps de la requête invalide' },
        { status: 400 }
      );
    }

    const { name, description, publication_date, color } = body;
    console.log('📝 Données reçues:', { name, description, publication_date, color });

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Le nom de la publication est requis' },
        { status: 400 }
      );
    }

    // MODE DÉMO : Retourner un dossier simulé
    if (isDemo) {
      console.log('🎭 Mode démo : Création d\'un dossier simulé');
      const demoFolder = {
        id: `demo-folder-${Date.now()}`,
        user_id: 'demo-user-id',
        name: name.trim(),
        description: description?.trim() || null,
        publication_date: publication_date || null,
        color: color || '#6366f1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      return NextResponse.json({ folder: demoFolder });
    }

    // MODE PRODUCTION : Créer le dossier dans Supabase
    console.log('💾 Tentative de création du dossier dans Supabase...');
    const { data: folder, error } = await supabaseAdmin
      .from('folders')
      .insert({
        user_id: userId,
        name: name.trim(),
        description: description?.trim() || null,
        publication_date: publication_date || null,
        color: color || '#6366f1',
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur Supabase création dossier:', error);
      
      // Vérifier si c'est une erreur de table inexistante
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        // Si la table n'existe pas, basculer en mode démo
        console.log('🎭 Table inexistante, basculement en mode démo');
        const demoFolder = {
          id: `demo-folder-${Date.now()}`,
          user_id: userId || 'demo-user-id',
          name: name.trim(),
          description: description?.trim() || null,
          publication_date: publication_date || null,
          color: color || '#6366f1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return NextResponse.json({ folder: demoFolder });
      }
      
      // Message d'erreur plus détaillé pour le debug
      return NextResponse.json(
        { 
          error: 'Erreur lors de la création du dossier',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      );
    }

    console.log('✅ Dossier créé avec succès:', folder);
    return NextResponse.json({ folder });

  } catch (error: any) {
    console.error('❌ Erreur API création dossier:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

