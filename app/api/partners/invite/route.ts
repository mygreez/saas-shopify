// ============================================
// API: Inviter un partenaire
// ============================================
// Permet à un admin d'inviter un partenaire par email

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getUserId, getSession } from '@/lib/auth';
import { formatApiError } from '@/lib/utils/errors';
import crypto from 'crypto';

const InvitePartnerSchema = z.object({
  email: z.string().email('Email invalide').optional(),
  name: z.string().min(1, 'Nom requis').optional(),
  company_name: z.string().min(1, 'Nom d\'entreprise requis').optional(), // Optionnel maintenant
  shop_domain: z.string().optional(), // Optionnel : lier à une boutique Shopify
});
// Note: Si ni email ni name n'est fourni, on générera un email basé sur company_name

export async function POST(request: NextRequest) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔵 [API /partners/invite] Début de la requête POST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    console.log('📝 [1/7] Vérification de l\'authentification...');
    const userId = await getUserId();
    
    if (!userId) {
      console.error('❌ [1/7] getUserId returned null - user not authenticated or demo mode');
      // Vérifier si c'est un utilisateur démo
      const session = await getSession();
      console.log('📝 Session dans API invite:', session?.user?.id, session?.user?.email);
      
      const isDemo = session?.user?.id === 'demo-user-id' || 
                     (session?.user?.id?.startsWith('demo-') && session?.user?.email === 'demo@photify.app');
      
      if (isDemo) {
        console.log('Mode démo détecté dans API invite');
        return NextResponse.json(
          { error: 'Cette fonctionnalité n\'est pas disponible en mode démo. Veuillez vous connecter avec un compte admin.' },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: 'Non authentifié. Veuillez vous connecter.' },
        { status: 401 }
      );
    }
    
    console.log('✅ [1/7] Utilisateur authentifié - User ID:', userId);

    // Vérifier que l'utilisateur est admin (ou créer l'utilisateur s'il n'existe pas)
    console.log('📝 [2/7] Vérification/récupération de l\'utilisateur dans la base de données...');
    let user;
    try {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, role, email, name')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('❌ [2/7] Erreur récupération utilisateur:', userError);
        console.error('   Code:', userError.code);
        console.error('   Message:', userError.message);
        // Si l'utilisateur n'existe pas, le créer avec le rôle admin
        if (userError.code === 'PGRST116') {
          console.log('📝 [2/7] Utilisateur n\'existe pas, création en cours...');
          const { data: newUser, error: createError } = await supabaseAdmin
            .from('users')
            .insert({
              id: userId,
              role: 'admin',
              email: 'admin@photify.app',
              name: 'Admin',
            })
            .select()
            .single();

          if (createError && !createError.message.includes('duplicate')) {
            console.error('❌ [2/7] Erreur création utilisateur:', createError);
            return NextResponse.json(
              { error: 'Erreur de connexion à la base de données', details: createError.message },
              { status: 500 }
            );
          }
          console.log('✅ [2/7] Utilisateur créé avec succès');
          user = newUser;
        } else {
          console.error('❌ [2/7] Erreur inconnue lors de la récupération utilisateur');
          return NextResponse.json(
            { error: 'Erreur de connexion à la base de données', details: userError.message },
            { status: 500 }
          );
        }
      } else {
        console.log('✅ [2/7] Utilisateur trouvé:', { id: userData.id, role: userData.role, email: userData.email });
        user = userData;
        // Mettre à jour le rôle si ce n'est pas admin
        if (user && user.role !== 'admin') {
          console.log('📝 [2/7] Mise à jour du rôle en admin...');
          await supabaseAdmin
            .from('users')
            .update({ role: 'admin' })
            .eq('id', userId);
        }
      }
    } catch (dbError: any) {
      console.error('❌ [2/7] Erreur base de données (catch):', dbError);
      console.error('   Message:', dbError.message);
      console.error('   Stack:', dbError.stack);
      return NextResponse.json(
        { error: 'Erreur de connexion à la base de données', details: dbError.message },
        { status: 500 }
      );
    }

    console.log('📝 [3/7] Parsing et validation des données de la requête...');
    const body = await request.json();
    console.log('   Données reçues:', JSON.stringify(body, null, 2));
    const validatedData = InvitePartnerSchema.parse(body);
    console.log('✅ [3/7] Données validées:', JSON.stringify(validatedData, null, 2));

    console.log('📝 [4/7] Génération/préparation de l\'email...');
    // Générer un email basé sur le nom, le company_name, ou utiliser l'email fourni
    let emailToUse = validatedData.email;
    
    if (!emailToUse) {
      // Si un nom est fourni, l'utiliser
      if (validatedData.name) {
        const sanitizedName = validatedData.name.trim().toLowerCase().replace(/\s+/g, '.');
        emailToUse = `${sanitizedName}@partner.local`;
        console.log('   Email généré à partir du nom:', emailToUse);
      } 
      // Sinon, générer un email basé sur le nom de l'entreprise
      else if (validatedData.company_name) {
        const sanitizedCompany = validatedData.company_name.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
        emailToUse = `${sanitizedCompany}@partner.local`;
        console.log('   Email généré à partir du nom d\'entreprise:', emailToUse);
      }
    } else {
      console.log('   Email fourni directement:', emailToUse);
    }

    if (!emailToUse) {
      console.error('❌ [4/7] Impossible de générer un email');
      return NextResponse.json(
        { error: 'Impossible de générer un email. Veuillez fournir un email, un nom, ou un nom d\'entreprise.' },
        { status: 400 }
      );
    }
    console.log('✅ [4/7] Email à utiliser:', emailToUse);

    console.log('📝 [5/7] Vérification des invitations existantes...');
    // Vérifier si une invitation existe déjà pour cet email
    const { data: existingInvitation, error: checkError } = await supabaseAdmin
      .from('partner_invitations')
      .select('id, status')
      .eq('email', emailToUse)
      .eq('admin_id', userId)
      .eq('status', 'pending')
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ [5/7] Erreur lors de la vérification:', checkError);
    } else if (existingInvitation) {
      console.log('⚠️  [5/7] Invitation existante trouvée:', existingInvitation.id);
    } else {
      console.log('✅ [5/7] Aucune invitation en cours pour cet email');
    }

    if (existingInvitation) {
      console.error('❌ [5/7] Invitation déjà en cours');
      return NextResponse.json(
        { error: 'Une invitation est déjà en cours pour cet email' },
        { status: 400 }
      );
    }

    console.log('📝 [6/7] Vérification si l\'utilisateur est déjà partenaire...');
    // Vérifier si l'utilisateur est déjà partenaire
    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', emailToUse)
      .single();
    
    if (userCheckError && userCheckError.code !== 'PGRST116') {
      console.error('❌ [6/7] Erreur lors de la vérification utilisateur:', userCheckError);
    } else if (existingUser) {
      console.log('📝 [6/7] Utilisateur existant trouvé, vérification de la relation...');
      
      // Vérifier si une relation existe déjà
      const { data: existingRelationship, error: relCheckError } = await supabaseAdmin
        .from('partner_relationships')
        .select('id')
        .eq('admin_id', userId)
        .eq('partner_id', existingUser.id)
        .eq('is_active', true)
        .single();

      if (relCheckError && relCheckError.code !== 'PGRST116') {
        console.error('❌ [6/7] Erreur lors de la vérification relation:', relCheckError);
      } else if (existingRelationship) {
        console.error('❌ [6/7] Relation existante trouvée');
        return NextResponse.json(
          { error: 'Cet utilisateur est déjà votre partenaire' },
          { status: 400 }
        );
      } else {
        console.log('✅ [6/7] Aucune relation existante');
      }
    } else {
      console.log('✅ [6/7] Aucun utilisateur existant avec cet email');
    }

    console.log('📝 [7/7] Génération du token et création de l\'invitation...');
    // Générer un token unique
    const token = crypto.randomBytes(32).toString('hex');
    console.log('   Token généré:', token.substring(0, 16) + '...');

    // Date d'expiration : 7 jours
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    console.log('   Expiration:', expiresAt.toISOString());

    // Récupérer la connexion Shopify si shop_domain fourni
    let shopifyConnectionId: string | undefined = undefined;
    if (validatedData.shop_domain) {
      console.log('   Vérification connexion Shopify pour:', validatedData.shop_domain);
      const { data: connection } = await supabaseAdmin
        .from('shopify_connections')
        .select('id')
        .eq('user_id', userId)
        .eq('shop_domain', validatedData.shop_domain)
        .eq('is_active', true)
        .single();

      if (connection) {
        shopifyConnectionId = connection.id;
        console.log('   Connexion Shopify trouvée:', shopifyConnectionId);
      }
    }

    // Créer l'invitation
    let invitationData: any = {
      admin_id: userId,
      email: emailToUse,
      token,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
      company_name: validatedData.company_name,
    };

    console.log('   Données à insérer:', JSON.stringify(invitationData, null, 2));
    console.log('   Tentative d\'insertion dans partner_invitations...');

    const { data: invitation, error } = await supabaseAdmin
      .from('partner_invitations')
      .insert(invitationData)
      .select()
      .single();

    if (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ [7/7] ERREUR LORS DE LA CRÉATION DE L\'INVITATION');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Code erreur:', error.code);
      console.error('Message erreur:', error.message);
      console.error('Détails erreur:', error.details);
      console.error('Hint erreur:', error.hint);
      console.error('Données tentées:', JSON.stringify(invitationData, null, 2));
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Vérifier si c'est une erreur de colonne manquante
      const errorMessage = error.message || String(error);
      const errorCode = error.code || '';
      const errorDetails = error.details || '';
      const errorHint = error.hint || '';
      
      // Détecter différentes formes d'erreurs de colonne manquante PostgreSQL
      // Code 42703 = undefined_column, 42P01 = undefined_table
      const errorMessageLower = errorMessage.toLowerCase();
      const errorDetailsLower = (errorDetails || '').toLowerCase();
      const errorHintLower = (errorHint || '').toLowerCase();
      
      const isColumnError = 
        errorCode === '42703' || // undefined_column
        errorCode === '42P01' || // undefined_table
        errorMessageLower.includes('column') && (
          errorMessageLower.includes('company_name') ||
          errorMessageLower.includes('does not exist') ||
          errorMessageLower.includes('n\'existe pas')
        ) ||
        errorDetailsLower.includes('company_name') ||
        errorHintLower.includes('company_name') ||
        (errorMessageLower.includes('does not exist') && errorDetailsLower.includes('column'));
      
      if (isColumnError) {
        return NextResponse.json(
          { 
            success: false,
            error: 'La colonne company_name n\'existe pas dans la table partner_invitations.',
            details: 'Cette colonne est requise pour créer des invitations partenaires.',
            solution: 'Exécutez le script SQL suivant dans Supabase SQL Editor:',
            sql: `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'partner_invitations' 
    AND column_name = 'company_name'
  ) THEN
    ALTER TABLE partner_invitations 
    ADD COLUMN company_name VARCHAR(255);
    
    CREATE INDEX IF NOT EXISTS idx_partner_invitations_company 
    ON partner_invitations(company_name);
  END IF;
END $$;`,
            migration_file: 'database/fix_company_name.sql',
            instructions: [
              '1. Allez sur votre Supabase Dashboard',
              '2. Ouvrez le SQL Editor',
              '3. Copiez-collez le SQL ci-dessus (champ "sql")',
              '4. Exécutez la requête',
              '5. Rechargez cette page et réessayez'
            ],
            error_code: errorCode,
            error_message: errorMessage,
            error_hint: errorHint
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Erreur lors de la création de l\'invitation',
          details: errorMessage,
          error_code: errorCode,
          hint: errorHint
        },
        { status: 500 }
      );
    }

    console.log('✅ [7/7] Invitation créée avec succès!');
    console.log('   ID invitation:', invitation.id);
    
    // Générer le lien à partager avec le partenaire
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const partnerLink = `${appUrl}/partner/${token}/register`;
    console.log('   Lien partenaire:', partnerLink);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ [API /partners/invite] Requête terminée avec succès');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return NextResponse.json({
      success: true,
      data: {
        invitation_id: invitation.id,
        email: invitation.email,
        name: validatedData.name || null,
        company_name: validatedData.company_name,
        expires_at: invitation.expires_at,
        token: token, // Pour afficher dans l'interface admin
        partner_link: partnerLink, // Lien à partager avec le partenaire
      },
      message: 'Invitation créée avec succès',
    });

  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ [API /partners/invite] ERREUR GLOBALE (catch)');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Type erreur:', typeof error);
    console.error('Message:', error?.message);
    console.error('Stack trace:', error?.stack);
    console.error('Erreur complète:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Données invalides', 
          details: error.errors 
        },
        { status: 400 }
      );
    }

    // Vérifier si c'est une erreur Supabase non capturée
    const errorMessage = error?.message || String(error);
    const errorMessageLower = errorMessage.toLowerCase();
    
    // Détecter les erreurs de colonne manquante même dans le catch global
    if (
      errorMessageLower.includes('column') && 
      (errorMessageLower.includes('company_name') || 
       errorMessageLower.includes('does not exist') ||
       errorMessageLower.includes('n\'existe pas'))
    ) {
      return NextResponse.json(
        { 
          success: false,
          error: 'La colonne company_name n\'existe pas dans la table partner_invitations.',
          details: 'Cette colonne est requise pour créer des invitations partenaires.',
          solution: 'Exécutez le script SQL suivant dans Supabase SQL Editor:',
          sql: `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'partner_invitations' 
    AND column_name = 'company_name'
  ) THEN
    ALTER TABLE partner_invitations 
    ADD COLUMN company_name VARCHAR(255);
    
    CREATE INDEX IF NOT EXISTS idx_partner_invitations_company 
    ON partner_invitations(company_name);
  END IF;
END $$;`,
          instructions: [
            '1. Allez sur votre Supabase Dashboard',
            '2. Ouvrez le SQL Editor',
            '3. Copiez-collez le SQL ci-dessus (champ "sql")',
            '4. Exécutez la requête',
            '5. Rechargez cette page et réessayez'
          ],
          error_message: errorMessage
        },
        { status: 500 }
      );
    }

    const errorResponse = formatApiError(error, 'POST /api/partners/invite');
    return NextResponse.json(
      {
        success: false,
        ...errorResponse
      },
      { status: 500 }
    );
  }
}

