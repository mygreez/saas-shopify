// ============================================
// API: Statistiques des partenaires (Admin)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est admin
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accès refusé : Admin requis' },
        { status: 403 }
      );
    }

    // Récupérer toutes les invitations de cet admin
    const { data: allInvitations } = await supabaseAdmin
      .from('partner_invitations')
      .select('id, status')
      .eq('admin_id', userId);

    const invitationIds = allInvitations?.map(inv => inv.id) || [];

    // Récupérer toutes les soumissions pour ces invitations
    const { data: allSubmissions, error: submissionsError } = invitationIds.length > 0
      ? await supabaseAdmin
          .from('partner_submissions')
          .select('id, status, invitation_id')
          .in('invitation_id', invitationIds)
      : { data: [], error: null };

    // Créer un Set des invitation_ids qui ont une soumission (partenaires inscrits)
    const invitationsWithSubmissions = new Set<string>();
    if (allSubmissions && allSubmissions.length > 0) {
      allSubmissions.forEach((sub: any) => {
        if (sub.invitation_id) {
          invitationsWithSubmissions.add(sub.invitation_id);
        }
      });
    }

    // Compter les partenaires inscrits : invitations qui ont au moins une soumission
    // (même si le statut de l'invitation est 'pending', si une soumission existe, c'est qu'ils ont commencé)
    const partnersCount = invitationsWithSubmissions.size;

    // Compter les invitations en attente : invitations qui n'ont PAS de soumission
    // (pas encore commencé le processus)
    const pendingInvitationsCount = (allInvitations?.length || 0) - partnersCount;

    // Compter les produits créés par les partenaires
    // Les produits sont liés aux soumissions via products.raw_data->>submission_id
    // Utiliser la même méthode que dans app/api/dashboard/companies/[id]/route.ts
    let totalProducts = 0;
    const submissionsWithProducts = new Set<string>();
    
    if (allSubmissions && allSubmissions.length > 0) {
      const submissionIds = allSubmissions.map(sub => sub.id);
      console.log('📊 [Stats] Submission IDs à rechercher:', submissionIds);
      
      // Pour chaque submission, compter les produits
      // Note: On utilise .filter() sur raw_data->>submission_id comme dans les autres APIs
      const productCounts = await Promise.all(
        submissionIds.map(async (submissionId: string) => {
          try {
            // Méthode 1: Essayer avec la colonne submission_id directe (si migration appliquée)
            const { count: countByColumn, error: errorColumn } = await supabaseAdmin
              .from('products')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', userId)
              .eq('submission_id', submissionId);
            
            if (!errorColumn && countByColumn !== null && countByColumn > 0) {
              console.log(`✅ [Stats] Submission ${submissionId}: ${countByColumn} produits (via colonne submission_id)`);
              return { submissionId, count: countByColumn };
            }
            
            // Méthode 2: Utiliser raw_data->>submission_id (méthode standard)
            const { count: countByRawData, error: errorRawData } = await supabaseAdmin
              .from('products')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', userId)
              .filter('raw_data->>submission_id', 'eq', submissionId);
            
            if (!errorRawData && countByRawData !== null && countByRawData > 0) {
              console.log(`✅ [Stats] Submission ${submissionId}: ${countByRawData} produits (via raw_data)`);
              return { submissionId, count: countByRawData };
            }
            
            // Si aucune méthode n'a fonctionné, retourner 0
            return { submissionId, count: 0 };
          } catch (err: any) {
            console.error(`❌ [Stats] Erreur pour submission ${submissionId}:`, err);
            return { submissionId, count: 0 };
          }
        })
      );
      
      // Calculer le total et créer le Set
      productCounts.forEach(({ submissionId, count }) => {
        if (count > 0) {
          totalProducts += count;
          submissionsWithProducts.add(submissionId);
        }
      });
      
      console.log('📊 [Stats] Total produits trouvés:', totalProducts, 'pour', submissionsWithProducts.size, 'soumissions');
    }

    // Compter les soumissions complétées
    // Une soumission est complétée si :
    // 1. Elle a le statut submitted ou confirmed
    // 2. OU elle a au moins un produit (step 3 complété)
    let completedSubmissions = 0;
    if (allSubmissions && allSubmissions.length > 0) {
      // Utiliser le Set submissionsWithProducts déjà créé ci-dessus
      completedSubmissions = allSubmissions.filter((sub: any) => {
        // Statut submitted ou confirmed
        if (sub.status === 'submitted' || sub.status === 'confirmed') {
          return true;
        }
        // Ou a au moins un produit (step 3 complété)
        if (submissionsWithProducts.has(sub.id)) {
          return true;
        }
        return false;
      }).length;
    }

    return NextResponse.json({
      success: true,
      data: {
        partnersInscrits: partnersCount || 0,
        produitsCrees: totalProducts,
        invitationsEnAttente: pendingInvitationsCount || 0,
        soumissionsCompletees: completedSubmissions,
      }
    });

  } catch (error: any) {
    console.error('Erreur récupération statistiques:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}

