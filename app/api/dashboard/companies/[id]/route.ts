// ============================================
// API: Détails d'une entreprise (Admin)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getUserId } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
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
        { success: false, error: 'Accès refusé : Admin requis' },
        { status: 403 }
      );
    }

    const resolvedParams = params instanceof Promise ? await params : params;
    const { id: submissionId } = resolvedParams;

    // Récupérer la soumission avec l'invitation et le brand
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('partner_submissions')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        invitation:partner_invitations!inner(
          id,
          company_name,
          email,
          contact_name,
          created_at,
          admin_id
        ),
        brand:brands(
          id,
          name,
          contact_email,
          logo_url,
          description,
          lifestyle_image_url,
          banner_image_url,
          label_ecoconception,
          wetransfer_link,
          collaboration_reason,
          press_links
        ),
        excel_file_url,
        defects_images_urls
      `)
      .eq('id', submissionId)
      .eq('invitation.admin_id', userId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json(
        { success: false, error: 'Soumission non trouvée' },
        { status: 404 }
      );
    }

    // Récupérer les produits associés à cette submission spécifique
    // Les produits sont liés via product_details.submission_id
    const { data: productDetails, error: productDetailsError } = await supabaseAdmin
      .from('product_details')
      .select(`
        *,
        product:products(*)
      `)
      .eq('submission_id', submissionId);

    // Récupérer aussi les produits liés via raw_data->>'submission_id'
    const { data: productsByRawData, error: productsRawDataError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .filter('raw_data->>submission_id', 'eq', submissionId)
      .order('created_at', { ascending: false });

    // Combiner les produits des deux sources
    const products: any[] = [];
    
    // Ajouter les produits depuis product_details
    if (productDetails && !productDetailsError) {
      productDetails.forEach((detail: any) => {
        if (detail.product) {
          // Parser les images si elles sont en string JSON
          let images = detail.product.images || [];
          if (typeof images === 'string') {
            try {
              images = JSON.parse(images);
            } catch (e) {
              console.warn('Erreur parsing images:', e);
              images = [];
            }
          }
          if (!Array.isArray(images)) {
            images = [];
          }

          products.push({
            ...detail.product,
            images: images, // S'assurer que c'est un tableau
            product_details: {
              title: detail.title,
              sku: detail.sku,
              description: detail.description,
              price_greez_ttc: detail.price_greez_ttc,
              quantity_uvc: detail.quantity_uvc,
            },
          });
        }
      });
    }

    // Ajouter les produits depuis raw_data (sans doublons)
    if (productsByRawData && !productsRawDataError) {
      productsByRawData.forEach((product: any) => {
        // Vérifier si le produit n'est pas déjà dans la liste
        if (!products.find(p => p.id === product.id)) {
          // Parser les images si elles sont en string JSON
          let images = product.images || [];
          if (typeof images === 'string') {
            try {
              images = JSON.parse(images);
            } catch (e) {
              console.warn('Erreur parsing images:', e);
              images = [];
            }
          }
          if (!Array.isArray(images)) {
            images = [];
          }

          products.push({
            ...product,
            images: images, // S'assurer que c'est un tableau
          });
        }
      });
    }

    const productsError = productDetailsError || productsRawDataError;

    if (productsError) {
      console.error('Erreur récupération produits:', productsError);
    }

    return NextResponse.json({
      success: true,
      data: {
        submission: {
          id: submission.id,
          status: submission.status,
          created_at: submission.created_at,
          updated_at: submission.updated_at,
          brand: submission.brand,
          excel_file_url: submission.excel_file_url || null,
          defects_images_urls: submission.defects_images_urls || [],
        },
        invitation: submission.invitation,
        products: products || [],
      },
    });

  } catch (error: any) {
    console.error('Erreur récupération détails entreprise:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erreur lors de la récupération',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
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
        { success: false, error: 'Accès refusé : Admin requis' },
        { status: 403 }
      );
    }

    const resolvedParams = params instanceof Promise ? await params : params;
    const { id: invitation_id } = resolvedParams;

    if (!invitation_id) {
      return NextResponse.json(
        { success: false, error: 'ID d\'invitation manquant' },
        { status: 400 }
      );
    }

    // Vérifier que l'invitation existe et appartient à cet admin
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('partner_invitations')
      .select('id, admin_id')
      .eq('id', invitation_id)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { success: false, error: 'Invitation non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que l'admin est le propriétaire de cette invitation
    if (invitation.admin_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Accès refusé : Cette invitation ne vous appartient pas' },
        { status: 403 }
      );
    }

    // Supprimer l'invitation (cascade supprimera automatiquement les soumissions et relations)
    const { error: deleteError } = await supabaseAdmin
      .from('partner_invitations')
      .delete()
      .eq('id', invitation_id);

    if (deleteError) {
      console.error('Erreur suppression invitation:', deleteError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erreur lors de la suppression',
          details: process.env.NODE_ENV === 'development' ? deleteError.message : undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation supprimée avec succès',
    });

  } catch (error: any) {
    console.error('Erreur suppression invitation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Erreur lors de la suppression',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

