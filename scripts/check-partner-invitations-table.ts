// ============================================
// Script: Vérifier la structure de partner_invitations
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nVeuillez les définir dans .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkTable() {
  console.log('🔍 Vérification de la table partner_invitations...\n');

  try {
    // Vérifier si la table existe
    const { data: tableData, error: tableError } = await supabase
      .from('partner_invitations')
      .select('*')
      .limit(0);

    if (tableError) {
      console.error('❌ Erreur lors de l\'accès à la table:', tableError.message);
      console.error('   Code:', tableError.code);
      console.error('   Détails:', tableError.details);
      console.error('   Hint:', tableError.hint);
      
      if (tableError.message.includes('does not exist') || tableError.code === '42P01') {
        console.log('\n📝 La table partner_invitations n\'existe pas.');
        console.log('   Exécutez d\'abord: database/migration_partners_system.sql\n');
      }
      return;
    }

    console.log('✅ La table partner_invitations existe.\n');

    // Vérifier les colonnes
    console.log('🔍 Vérification des colonnes...\n');
    
    // Tenter d'insérer une ligne de test (sans company_name d'abord)
    const testData: any = {
      admin_id: '00000000-0000-0000-0000-000000000000', // UUID de test
      email: 'test@example.com',
      token: 'test-token-' + Date.now(),
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Tenter avec company_name
    const testDataWithCompany = {
      ...testData,
      company_name: 'Test Company',
    };

    const { error: insertError } = await supabase
      .from('partner_invitations')
      .insert(testDataWithCompany)
      .select();

    if (insertError) {
      console.error('❌ Erreur lors de l\'insertion de test:', insertError.message);
      console.error('   Code:', insertError.code);
      console.error('   Détails:', insertError.details);
      console.error('   Hint:', insertError.hint);
      
      if (
        insertError.message.includes('company_name') ||
        insertError.message.includes('does not exist') ||
        insertError.code === '42703'
      ) {
        console.log('\n📝 La colonne company_name est manquante.\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('SQL à exécuter dans Supabase SQL Editor:\n');
        console.log(`
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
END $$;
        `);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      }
    } else {
      console.log('✅ La colonne company_name existe et fonctionne correctement.\n');
      
      // Nettoyer la ligne de test
      await supabase
        .from('partner_invitations')
        .delete()
        .eq('token', testData.token);
      
      console.log('🧹 Ligne de test supprimée.\n');
    }

    // Lister les colonnes disponibles
    console.log('📋 Colonnes de la table partner_invitations:');
    const { data: sampleData } = await supabase
      .from('partner_invitations')
      .select('*')
      .limit(1);

    if (sampleData && sampleData.length > 0) {
      console.log('   Colonnes trouvées:', Object.keys(sampleData[0]).join(', '));
    } else {
      console.log('   (Aucune donnée pour détecter les colonnes)');
    }

  } catch (error: any) {
    console.error('❌ Erreur fatale:', error.message);
    console.error('   Stack:', error.stack);
  }
}

checkTable()
  .then(() => {
    console.log('✨ Vérification terminée !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

