// ============================================
// Script: Créer un compte admin
// ============================================
// Usage: npx ts-node scripts/create-admin.ts <email> <password> [name]

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import * as readline from 'readline';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erreur: Variables d\'environnement manquantes');
  console.error('   NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdmin(email: string, password: string, name?: string) {
  try {
    console.log(`\n🔐 Création du compte admin...`);
    console.log(`   Email: ${email}`);
    console.log(`   Nom: ${name || email.split('@')[0]}`);

    // Vérifier si l'utilisateur existe déjà
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, role, email')
      .eq('email', email)
      .single();

    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.log(`\n⚠️  L'utilisateur ${email} est déjà admin`);
        return;
      }

      // Promouvoir en admin
      console.log(`\n📈 Promotion de l'utilisateur existant en admin...`);
      const passwordHash = await bcrypt.hash(password, 10);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          role: 'admin',
          password_hash: passwordHash,
        })
        .eq('id', existingUser.id);

      if (updateError) {
        console.error('❌ Erreur:', updateError);
        process.exit(1);
      }

      console.log(`\n✅ Utilisateur promu admin avec succès !`);
      console.log(`   ID: ${existingUser.id}`);
      return;
    }

    // Créer un nouvel admin
    const passwordHash = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email,
        name: name || email.split('@')[0],
        password_hash: passwordHash,
        role: 'admin',
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur:', error);
      process.exit(1);
    }

    console.log(`\n✅ Compte admin créé avec succès !`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nom: ${user.name}`);
    console.log(`   Rôle: ${user.role}`);
    console.log(`\n🔗 Vous pouvez maintenant vous connecter sur http://localhost:3000/auth/login`);

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

// Mode interactif si aucun argument
async function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(query, resolve);
    });
  };

  try {
    console.log('\n🔐 Création d\'un compte admin\n');
    const email = await question('Email: ');
    const password = await question('Mot de passe (min 6 caractères): ');
    const name = await question('Nom (optionnel): ');

    if (!email || !password) {
      console.error('❌ Email et mot de passe sont requis');
      process.exit(1);
    }

    if (password.length < 6) {
      console.error('❌ Le mot de passe doit faire au moins 6 caractères');
      process.exit(1);
    }

    await createAdmin(email, password, name || undefined);
  } finally {
    rl.close();
  }
}

// Mode ligne de commande
const args = process.argv.slice(2);

if (args.length === 0) {
  interactiveMode();
} else if (args.length >= 2) {
  const [email, password, name] = args;
  createAdmin(email, password, name);
} else {
  console.error('Usage: npx ts-node scripts/create-admin.ts <email> <password> [name]');
  console.error('   Ou sans arguments pour le mode interactif');
  process.exit(1);
}



