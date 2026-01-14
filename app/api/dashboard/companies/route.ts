// ============================================
// API: Liste des entreprises avec soumissions (Admin)
// ============================================
// Permet à un admin de voir toutes les entreprises avec leurs soumissions et produits

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [GET /api/dashboard/companies] Début');
    
    // Récupérer les paramètres de pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;
    
    const userId = await getUserId();
    console.log('   userId récupéré:', userId, 'type:', typeof userId);
    
    if (!userId) {
      console.error('❌ userId est null/undefined');
      return NextResponse.json(
        { 
          success: false,
          error: 'Non authentifié' 
        },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est admin
    console.log('🔍 Vérification rôle admin pour userId:', userId);
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ Erreur récupération user:', userError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Erreur lors de la vérification de l\'utilisateur',
          details: process.env.NODE_ENV === 'development' ? userError.message : undefined
        },
        { status: 500 }
      );
    }

    if (!user || user.role !== 'admin') {
      console.warn('⚠️ Utilisateur non admin:', { userId, role: user?.role });
      return NextResponse.json(
        { 
          success: false,
          error: 'Accès refusé : Admin requis' 
        },
        { status: 403 }
      );
    }

    console.log('✅ Utilisateur admin confirmé');

    // Récupérer toutes les invitations de cet admin
    console.log('🔍 Récupération invitations pour admin:', userId);
    console.log('   Type userId:', typeof userId);
    
    // Essayer d'abord une requête simple pour vérifier que la table existe
    const { data: testInvitations, error: testError } = await supabaseAdmin
      .from('partner_invitations')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Erreur test table partner_invitations:', testError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Erreur d\'accès à la table partner_invitations',
          details: {
            message: testError.message,
            code: testError.code,
            details: testError.details,
            hint: testError.hint
          }
        },
        { status: 500 }
      );
    }
    
    console.log('✅ Table accessible, test réussi');
    
    // Essayer sans filtre d'abord pour voir toutes les invitations
    const { data: allInvitationsTest, error: allTestError } = await supabaseAdmin
      .from('partner_invitations')
      .select('id, admin_id, company_name')
      .limit(5);
    
    if (!allTestError && allInvitationsTest) {
      console.log('   Test sans filtre: ', allInvitationsTest.length, 'invitations trouvées');
      console.log('   Exemples admin_id:', allInvitationsTest.map((inv: any) => ({ id: inv.id, admin_id: inv.admin_id, type: typeof inv.admin_id })));
    }
    
    // Vérifier si la colonne contact_name existe en essayant de la sélectionner
    // On utilise une requête simple pour détecter l'erreur
    let hasContactName = false;
    try {
      const { error: testContactNameError } = await supabaseAdmin
        .from('partner_invitations')
        .select('contact_name')
        .limit(1);
      hasContactName = !testContactNameError;
      console.log('   Colonne contact_name existe:', hasContactName);
    } catch (err: any) {
      console.log('   Colonne contact_name n\'existe pas (erreur attendue)');
      hasContactName = false;
    }
    
    // Maintenant récupérer les invitations de cet admin
    let invitations: any[] | null = null;
    let invitationsError: any = null;
    
    // Construire la liste des colonnes à sélectionner
    const selectColumns = hasContactName 
      ? 'id, company_name, email, contact_name, created_at, admin_id'
      : 'id, company_name, email, created_at, admin_id';
    
    // Compter le total d'invitations pour la pagination
    const { count: totalCount } = await supabaseAdmin
      .from('partner_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('admin_id', userId);
    
    // Essayer avec userId tel quel d'abord (UUID)
    const result1 = await supabaseAdmin
      .from('partner_invitations')
      .select(selectColumns)
      .eq('admin_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
      if (result1.error) {
      console.error('❌ Erreur récupération invitations avec userId direct:', result1.error);
      // Essayer avec String(userId)
      const result2 = await supabaseAdmin
        .from('partner_invitations')
        .select(selectColumns)
        .eq('admin_id', String(userId))
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (result2.error) {
        console.error('❌ Erreur récupération invitations avec String(userId):', result2.error);
        invitationsError = result2.error;
      } else {
        console.log('✅ Récupération réussie avec String(userId)');
        invitations = result2.data;
      }
    } else {
      console.log('✅ Récupération réussie avec userId direct');
      invitations = result1.data;
    }

    if (invitationsError) {
      // Vérifier si l'erreur est liée à la colonne contact_name manquante
      const isContactNameError = invitationsError.message?.includes('contact_name does not exist');
      
      const errorDetails: any = {
        message: invitationsError.message || 'Erreur inconnue',
        code: invitationsError.code || 'UNKNOWN',
        hint: invitationsError.hint || null,
        userId: String(userId),
        userIdType: typeof userId,
        testQueryResult: allInvitationsTest ? `Table accessible, ${allInvitationsTest.length} invitations en test` : 'Table non accessible',
      };
      
      // Ajouter les détails si disponibles
      if (invitationsError.details) {
        errorDetails.details = invitationsError.details;
      }
      
      // Message d'erreur personnalisé si c'est la colonne contact_name
      let errorMessage = 'Erreur lors de la récupération des invitations';
      if (isContactNameError) {
        errorMessage = 'Colonne contact_name manquante. Veuillez exécuter la migration SQL : database/migration_add_contact_name.sql';
        errorDetails.migrationRequired = true;
        errorDetails.migrationFile = 'database/migration_add_contact_name.sql';
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: errorMessage,
          details: errorDetails
        },
        { status: 500 }
      );
    }

    console.log('✅ Invitations récupérées:', invitations?.length || 0);
    
    // Récupérer toutes les soumissions pour ces invitations
    const invitationIds = (invitations || []).map((inv: any) => inv.id);
    let submissionsMap: Record<string, any> = {};
    
    if (invitationIds.length > 0) {
      const { data: submissions, error: submissionsError } = await supabaseAdmin
        .from('partner_submissions')
        .select('id, invitation_id, status, created_at, updated_at, brand_id')
        .in('invitation_id', invitationIds);
      
      if (submissionsError) {
        console.error('⚠️ Erreur récupération soumissions:', submissionsError);
      } else {
        // Récupérer les brands séparément
        const brandIds = [...new Set((submissions || []).map((s: any) => s.brand_id).filter(Boolean))];
        let brandsMap: Record<string, any> = {};
        
        if (brandIds.length > 0) {
          const { data: brands, error: brandsError } = await supabaseAdmin
            .from('brands')
            .select('id, name, contact_email, logo_url, description')
            .in('id', brandIds);
          
          if (!brandsError && brands) {
            brands.forEach((brand: any) => {
              brandsMap[brand.id] = brand;
            });
          }
        }
        
        // Créer un map pour accès rapide avec les brands
        (submissions || []).forEach((sub: any) => {
          submissionsMap[sub.invitation_id] = {
            ...sub,
            brand: sub.brand_id ? brandsMap[sub.brand_id] || null : null,
          };
          console.log(`   Submission ${sub.id} pour invitation ${sub.invitation_id}: status=${sub.status}, brand_id=${sub.brand_id}`);
        });
        console.log('✅ Soumissions récupérées:', submissions?.length || 0);
      }
    }

    // OPTIMISATION: Récupérer tous les produits en une seule requête au lieu de N requêtes
    // Récupérer tous les produits et les grouper par submission_id en mémoire
    const submissionIds = Object.values(submissionsMap).map((s: any) => s.id).filter(Boolean);
    const productCountsBySubmission: Record<string, number> = {};
    
    if (submissionIds.length > 0) {
      try {
        // Récupérer tous les produits en une seule requête
        const { data: allProducts, error: productsError } = await supabaseAdmin
          .from('products')
          .select('id, raw_data');
        
        if (!productsError && allProducts) {
          // Grouper les produits par submission_id
          allProducts.forEach((product: any) => {
            const submissionId = product.raw_data?.submission_id;
            if (submissionId && submissionIds.includes(submissionId)) {
              productCountsBySubmission[submissionId] = (productCountsBySubmission[submissionId] || 0) + 1;
            }
          });
        } else if (productsError) {
          console.warn('Erreur récupération produits:', productsError);
        }
      } catch (countErr: any) {
        console.error('Erreur lors du comptage des produits:', countErr);
      }
    }

    // Pour chaque invitation, préparer les données (sans requêtes supplémentaires)
    const companies = (invitations || []).map((invitation: any) => {
        const submission = submissionsMap[invitation.id] || null;
        
        // Utiliser le comptage pré-calculé
        const productCount = submission ? (productCountsBySubmission[submission.id] || 0) : 0;

        // Déterminer le statut réel basé sur les données disponibles
        let actualStatus = null;
        if (submission) {
          actualStatus = submission.status;
          
          // Vérifier si le statut step2_completed est cohérent avec les données
          // Step 2 est complété seulement si :
          // 1. Le statut est step2_completed
          // 2. Il y a un brand_id
          // 3. Le brand a des informations complètes (au moins logo ou description)
          if (submission.status === 'step2_completed') {
            const hasBrand = submission.brand_id && submission.brand;
            const hasBrandData = hasBrand && (
              submission.brand.logo_url || 
              submission.brand.description || 
              submission.brand.lifestyle_image_url
            );
            
            if (!hasBrand || !hasBrandData) {
              console.warn(`⚠️ Statut step2_completed mais données incomplètes pour submission ${submission.id}, correction en step1_completed`);
              console.warn(`   brand_id: ${submission.brand_id}, hasBrand: ${hasBrand}, hasBrandData: ${hasBrandData}`);
              actualStatus = 'step1_completed';
            }
          }
        }

        return {
          invitation_id: invitation.id,
          company_name: invitation.company_name || submission?.brand?.name || 'Sans nom',
          email: invitation.email || submission?.brand?.contact_email || '',
          contact_name: hasContactName ? (invitation.contact_name || null) : null,
          created_at: invitation.created_at,
          submission: submission ? {
            id: submission.id,
            status: actualStatus || submission.status,
            created_at: submission.created_at,
            updated_at: submission.updated_at,
            brand: submission.brand,
            product_count: productCount,
          } : null,
        };
      });

    console.log('✅ Companies préparées:', companies.length);

    // Retourner les entreprises avec pagination
    return NextResponse.json({
      success: true,
      data: companies,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
    });

  } catch (error: any) {
    console.error('Erreur récupération entreprises:', error);
    console.error('Stack trace:', error.stack);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la récupération',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

