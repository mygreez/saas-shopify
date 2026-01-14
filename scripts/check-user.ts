// ============================================
// Script: Vérifier un utilisateur dans la base de données
// ============================================
// Usage: npx ts-node scripts/check-user.ts <email>

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erreur: Variables d\'environnement manquantes');
  console.error('   NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser(email: string) {
  try {
    console.log(`\n🔍 Recherche de l'utilisateur: ${email}\n`);

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('❌ Utilisateur non trouvé dans la base de données');
        return;
      }
      console.error('❌ Erreur:', error);
      return;
    }

    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return;
    }

    console.log('✅ Utilisateur trouvé !\n');
    console.log('📋 Détails:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nom: ${user.name || 'Non défini'}`);
    console.log(`   Rôle: ${user.role || 'Non défini'}`);
    console.log(`   Mot de passe hashé: ${user.password_hash ? '✅ Oui' : '❌ Non'}`);
    console.log(`   Créé le: ${user.created_at ? new Date(user.created_at).toLocaleString('fr-FR') : 'Non défini'}`);
    console.log(`   Modifié le: ${user.updated_at ? new Date(user.updated_at).toLocaleString('fr-FR') : 'Non défini'}`);

    if (user.role === 'admin') {
      console.log('\n✅ Cet utilisateur est ADMIN et peut se connecter !');
    } else {
      console.log('\n⚠️  Cet utilisateur n\'est PAS admin (rôle: ' + user.role + ')');
      console.log('   Il ne pourra pas se connecter. Pour le promouvoir en admin:');
      console.log(`   ./scripts/create-admin.sh ${email} password123`);
    }

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: npx ts-node scripts/check-user.ts <email>');
  console.error('Exemple: npx ts-node scripts/check-user.ts noemie@greez.fr');
  process.exit(1);
}

checkUser(args[0]);



