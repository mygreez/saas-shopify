// ============================================
// API: Récupérer les produits d'un partenaire via token d'invitation
// ============================================
// Permet de récupérer les produits d'un partenaire en utilisant un token d'invitation

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json(
        { error: 'Token manquant' },
        { status: 400 }
      );
    }

    // 1. Valider le token d'invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('partner_invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 404 }
      );
    }

    // Vérifier que l'invitation n'est pas expirée
    const expiresAt = new Date(invitation.expires_at);
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { error: 'Token expiré' },
        { status: 400 }
      );
    }

    // 2. Trouver la relation partenaire via l'admin_id de l'invitation
    // On cherche les relations où l'admin correspond à celui qui a créé l'invitation
    const { data: relationships, error: relationshipError } = await supabaseAdmin
      .from('partner_relationships')
      .select(`
        id,
        partner_id,
        partner:users!partner_relationships_partner_id_fkey(
          id,
          email,
          name
        )
      `)
      .eq('admin_id', invitation.admin_id)
      .eq('is_active', true);

    if (relationshipError) {
      console.error('Erreur récupération relations:', relationshipError);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des relations' },
        { status: 500 }
      );
    }

    // Si aucune relation n'existe, retourner un tableau vide
    if (!relationships || relationships.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Aucun partenaire trouvé pour ce token',
      });
    }

    // 3. Récupérer les produits de tous les partenaires associés à cet admin
    const partnerIds = relationships.map(rel => rel.partner_id);
    
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('*')
      .in('partner_id', partnerIds)
      .in('status', ['draft', 'pending', 'approved'])
      .order('created_at', { ascending: false });

    if (productsError) {
      console.error('Erreur récupération produits:', productsError);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des produits' },
        { status: 500 }
      );
    }

    // 4. Formater les produits au format attendu par l'interface
    const formattedProducts = (products || []).map((product: any) => ({
      id: product.id,
      name: product.name || '',
      description: product.generated_content?.description || product.raw_data?.description || '',
      images: product.images || [],
      variants: product.variants || [],
      price: product.price || null,
      category: product.category || '',
      material: product.material || '',
      status: product.status || 'draft',
      raw_data: product.raw_data || {},
    }));

    return NextResponse.json({
      success: true,
      data: formattedProducts,
      partner_info: relationships.map(rel => ({
        id: rel.partner.id,
        email: rel.partner.email,
        name: rel.partner.name,
      })),
    });

  } catch (error: any) {
    console.error('Erreur récupération produits partenaire:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des produits' },
      { status: 500 }
    );
  }
}


