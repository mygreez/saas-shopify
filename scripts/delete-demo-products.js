// Script pour supprimer les produits de démonstration "ff"
// Usage: node scripts/delete-demo-products.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('Assurez-vous que NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont définies dans .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteDemoProducts() {
  try {
    console.log('🔍 Recherche des produits de démonstration "ff" avec prix 12€...');
    
    // Récupérer d'abord les produits pour voir ce qui sera supprimé
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, price, user_id, created_at')
      .eq('name', 'ff')
      .eq('price', 12);

    if (fetchError) {
      console.error('❌ Erreur lors de la récupération:', fetchError);
      process.exit(1);
    }

    if (!products || products.length === 0) {
      console.log('✅ Aucun produit de démonstration trouvé');
      return;
    }

    console.log(`📦 ${products.length} produit(s) trouvé(s):`);
    products.forEach((p, i) => {
      console.log(`   ${i + 1}. ID: ${p.id}, Nom: ${p.name}, Prix: ${p.price}€, Créé: ${p.created_at}`);
    });

    // Supprimer les produits
    const { data: deletedProducts, error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('name', 'ff')
      .eq('price', 12)
      .select();

    if (deleteError) {
      console.error('❌ Erreur lors de la suppression:', deleteError);
      process.exit(1);
    }

    console.log(`✅ ${deletedProducts?.length || 0} produit(s) supprimé(s) avec succès`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

deleteDemoProducts();

