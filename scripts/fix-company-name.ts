// ============================================
// Script: Ajouter company_name à partner_invitations
// ============================================

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Charger les variables d'environnement
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

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

async function fixCompanyName() {
  console.log('🔧 Vérification de la colonne company_name...\n');

  try {
    // Vérifier si la colonne existe
    const { data: checkData, error: checkError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'partner_invitations' 
        AND column_name = 'company_name';
      `,
    });

    // Si la fonction RPC n'existe pas, utiliser une approche alternative
    // Exécuter directement la migration SQL
    const migrationSQL = `
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
          
          RAISE NOTICE 'Colonne company_name ajoutée avec succès';
        ELSE
          RAISE NOTICE 'La colonne company_name existe déjà';
        END IF;
      END $$;
    `;

    // Utiliser la méthode query via REST API (nécessite service role)
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ sql: migrationSQL }),
    });

    if (!response.ok) {
      // Si la fonction RPC n'existe pas, on doit utiliser une autre méthode
      console.log('⚠️  La fonction RPC exec_sql n\'existe pas.');
      console.log('📝 Veuillez exécuter manuellement le script SQL suivant dans Supabase SQL Editor:\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const sqlFile = path.join(process.cwd(), 'database', 'fix_company_name.sql');
      if (fs.existsSync(sqlFile)) {
        const sqlContent = fs.readFileSync(sqlFile, 'utf-8');
        console.log(sqlContent);
      } else {
        console.log(migrationSQL);
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('📌 Instructions:');
      console.log('   1. Allez sur votre Supabase Dashboard');
      console.log('   2. Ouvrez le SQL Editor');
      console.log('   3. Copiez-collez le SQL ci-dessus');
      console.log('   4. Exécutez la requête\n');
      return;
    }

    console.log('✅ Migration exécutée avec succès !');
    console.log('   La colonne company_name a été ajoutée à la table partner_invitations.\n');
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'exécution de la migration:', error.message);
    console.log('\n📝 Veuillez exécuter manuellement le script SQL suivant dans Supabase SQL Editor:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const sqlFile = path.join(process.cwd(), 'database', 'fix_company_name.sql');
    if (fs.existsSync(sqlFile)) {
      const sqlContent = fs.readFileSync(sqlFile, 'utf-8');
      console.log(sqlContent);
    } else {
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
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

fixCompanyName()
  .then(() => {
    console.log('✨ Terminé !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });



