// ============================================
// API: Désactiver un partenaire (Admin)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getUserId } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId();
    const partnerId = params.id;
    
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

    // Vérifier que la relation existe et appartient à l'admin
    const { data: relationship } = await supabaseAdmin
      .from('partner_relationships')
      .select('id')
      .eq('admin_id', userId)
      .eq('partner_id', partnerId)
      .single();

    if (!relationship) {
      return NextResponse.json(
        { error: 'Relation non trouvée' },
        { status: 404 }
      );
    }

    // Désactiver la relation (soft delete)
    const { error } = await supabaseAdmin
      .from('partner_relationships')
      .update({ is_active: false })
      .eq('id', relationship.id);

    if (error) {
      console.error('Erreur désactivation partenaire:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la désactivation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Partenaire désactivé avec succès',
    });

  } catch (error: any) {
    console.error('Erreur désactivation partenaire:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la désactivation' },
      { status: 500 }
    );
  }
}




