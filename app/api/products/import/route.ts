// ============================================
// API: Import de produits depuis CSV/Excel
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/db/supabase';
// @ts-ignore - Types xlsx peuvent être manquants
import * as XLSX from 'xlsx';

// Parser CSV robuste qui gère les guillemets, virgules dans les valeurs, etc.
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Double guillemet = guillemet échappé
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quotes - ne pas ajouter le guillemet au contenu
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Séparateur trouvé hors des guillemets
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  // Ajouter le dernier champ
  result.push(current);
  
  // Nettoyer les champs (supprimer les guillemets de début/fin si présents)
  return result.map(field => {
    let cleaned = field.trim();
    // Si le champ commence et se termine par des guillemets, les supprimer
    if (cleaned.startsWith('"') && cleaned.endsWith('"') && cleaned.length > 1) {
      cleaned = cleaned.slice(1, -1);
    }
    // Remplacer les guillemets échappés par des guillemets simples
    cleaned = cleaned.replace(/""/g, '"');
    return cleaned;
  });
}

// Normaliser les noms de colonnes (supprimer accents, espaces, etc.)
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[é]/g, 'e')
    .replace(/\s+/g, '_') // Remplacer les espaces par des underscores
    .replace(/[^a-z0-9_]/g, '') // Garder seulement lettres, chiffres et underscores
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

// Fonction pour trouver une colonne même si le nom ne correspond pas exactement
function findColumn(productData: Record<string, string>, possibleNames: string[]): string | null {
  // Normaliser les noms possibles
  const normalizedNames = possibleNames.map(n => normalizeHeader(n));
  
  // D'abord chercher une correspondance exacte (normalisée)
  for (const name of normalizedNames) {
    if (productData[name]) {
      return name;
    }
  }
  
  // Chercher une correspondance partielle (contient le nom)
  for (const [key, value] of Object.entries(productData)) {
    for (const name of normalizedNames) {
      // Correspondance exacte
      if (key === name) {
        return key;
      }
      // Correspondance partielle
      if (key.includes(name) || name.includes(key)) {
        return key;
      }
    }
  }
  
  return null;
}

// Parser les images depuis différentes sources
function parseImages(imageData: string): string[] {
  if (!imageData || !imageData.trim()) return [];
  
  const cleaned = imageData.trim();
  
  // Si c'est du JSON
  if (cleaned.startsWith('[') || cleaned.startsWith('{')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed.filter(img => img && typeof img === 'string');
      return [];
    } catch {
      // Pas du JSON valide, continuer
    }
  }
  
  // Séparer par différents séparateurs possibles
  const separators = [';', '|', '\n', '\r\n', ','];
  let images: string[] = [];
  
  for (const sep of separators) {
    if (cleaned.includes(sep)) {
      images = cleaned.split(sep).map(img => img.trim()).filter(img => img);
      break;
    }
  }
  
  // Si pas de séparateur trouvé, prendre la valeur entière
  if (images.length === 0 && cleaned) {
    images = [cleaned];
  }
  
  // Nettoyer les URLs (supprimer les guillemets, espaces)
  return images
    .map(img => img.replace(/^["']|["']$/g, '').trim())
    .filter(img => {
      // Vérifier que c'est une URL valide ou un chemin
      return img && (img.startsWith('http') || img.startsWith('/') || img.includes('.'));
    });
}

// Parser les variantes
function parseVariants(variantData: string, defaultPrice: string): any[] {
  if (!variantData || !variantData.trim()) {
    return [];
  }
  
  const cleaned = variantData.trim();
  
  // Si c'est du JSON
  if (cleaned.startsWith('[')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed.map(v => ({
          title: v.title || v.name || 'Default',
          price: v.price?.toString() || defaultPrice || '0',
          option1: v.option1 || v.size || v.taille,
          option2: v.option2 || v.color || v.couleur,
        }));
      }
    } catch {
      // Pas du JSON valide
    }
  }
  
  // Format simple : "S / Noir;M / Noir" ou "S,Noir;M,Noir" ou juste "S / Noir"
  const separators = [';', '|', '\n'];
  let variantStrings: string[] = [];
  
  for (const sep of separators) {
    if (cleaned.includes(sep)) {
      variantStrings = cleaned.split(sep).map(v => v.trim()).filter(v => v);
      break;
    }
  }
  
  if (variantStrings.length === 0) {
    variantStrings = [cleaned];
  }
  
  return variantStrings.map(v => {
    // Format "S / Noir" ou "S,Noir" ou "S-Noir" ou juste "S" ou "Noir"
    const parts = v.split(/[\/,\-]/).map(p => p.trim()).filter(p => p);
    
    // Si une seule partie, c'est soit option1 soit option2
    if (parts.length === 1) {
      return {
        title: v.trim(),
        price: defaultPrice || '0',
        option1: parts[0] || undefined,
      };
    }
    
    return {
      title: v.trim(),
      price: defaultPrice || '0',
      option1: parts[0] || undefined,
      option2: parts[1] || undefined,
    };
  });
}

// Parser le prix - amélioré pour gérer tous les formats
function parsePrice(priceData: string): number | null {
  if (!priceData) return null;
  
  // Convertir en string et nettoyer
  let cleaned = priceData.toString().trim();
  
  // Supprimer les symboles de devise et espaces
  cleaned = cleaned.replace(/[€$£¥\s]/g, '');
  
  // Gérer les formats avec virgule comme séparateur décimal (ex: "12,50")
  // ou comme séparateur de milliers (ex: "1.234,56" ou "1,234.56")
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Si les deux sont présents, déterminer lequel est le séparateur décimal
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Format européen : "1.234,56"
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Format US : "1,234.56"
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Seulement une virgule - peut être décimal ou milliers
    // Si plus de 3 chiffres après la virgule, c'est probablement un séparateur de milliers
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Format décimal européen : "12,50"
      cleaned = cleaned.replace(',', '.');
    } else {
      // Format milliers : "1,234"
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed)) {
    console.log(`   ⚠️ Prix non parsable: "${priceData}" → "${cleaned}"`);
    return null;
  }
  
  return parsed;
}

// Parser la réduction (peut être un montant ou un pourcentage)
function parseReduction(reductionData: string): number | null {
  if (!reductionData) return null;
  
  const cleaned = reductionData.toString().trim();
  
  // Si ça contient %, c'est un pourcentage
  if (cleaned.includes('%')) {
    const percent = parseFloat(cleaned.replace(/[%\s]/g, '').replace(',', '.'));
    if (!isNaN(percent)) {
      return percent / 100; // Retourner en décimal (0.25 pour 25%)
    }
  }
  
  // Sinon, c'est probablement un montant
  const amount = parsePrice(cleaned);
  return amount;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Rejeter les utilisateurs démo - ils doivent avoir un compte Supabase valide
    if (userId === 'demo-user-id' || userId.startsWith('demo-')) {
      return NextResponse.json(
        { 
          error: 'Mode démo désactivé. Veuillez créer un compte réel pour utiliser cette fonctionnalité.',
          details: ['Le mode démo n\'est plus disponible. Connectez-vous avec un compte valide.']
        },
        { status: 403 }
      );
    }

    // Vérifier que l'utilisateur existe bien dans Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { 
          error: 'Utilisateur non trouvé dans la base de données',
          details: ['Votre compte n\'existe pas dans la base de données. Veuillez vous réinscrire.']
        },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    const confirm = formData.get('confirm') === 'true'; // Si true, créer les produits, sinon juste parser
    const columnMappingStr = formData.get('columnMapping') as string | null;
    const userColumnMapping: Record<string, string> = columnMappingStr ? JSON.parse(columnMappingStr) : {};
    const partnerToken = formData.get('partner_token') as string | null;

    // Si un token partenaire est fourni, valider et récupérer les infos
    let partnerId: string | undefined = undefined;
    let adminUserId = userId;
    
    if (partnerToken) {
      // Valider le token d'invitation
      const { data: invitation } = await supabaseAdmin
        .from('partner_invitations')
        .select('admin_id, email, status, expires_at')
        .eq('token', partnerToken)
        .single();

      if (invitation && invitation.status === 'pending') {
        // Vérifier l'expiration
        if (new Date(invitation.expires_at) > new Date()) {
          adminUserId = invitation.admin_id;
          
          // Trouver le partenaire via l'email de l'invitation
          const { data: partner } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', invitation.email)
            .single();
          
          if (partner) {
            partnerId = partner.id;
          }
        }
      }
    }

    if (!file) {
      console.error('❌ Aucun fichier reçu dans la requête');
      return NextResponse.json(
        { error: 'Aucun fichier fourni. Veuillez sélectionner un fichier Excel (.xlsx ou .xls) ou CSV (.csv)' },
        { status: 400 }
      );
    }

    console.log('📁 Fichier reçu:', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    // Récupérer la première connexion Shopify active (optionnel)
    const { data: connection } = await supabaseAdmin
      .from('shopify_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    const shopifyConnectionId = connection?.id || null;

    // Détecter le type de fichier
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCSV = fileName.endsWith('.csv');

    let rawHeaders: string[] = [];
    let headers: string[] = [];
    let lines: string[] = [];

    if (isExcel) {
      // Parser le fichier Excel
      console.log('📊 Fichier Excel détecté, parsing...');
      
      try {
        const arrayBuffer = await file.arrayBuffer();
        console.log('📊 Taille du buffer:', arrayBuffer.byteLength, 'bytes');
        
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        console.log('📊 Feuilles trouvées:', workbook.SheetNames);
        
        // Prendre la première feuille
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        if (!worksheet) {
          return NextResponse.json(
            { error: 'Impossible de lire la première feuille du fichier Excel' },
            { status: 400 }
          );
        }
        
        // Convertir en JSON avec en-têtes - méthode simple et fiable
        // Utiliser blankrows: true pour inclure TOUTES les lignes, même vides
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          raw: false,
          blankrows: true, // INCLURE les lignes vides pour ne rien manquer
        }) as any[][];

        console.log('📊 Données brutes Excel:', jsonData.length, 'lignes');
        console.log('📊 TOUTES les lignes Excel:');
        jsonData.forEach((row, idx) => {
          const hasValues = row && Array.isArray(row) && row.some(cell => {
            const str = String(cell || '').trim();
            return str !== '' && str !== 'undefined' && str !== 'null';
          });
          console.log(`   Ligne ${idx} (Excel ligne ${idx + 1}):`, JSON.stringify(row));
          console.log(`   Ligne ${idx} a des valeurs:`, hasValues);
          if (row && Array.isArray(row)) {
            console.log(`   Ligne ${idx} longueur:`, row.length, 'colonnes');
          }
        });

        if (jsonData.length === 0) {
          return NextResponse.json(
            { error: 'Le fichier Excel est vide ou ne contient aucune donnée' },
            { status: 400 }
          );
        }

        // Première ligne = en-têtes
        rawHeaders = (jsonData[0] as string[]).map(h => String(h || '').trim());
        headers = rawHeaders.map(h => normalizeHeader(h));
        
        console.log('📊 En-têtes Excel détectés:', rawHeaders);

        // Convertir les lignes suivantes en format CSV-like pour le traitement
        console.log(`📊 Conversion de ${jsonData.length - 1} lignes de données Excel...`);
        console.log(`📊 Total lignes dans jsonData: ${jsonData.length} (index 0 = en-tête, index 1-${jsonData.length - 1} = données)`);
        console.log(`📊 ATTENTION: On va traiter les lignes de l'index 1 à ${jsonData.length - 1}`);
        let excelLinesProcessed = 0;
        let excelLinesSkipped = 0;
        for (let i = 1; i < jsonData.length; i++) {
          console.log(`\n🔄 ========== CONVERSION LIGNE EXCEL ${i + 1} (index ${i}) ==========`);
          const row = jsonData[i] as any[];
          console.log(`   Row type:`, typeof row, Array.isArray(row));
          console.log(`   Row length:`, row ? row.length : 'null');
          console.log(`   Row complet:`, JSON.stringify(row));
          
          // TOUJOURS TRAITER LA LIGNE, même si elle semble invalide
          // Si la ligne n'existe pas ou n'est pas un tableau, créer un tableau vide
          let processedRow: any[] = [];
          if (!row || !Array.isArray(row)) {
            console.log(`⚠️ Ligne Excel ${i + 1} (index ${i}) n'est pas un tableau valide, création d'un tableau vide`);
            processedRow = [];
          } else {
            processedRow = row;
          }
          
          console.log(`✅ Ligne Excel ${i + 1} (index ${i}) sera traitée (même si elle semble vide)`);
          
          // Vérifier si la ligne a des valeurs (pour logging seulement)
          const hasAnyValue = row.some((cell, cellIdx) => {
            // Accepter les valeurs numériques (y compris 0)
            if (typeof cell === 'number' && !isNaN(cell)) {
              console.log(`   ✅ Cellule [${cellIdx}] a une valeur numérique: ${cell}`);
              return true;
            }
            // Accepter les booléens (y compris false)
            if (typeof cell === 'boolean') {
              console.log(`   ✅ Cellule [${cellIdx}] a une valeur booléenne: ${cell}`);
              return true;
            }
            const str = String(cell || '').trim();
            const isValid = str !== '' && str !== 'undefined' && str !== 'null' && str !== 'NaN';
            if (isValid) {
              console.log(`   ✅ Cellule [${cellIdx}] a une valeur texte: "${str.substring(0, 50)}"`);
            }
            return isValid;
          });
          
          if (!hasAnyValue) {
            console.log(`⚠️ Ligne Excel ${i + 1} (index ${i}) semble vide, mais sera quand même traitée`);
            console.log(`   Détail ligne:`, JSON.stringify(processedRow));
            if (processedRow && Array.isArray(processedRow)) {
              console.log(`   Valeurs individuelles:`, processedRow.map((cell, idx) => `[${idx}]: ${typeof cell}="${cell}"`).join(', '));
            }
          }
          
          // Convertir chaque ligne en string CSV-like (séparée par des virgules)
          // Toujours convertir, même si certaines cellules sont vides
          const csvLine = processedRow.map((cell, cellIdx) => {
            // Convertir la cellule en string, même si elle est vide
            let value = '';
            if (cell !== null && cell !== undefined) {
              if (typeof cell === 'number') {
                value = String(cell);
              } else if (typeof cell === 'boolean') {
                value = String(cell);
              } else {
                value = String(cell).trim();
              }
            }
            // Échapper les valeurs contenant des virgules ou guillemets
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',');
          
          console.log(`   CSV généré (${csvLine.length} caractères):`, csvLine.substring(0, 200));
          console.log(`   CSV valeurs:`, csvLine.split(',').map((v, idx) => `[${idx}]: "${v}"`).join(', '));
          
          // TOUJOURS ajouter la ligne, même si elle semble vide
          // Car certaines lignes peuvent avoir des valeurs dans des colonnes spécifiques
          // qui ne sont pas détectées par la vérification précédente
          // On laisse le traitement ultérieur décider si la ligne est valide
          
          lines.push(csvLine);
          excelLinesProcessed++;
          console.log(`✅ Ligne Excel ${i + 1} (index ${i}) ajoutée à lines (${processedRow.length} colonnes, ${csvLine.split(',').length} valeurs CSV)`);
          console.log(`   Total lignes dans lines maintenant: ${lines.length}`);
          console.log(`   CSV ligne ajoutée: ${csvLine.substring(0, 100)}${csvLine.length > 100 ? '...' : ''}`);
        }
        
        console.log(`📊 Total lignes Excel converties: ${excelLinesProcessed} traitées, ${excelLinesSkipped} ignorées (sur ${jsonData.length - 1} lignes de données)`);

        console.log(`📊 Fichier Excel parsé: ${rawHeaders.length} colonnes, ${lines.length} lignes de données`);
      } catch (excelError: any) {
        console.error('❌ Erreur parsing Excel:', excelError);
        return NextResponse.json(
          { error: `Erreur lors du parsing du fichier Excel: ${excelError.message || 'Format de fichier invalide'}` },
          { status: 400 }
        );
      }
    } else if (isCSV) {
      // Parser le fichier CSV
      console.log('📄 Fichier CSV détecté, parsing...');
      
      const fileContent = await file.text();
      console.log('📄 Fichier CSV reçu, taille:', fileContent.length);
      
      // Détecter l'encodage et le séparateur
      lines = fileContent
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      console.log(`📊 Nombre de lignes: ${lines.length}`);
      
      if (lines.length < 2) {
        return NextResponse.json(
          { error: `Le fichier CSV doit contenir au moins un en-tête et une ligne de données. Lignes trouvées: ${lines.length}` },
          { status: 400 }
        );
      }

      // Parser la première ligne (en-têtes)
      rawHeaders = parseCSVLine(lines[0]);
      headers = rawHeaders.map(h => normalizeHeader(h));
    } else {
      return NextResponse.json(
        { error: 'Format de fichier non supporté. Utilisez .csv, .xlsx ou .xls' },
        { status: 400 }
      );
    }

    if (lines.length === 0) {
      return NextResponse.json(
        { error: 'Aucune ligne de données trouvée dans le fichier' },
        { status: 400 }
      );
    }
    
    console.log('\n📋 ========== ANALYSE DU CSV ==========');
    console.log('📋 En-têtes originaux:', rawHeaders);
    console.log('📋 En-têtes normalisés:', headers);
    console.log('📋 Nombre de colonnes:', headers.length);
    
    // Créer un mapping bidirectionnel
    const columnMapNormalizedToRaw: Record<string, string> = {};
    const columnMapRawToNormalized: Record<string, string> = {};
    rawHeaders.forEach((rawHeader, index) => {
      const normalized = headers[index];
      columnMapNormalizedToRaw[normalized] = rawHeader;
      columnMapRawToNormalized[rawHeader.toLowerCase().trim()] = normalized;
    });
    
    // Afficher toutes les colonnes trouvées pour debug
    console.log('\n📋 Colonnes détectées:');
    headers.forEach((h, i) => {
      console.log(`   ${i + 1}. "${rawHeaders[i]}" → "${h}"`);
    });
    
    // Afficher le mapping complet
    console.log('\n📋 Mapping colonnes → valeurs (première ligne de données):');
    if (lines.length > 1) {
      const firstValues = parseCSVLine(lines[1]);
      headers.forEach((h, i) => {
        const value = firstValues[i] || '';
        if (value) {
          console.log(`   "${h}" (${rawHeaders[i]}): "${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`);
        }
      });
    }
    
    console.log('\n📋 Mapping normalisé → original:', columnMapNormalizedToRaw);
    
    // Mapping des colonnes possibles
    const nameColumns = ['name', 'title', 'nom', 'product_name', 'produit', 'titre', 'nom_du_produit'];
    const descColumns = ['description', 'desc', 'short_description', 'description_courte', 'detail'];
    const priceColumns = ['price', 'prix', 'prix_ht', 'prix_ttc'];
    const reductionColumns = ['economise', 'economisé', 'reduction', 'réduction', 'discount', 'sale', 'sold'];
    const imageColumns = ['images', 'image', 'images_url', 'image_url', 'photo', 'photos', 'img', 'url_image'];
    const variantColumns = ['variants', 'variante', 'variantes', 'options', 'options_variantes'];
    const categoryColumns = ['category', 'categorie', 'cat', 'type', 'categorie_produit', 'catégorie'];
    const materialColumns = ['material', 'materiau', 'matériau', 'matiere', 'matière'];
    const brandColumns = ['brand', 'marque', 'vendor', 'fabricant', 'manufacturer'];
    const tagsColumns = ['tags', 'tag', 'etiquettes', 'labels', 'mots_cles'];
    
    // Détecter les colonnes multiples (images 1, images 2, images 3, images 4)
    // Format exact attendu: "images 1", "images 2", "images 3", "images 4"
    // Après normalisation: "images_1", "images_2", "images_3", "images_4"
    const imageMultipleColumns = headers
      .map((h, idx) => ({ normalized: h, original: rawHeaders[idx], index: idx }))
      .filter(({ normalized, original }) => {
        const lower = original.toLowerCase().trim();
        // Chercher "images 1", "images 2", etc.
        return lower.match(/^images\s+\d+$/i) || 
               normalized.match(/^images_\d+$/);
      })
      .sort((a, b) => {
        const numA = parseInt(a.normalized.match(/\d+/)?.[0] || a.original.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.normalized.match(/\d+/)?.[0] || b.original.match(/\d+/)?.[0] || '0');
        return numA - numB;
      })
      .map(({ normalized }) => normalized);
    
    console.log('📋 Colonnes images multiples détectées:', imageMultipleColumns);
    imageMultipleColumns.forEach((col, idx) => {
      const originalIdx = headers.indexOf(col);
      if (originalIdx >= 0) {
        console.log(`   ${idx + 1}. "${rawHeaders[originalIdx]}" → "${col}"`);
      }
    });
    
    // Détecter les colonnes multiples (variants 1, variants 2, variants 3)
    // Format exact attendu: "variants 1", "variants 2", "variants 3"
    // Après normalisation: "variants_1", "variants_2", "variants_3"
    let variantMultipleColumns = headers
      .map((h, idx) => ({ normalized: h, original: rawHeaders[idx], index: idx }))
      .filter(({ normalized, original }) => {
        const lower = original.toLowerCase().trim();
        // Chercher "variants 1", "variants 2", "variants 3"
        return lower.match(/^variants\s+\d+$/i) || 
               normalized.match(/^variants_\d+$/);
      })
      .sort((a, b) => {
        const numA = parseInt(a.normalized.match(/\d+/)?.[0] || a.original.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.normalized.match(/\d+/)?.[0] || b.original.match(/\d+/)?.[0] || '0');
        return numA - numB;
      })
      .map(({ normalized }) => normalized);
    
    console.log('📋 Colonnes variants multiples détectées:', variantMultipleColumns);
    variantMultipleColumns.forEach((col, idx) => {
      const originalIdx = headers.indexOf(col);
      if (originalIdx >= 0) {
        console.log(`   ${idx + 1}. "${rawHeaders[originalIdx]}" → "${col}"`);
      }
    });
    
    console.log('📋 Colonnes images multiples détectées:', imageMultipleColumns);
    console.log('📋 Colonnes variantes multiples détectées:', variantMultipleColumns);
    
    const products = [];
    const previewProducts: any[] = [];
    const errors: string[] = [];

    console.log(`\n🔄 ========== TRAITEMENT DES LIGNES ==========`);
    console.log(`🔄 Nombre total de lignes dans le fichier: ${lines.length}`);
    console.log(`🔄 Nombre de lignes de données à traiter: ${lines.length - 1} (ligne 1 = en-têtes)`);

    // Traiter chaque ligne (sauf la première qui est l'en-tête)
    let processedCount = 0;
    let skippedCount = 0;
    let createdCount = 0;
    for (let i = 1; i < lines.length; i++) {
      processedCount++;
      try {
        const rawLine = lines[i];
        console.log(`\n🔍 ========== TRAITEMENT LIGNE ${i + 1}/${lines.length - 1} ==========`);
        console.log(`   Ligne brute (${rawLine.length} caractères):`, rawLine.substring(0, 200));
        
        const values = parseCSVLine(rawLine);
        console.log(`   Valeurs parsées (${values.length}):`, values);
        console.log(`   Détail valeurs:`, values.map((v, idx) => `[${idx}]: "${v}"`).join(', '));
        
        // NE PLUS IGNORER LES LIGNES - TOUTES LES LIGNES SONT TRAITÉES
        // Même si une ligne semble vide, elle peut avoir des valeurs dans des colonnes spécifiques
        const isEmpty = values.length === 0 || values.every(v => !v || v.trim() === '');
        if (isEmpty) {
          console.log(`⚠️ Ligne ${i + 1} (index ${i}) semble vide, mais sera quand même traitée`);
          console.log(`   Ligne brute complète:`, rawLine);
          console.log(`   Valeurs après parsing:`, values);
        } else {
          console.log(`✅ Ligne ${i + 1} (index ${i}) a des valeurs, traitement...`);
        }
        
        // Vérifier que le nombre de valeurs correspond aux en-têtes
        if (values.length !== headers.length) {
          console.warn(`⚠️ Ligne ${i + 1}: Nombre de colonnes (${values.length}) ne correspond pas aux en-têtes (${headers.length})`);
        }
        
        // Créer un objet avec les données (normalisé ET original pour recherche flexible)
        const productData: Record<string, string> = {};
        const productDataRaw: Record<string, string> = {}; // Avec noms originaux aussi
        headers.forEach((header, index) => {
          const value = values[index] || '';
          productData[header] = value;
          // Ajouter aussi avec le nom original (normalisé en lowercase)
          const rawHeader = rawHeaders[index];
          productDataRaw[rawHeader.toLowerCase().trim()] = value;
        });
        
        // Si un mapping personnalisé est fourni, créer un mapping inversé (field -> column)
        const fieldToColumnMap: Record<string, string> = {};
        if (Object.keys(userColumnMapping).length > 0) {
          Object.entries(userColumnMapping).forEach(([column, field]) => {
            if (field !== 'ignore') {
              // Trouver la colonne normalisée correspondante
              const colIndex = rawHeaders.findIndex(h => h === column);
              if (colIndex >= 0) {
                fieldToColumnMap[field] = headers[colIndex];
              }
            }
          });
          console.log(`   📋 Mapping personnalisé utilisé:`, fieldToColumnMap);
        }
        
        // Afficher toutes les données parsées avec les colonnes originales
        console.log(`\n📦 Données parsées ligne ${i + 1}:`);
        console.log(`   Mapping colonne normalisée → valeur:`);
        headers.forEach((normalized, idx) => {
          const original = rawHeaders[idx];
          const value = productData[normalized] || '';
          if (value && value.trim()) {
            console.log(`   "${original}" (${normalized}): "${value.substring(0, 80)}${value.length > 80 ? '...' : ''}"`);
          } else {
            console.log(`   "${original}" (${normalized}): [vide]`);
          }
        });
        
        // Si aucune donnée n'est trouvée, afficher un warning mais CONTINUER le traitement
        const hasData = Object.values(productData).some(v => v && String(v).trim().length > 0);
        if (!hasData) {
          console.warn(`⚠️ PROBLÈME: Aucune donnée trouvée dans la ligne ${i + 1}, mais traitement continué`);
          console.warn(`   Valeurs brutes:`, values);
          console.warn(`   Nombre de valeurs:`, values.length);
          console.warn(`   ProductData:`, productData);
          errors.push(`Ligne ${i + 1}: Aucune donnée valide trouvée (traitement continué)`);
          // NE PLUS SKIP - CONTINUER LE TRAITEMENT
        }

        // Trouver le nom du produit
        let productName = '';
        console.log(`   🔍 Recherche nom...`);
        
        // Utiliser le mapping personnalisé si disponible
        if (fieldToColumnMap['name'] && productData[fieldToColumnMap['name']]) {
          productName = productData[fieldToColumnMap['name']].trim();
          console.log(`   ✅ Nom trouvé via mapping dans "${fieldToColumnMap['name']}": "${productName}"`);
        } else if (productData['name']) {
          productName = productData['name'].trim();
          console.log(`   ✅ Nom trouvé dans "name": "${productName}"`);
        } else {
          // Recherche flexible
          const nameCol = findColumn(productData, nameColumns);
          if (nameCol && productData[nameCol] && productData[nameCol].trim()) {
            productName = productData[nameCol].trim();
            console.log(`   ✅ Nom trouvé dans "${nameCol}": "${productName}"`);
          } else {
            console.log(`   ❌ Pas de nom trouvé`);
            productName = `Produit ${i + 1}`;
            console.log(`   ⚠️ Utilisation du nom par défaut: "${productName}"`);
          }
        }

        // Trouver la description - IMPORTANT: ne pas tronquer
        let description = '';
        console.log(`   🔍 Recherche description...`);
        
        if (fieldToColumnMap['description'] && productData[fieldToColumnMap['description']]) {
          description = productData[fieldToColumnMap['description']].trim();
          console.log(`   ✅ Description trouvée via mapping dans "${fieldToColumnMap['description']}": ${description.length} caractères`);
          console.log(`   Contenu complet: "${description}"`);
        } else if (productData['description']) {
          description = productData['description'].trim();
          console.log(`   ✅ Description trouvée dans "description": ${description.length} caractères`);
          console.log(`   Contenu complet: "${description}"`);
        } else {
          // Recherche flexible
          const descCol = findColumn(productData, descColumns);
          if (descCol && productData[descCol] && productData[descCol].trim()) {
            description = productData[descCol].trim();
            console.log(`   ✅ Description trouvée dans "${descCol}": ${description.length} caractères`);
            console.log(`   Contenu complet: "${description}"`);
          } else {
            console.log(`   ⚠️ Pas de description trouvée`);
            console.log(`   Colonnes disponibles:`, Object.keys(productData));
            console.log(`   Valeurs dans productData:`, Object.entries(productData).map(([k, v]) => `"${k}": "${v?.substring(0, 50)}..."`));
          }
        }

        // Trouver le prix
        let price: number | null = null;
        console.log(`   🔍 Recherche prix...`);
        
        if (fieldToColumnMap['price'] && productData[fieldToColumnMap['price']]) {
          const rawPrice = productData[fieldToColumnMap['price']];
          console.log(`   📊 Prix brut depuis mapping "${fieldToColumnMap['price']}": "${rawPrice}"`);
          price = parsePrice(rawPrice);
          if (price !== null) {
            console.log(`   ✅ Prix parsé: ${price}€`);
          } else {
            console.log(`   ❌ Prix non parsable: "${rawPrice}"`);
          }
        } else if (productData['price']) {
          const rawPrice = productData['price'];
          console.log(`   📊 Prix brut depuis "price": "${rawPrice}"`);
          price = parsePrice(rawPrice);
          if (price !== null) {
            console.log(`   ✅ Prix parsé: ${price}€`);
          } else {
            console.log(`   ❌ Prix non parsable: "${rawPrice}"`);
          }
        } else {
          // Recherche flexible
          const priceCol = findColumn(productData, priceColumns);
          if (priceCol && productData[priceCol] && productData[priceCol].trim()) {
            const rawPrice = productData[priceCol];
            console.log(`   📊 Prix brut depuis "${priceCol}": "${rawPrice}"`);
            price = parsePrice(rawPrice);
            if (price !== null) {
              console.log(`   ✅ Prix parsé: ${price}€`);
            } else {
              console.log(`   ❌ Prix non parsable: "${rawPrice}"`);
            }
          } else {
            console.log(`   ❌ Pas de prix trouvé`);
            console.log(`   Colonnes disponibles:`, Object.keys(productData));
            console.log(`   Valeurs dans productData:`, Object.entries(productData).map(([k, v]) => `"${k}": "${v}"`));
          }
        }

        // Trouver les images
        let images: string[] = [];
        
        // Utiliser le mapping personnalisé si disponible
        if (Object.keys(fieldToColumnMap).length > 0) {
          ['images_1', 'images_2', 'images_3', 'images_4'].forEach(field => {
            if (fieldToColumnMap[field] && productData[fieldToColumnMap[field]]) {
              const value = productData[fieldToColumnMap[field]];
              const parsed = parseImages(value);
              images.push(...parsed);
              console.log(`   📷 Images trouvées via mapping "${field}" → "${fieldToColumnMap[field]}": ${parsed.length} image(s)`);
            }
          });
        } else if (imageMultipleColumns.length > 0) {
          console.log(`   🔍 Recherche images dans colonnes:`, imageMultipleColumns);
          for (const col of imageMultipleColumns) {
            const value = productData[col];
            console.log(`   📷 Colonne "${col}":`, value ? `"${value}"` : '[VIDE]');
            if (value && value.trim()) {
              const parsed = parseImages(value);
              console.log(`      → ${parsed.length} image(s) parsée(s):`, parsed);
              images.push(...parsed);
            }
          }
          console.log(`   ✅ Total images trouvées: ${images.length}`, images);
        } else {
          console.log(`   ⚠️ Aucune colonne images multiple détectée`);
          console.log(`   Colonnes disponibles:`, Object.keys(productData));
        }
        
        // Nettoyer les images (supprimer les doublons et les vides)
        images = [...new Set(images.filter(img => img && img.trim()))];

        // Trouver les variantes
        let variants: any[] = [];
        
        // Détecter le format "Option 1 / Valeur option 1 / Option 2 / Valeur option 2"
        const option1Col = findColumn(productData, ['option_1', 'option1', 'option', 'option_1_nom']);
        const value1Col = findColumn(productData, ['valeur_option_1', 'valeur_option1', 'value_option_1', 'valeur_option_1']);
        const option2Col = findColumn(productData, ['option_2', 'option2', 'option_2_nom']);
        const value2Col = findColumn(productData, ['valeur_option_2', 'valeur_option2', 'value_option_2', 'valeur_option_2']);
        
        if (option1Col && value1Col && productData[value1Col] && productData[value1Col].trim()) {
          // Format avec options séparées
          const option1Name = productData[option1Col]?.trim() || 'Option 1';
          const option1Value = productData[value1Col]?.trim() || '';
          const option2Name = (option2Col && productData[option2Col]) ? productData[option2Col].trim() : null;
          const option2Value = (value2Col && productData[value2Col]) ? productData[value2Col].trim() : null;
          
          // Créer une variante avec ces options
          variants.push({
            title: option2Value ? `${option1Value} / ${option2Value}` : option1Value,
            price: price?.toString() || '0',
            option1: option1Value,
            option2: option2Value || undefined,
            sku: productData['sku'] || productData['reference'] || undefined,
            inventory_quantity: productData['stock'] ? parseInt(productData['stock']) || 0 : undefined,
          });
          console.log(`   ✅ Variante créée depuis colonnes options: ${option1Value}${option2Value ? ` / ${option2Value}` : ''}`);
        }
        
        // Utiliser le mapping personnalisé si disponible
        if (variants.length === 0 && Object.keys(fieldToColumnMap).length > 0) {
          ['variants_1', 'variants_2', 'variants_3'].forEach(field => {
            if (fieldToColumnMap[field] && productData[fieldToColumnMap[field]]) {
              const value = productData[fieldToColumnMap[field]];
              const parsed = parseVariants(value, price?.toString() || '0');
              variants.push(...parsed);
              console.log(`   📦 Variantes trouvées via mapping "${field}" → "${fieldToColumnMap[field]}": ${parsed.length} variante(s)`);
            }
          });
        } else if (variants.length === 0 && variantMultipleColumns.length > 0) {
          console.log(`   🔍 Recherche variantes dans colonnes:`, variantMultipleColumns);
          for (const col of variantMultipleColumns) {
            const value = productData[col];
            console.log(`   📦 Colonne "${col}":`, value ? `"${value}"` : '[VIDE]');
            if (value && value.trim()) {
              const parsed = parseVariants(value, price?.toString() || '0');
              console.log(`      → ${parsed.length} variante(s) parsée(s):`, parsed);
              variants.push(...parsed);
            }
          }
          console.log(`   ✅ Total variantes trouvées: ${variants.length}`, variants);
        } else {
          console.log(`   ⚠️ Aucune colonne variants multiple détectée`);
          console.log(`   Colonnes disponibles:`, Object.keys(productData));
        }
        
        // Sinon, chercher dans les colonnes standards
        if (variants.length === 0) {
          console.log(`   🔍 Recherche variantes dans colonnes standards:`, variantColumns);
          for (const col of variantColumns) {
            const foundCol = findColumn(productData, [col]);
            if (foundCol && productData[foundCol] && productData[foundCol].trim()) {
              variants = parseVariants(productData[foundCol], price?.toString() || '0');
              if (variants.length > 0) {
                console.log(`   ✅ Variantes trouvées dans "${foundCol}" (${variants.length}):`, variants);
                break;
              }
            }
          }
        }
        
        // Si toujours rien, chercher toutes les colonnes qui contiennent "variant"
        if (variants.length === 0) {
          console.log(`   🔍 Recherche dans toutes les colonnes contenant "variant"`);
          for (const [key, value] of Object.entries(productData)) {
            if (key.toLowerCase().includes('variant') && value && value.trim()) {
              const parsed = parseVariants(value, price?.toString() || '0');
              if (parsed.length > 0) {
                console.log(`   ✅ Variantes trouvées dans "${key}":`, parsed);
                variants.push(...parsed);
              }
            }
          }
        }
        
        // Si pas de variantes, créer une par défaut avec SKU et stock si disponibles
        if (variants.length === 0) {
          const skuCol = findColumn(productData, ['sku', 'reference', 'ref', 'code']);
          const stockCol = findColumn(productData, ['stock', 'inventory', 'quantity', 'quantite']);
          
          variants = [{
            title: 'Default',
            price: price?.toString() || '0',
            sku: skuCol && productData[skuCol] ? productData[skuCol].trim() : undefined,
            inventory_quantity: stockCol && productData[stockCol] ? parseInt(productData[stockCol]) || 0 : undefined,
          }];
          console.log(`   ⚠️ Pas de variantes trouvées, création d'une variante par défaut`);
        }
        
        // Trouver la réduction/économie
        let reduction: number | null = null;
        console.log(`   🔍 Recherche réduction/économie...`);
        
        if (fieldToColumnMap['reduction'] && productData[fieldToColumnMap['reduction']]) {
          const value = productData[fieldToColumnMap['reduction']].trim();
          reduction = parseReduction(value);
          if (reduction !== null) {
            const isPercent = reduction < 1;
            console.log(`   ✅ Réduction trouvée via mapping dans "${fieldToColumnMap['reduction']}": "${value}" → ${isPercent ? (reduction * 100) + '%' : reduction + '€'}`);
          }
        } else if (productData['economise']) {
          const value = productData['economise'].trim();
          reduction = parseReduction(value);
          if (reduction !== null) {
            const isPercent = reduction < 1;
            console.log(`   ✅ Réduction trouvée dans "economise": "${value}" → ${isPercent ? (reduction * 100) + '%' : reduction + '€'}`);
          }
        } else {
          // Recherche flexible
          const reductionCol = findColumn(productData, reductionColumns);
          if (reductionCol && productData[reductionCol] && productData[reductionCol].trim()) {
            reduction = parseReduction(productData[reductionCol]);
            if (reduction !== null) {
              const isPercent = reduction < 1;
              console.log(`   ✅ Réduction trouvée dans "${reductionCol}": ${isPercent ? (reduction * 100) + '%' : reduction + '€'}`);
            }
          }
        }
        
        console.log(`\n📦 Résumé produit ligne ${i + 1}:`);
        console.log(`   Nom: "${productName}"`);
        console.log(`   Description: "${description.substring(0, 50)}${description.length > 50 ? '...' : ''}"`);
        console.log(`   Prix: ${price || 'N/A'}€`);
        console.log(`   Images: ${images.length}`);
        console.log(`   Variantes: ${variants.length}`);

        // Trouver la catégorie
        let category = '';
        console.log(`   🔍 Recherche catégorie...`);
        
        if (fieldToColumnMap['category'] && productData[fieldToColumnMap['category']]) {
          category = productData[fieldToColumnMap['category']].trim();
          console.log(`   ✅ Catégorie trouvée via mapping dans "${fieldToColumnMap['category']}": "${category}"`);
          console.log(`   Valeur brute: "${productData[fieldToColumnMap['category']]}"`);
        } else if (productData['category']) {
          category = productData['category'].trim();
          console.log(`   ✅ Catégorie trouvée dans "category": "${category}"`);
        } else {
          // Recherche flexible
          const categoryCol = findColumn(productData, categoryColumns);
          if (categoryCol && productData[categoryCol] && productData[categoryCol].trim()) {
            category = productData[categoryCol].trim();
            console.log(`   ✅ Catégorie trouvée dans "${categoryCol}": "${category}"`);
          } else {
            console.log(`   ❌ Pas de catégorie trouvée`);
            console.log(`   Colonnes disponibles:`, Object.keys(productData));
            console.log(`   Mapping personnalisé:`, fieldToColumnMap);
            console.log(`   Valeurs dans productData:`, Object.entries(productData).map(([k, v]) => `"${k}": "${v}"`));
          }
        }

        // Trouver le matériau
        let material = '';
        const materialCol = findColumn(productData, materialColumns);
        if (materialCol && productData[materialCol] && productData[materialCol].trim()) {
          material = productData[materialCol].trim();
          console.log(`   ✅ Matériau trouvé dans "${materialCol}": "${material}"`);
        }

        // Trouver la marque/vendor
        let brand = '';
        const brandCol = findColumn(productData, brandColumns);
        if (brandCol && productData[brandCol] && productData[brandCol].trim()) {
          brand = productData[brandCol].trim();
          console.log(`   ✅ Marque trouvée dans "${brandCol}": "${brand}"`);
        }

        // Trouver les tags
        let tags: string[] = [];
        const tagsCol = findColumn(productData, tagsColumns);
        if (tagsCol && productData[tagsCol] && productData[tagsCol].trim()) {
          const tagsValue = productData[tagsCol].trim();
          tags = tagsValue.split(/[,;|]/).map(t => t.trim()).filter(t => t);
          console.log(`   ✅ Tags trouvés dans "${tagsCol}": ${tags.length} tag(s)`, tags);
        }
        
        // Vérifier qu'on a au moins un nom - TOUJOURS créer un nom même si vide
        if (!productName || productName.trim() === '' || productName === `Produit ${i}`) {
          console.warn(`⚠️ PROBLÈME: Pas de nom valide trouvé pour la ligne ${i + 1}`);
          console.warn(`   Colonnes disponibles:`, Object.keys(productData));
          console.warn(`   Valeurs:`, Object.entries(productData).map(([k, v]) => `"${k}": "${String(v).substring(0, 50)}"`));
          console.warn(`   Nom trouvé: "${productName}"`);
          
          // Essayer de trouver un nom dans n'importe quelle colonne
          const anyValue = Object.values(productData).find(v => v && String(v).trim().length > 0);
          if (anyValue) {
            productName = String(anyValue).trim();
            console.log(`   ⚠️ Utilisation de la première valeur trouvée comme nom: "${productName}"`);
          } else {
            // Dernière tentative : utiliser le nom de la première colonne non vide
            for (const [key, value] of Object.entries(productData)) {
              if (value && String(value).trim().length > 0) {
                productName = `Produit ${i + 1} - ${String(value).trim().substring(0, 30)}`;
                console.log(`   ⚠️ Utilisation de "${key}" comme nom: "${productName}"`);
                break;
              }
            }
            
            // Si toujours pas de nom, créer un nom par défaut basé sur l'index
            if (!productName || productName.trim() === '' || productName === `Produit ${i}`) {
              productName = `Produit ${i + 1}`;
              console.log(`   ⚠️ Création d'un nom par défaut: "${productName}"`);
            }
          }
        }

        // Créer l'objet preview
        const previewProduct = {
          name: productName,
          description: description,
          price: price,
          reduction: reduction,
          category: category,
          material: material,
          images: images,
          variants: variants,
        };
        previewProducts.push(previewProduct);

        // Si on est en mode preview, ne pas créer les produits
        if (!confirm) {
          console.log(`✅ Produit ligne ${i + 1} parsé (mode preview):`, productName);
          continue;
        }

        // Créer le produit en base
        try {
          const { data: product, error: insertError } = await supabaseAdmin
            .from('products')
            .insert({
              user_id: adminUserId, // Utiliser l'admin_id si partenaire
              partner_id: partnerId, // Ajouter le partner_id si présent
              shopify_connection_id: shopifyConnectionId,
              name: productName,
              category: category,
              material: material,
              style: productData.style || '',
              price: price,
              images: images,
              variants: variants,
            generated_content: {
              title: productName,
              short_description: description,
              long_description: description,
              bullet_points: productData.bullet_points ? 
                productData.bullet_points.split(/[;|]/).map((p: string) => p.trim()).filter((p: string) => p) : 
                [],
              tags: tags.length > 0 ? tags : (productData.tags ? 
                productData.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : 
                []),
              meta_title: productName,
              meta_description: description.substring(0, 160),
              vendor: brand || undefined,
            },
            raw_data: {
              ...productData,
              reduction: reduction,
            },
              status: 'draft',
            })
            .select()
            .single();

          if (insertError) {
            console.error(`❌ Erreur création produit ligne ${i + 1}:`, insertError);
            const errorMsg = insertError.message || insertError.code || 'Erreur inconnue';
            errors.push(`Ligne ${i + 1}: ${errorMsg}`);
            skippedCount++;
          } else if (product) {
            console.log(`✅ Produit ligne ${i + 1} créé avec succès:`, product.id, product.name);
            products.push(product);
            createdCount++;
          } else {
            console.error(`❌ Produit ligne ${i + 1}: Aucune donnée retournée après insertion`);
            errors.push(`Ligne ${i + 1}: Aucune donnée retournée après insertion`);
            skippedCount++;
          }
        } catch (dbError: any) {
          console.error(`❌ Erreur base de données ligne ${i + 1}:`, dbError);
          const errorMsg = dbError.message || dbError.toString() || 'Erreur de connexion à la base de données';
          errors.push(`Ligne ${i + 1}: ${errorMsg}`);
          skippedCount++;
        }
      } catch (err: any) {
        console.error(`❌ Erreur traitement ligne ${i + 1}:`, err);
        errors.push(`Ligne ${i + 1}: ${err.message || 'Erreur inconnue'}`);
        skippedCount++;
      }
      console.log(`📊 Ligne ${i + 1} terminée. Produits créés jusqu'à présent: ${createdCount}/${processedCount}`);
    }

    // Si mode preview, retourner les données parsées
    if (!confirm) {
      if (previewProducts.length === 0) {
        return NextResponse.json(
          { 
            error: `Aucune donnée extraite. ${errors.length} erreur(s) détectée(s).`,
            details: errors,
            debug: {
              headers_found: headers,
              lines_processed: lines.length - 1,
            }
          },
          { status: 400 }
        );
      }

      // Créer le mapping des colonnes avec correspondances suggérées
      const columnMapping: Array<{
        column: string;
        normalized: string;
        suggestedField: string | null;
        fieldOptions: string[];
      }> = [];
      
      const fieldOptions = [
        'name',
        'description',
        'price',
        'reduction',
        'category',
        'images_1',
        'images_2',
        'images_3',
        'images_4',
        'variants_1',
        'variants_2',
        'variants_3',
        'ignore', // Pour ignorer une colonne
      ];
      
      // Fonction pour suggérer un champ basé sur le nom de colonne
      const suggestField = (col: string, normalized: string): string | null => {
        const lower = normalized.toLowerCase();
        if (lower.includes('name') || lower === 'nom' || lower === 'titre' || lower === 'title') return 'name';
        if (lower.includes('desc') || lower === 'description') return 'description';
        if (lower.includes('price') || lower === 'prix') return 'price';
        if (lower.includes('econom') || lower.includes('reduction') || lower.includes('discount')) return 'reduction';
        if (lower.includes('categor') || lower === 'cat') return 'category';
        if (lower.match(/^images?\s*1$/i) || lower === 'images_1' || lower === 'image_1') return 'images_1';
        if (lower.match(/^images?\s*2$/i) || lower === 'images_2' || lower === 'image_2') return 'images_2';
        if (lower.match(/^images?\s*3$/i) || lower === 'images_3' || lower === 'image_3') return 'images_3';
        if (lower.match(/^images?\s*4$/i) || lower === 'images_4' || lower === 'image_4') return 'images_4';
        if (lower.match(/^variants?\s*1$/i) || lower === 'variants_1' || lower === 'variant_1') return 'variants_1';
        if (lower.match(/^variants?\s*2$/i) || lower === 'variants_2' || lower === 'variant_2') return 'variants_2';
        if (lower.match(/^variants?\s*3$/i) || lower === 'variants_3' || lower === 'variant_3') return 'variants_3';
        return null;
      };
      
      rawHeaders.forEach((rawCol, index) => {
        const normalized = headers[index];
        const suggested = suggestField(rawCol, normalized);
        columnMapping.push({
          column: rawCol,
          normalized: normalized,
          suggestedField: suggested,
          fieldOptions: fieldOptions,
        });
      });
      
      return NextResponse.json({
        success: true,
        message: `${previewProducts.length} produit(s) extrait(s) du CSV`,
        preview: previewProducts,
        columnMapping: columnMapping,
        errors: errors.length > 0 ? errors : undefined,
        stats: {
          total_lines: lines.length - 1,
          products_parsed: previewProducts.length,
          errors: errors.length,
        }
      });
    }

    // Mode création
    console.log(`\n📊 ========== RÉSUMÉ IMPORT ==========`);
    console.log(`📊 Total lignes dans le fichier: ${lines.length}`);
    console.log(`📊 Lignes de données (hors en-tête): ${lines.length - 1}`);
    console.log(`📊 Lignes traitées: ${processedCount}`);
    console.log(`📊 Lignes ignorées: ${skippedCount}`);
    console.log(`📊 Produits créés avec succès: ${createdCount}`);
    console.log(`📊 Produits dans le tableau: ${products.length}`);
    console.log(`📊 Erreurs: ${errors.length}`);
    
    if (products.length === 0) {
      const errorMessage = errors.length > 0 
        ? `Aucun produit créé. ${errors.length} erreur(s) détectée(s).`
        : 'Aucun produit créé. Vérifiez que votre fichier contient des données valides.';
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: errors.length > 0 ? errors : ['Aucune donnée valide trouvée dans le fichier'],
          debug: {
            headers_found: rawHeaders,
            headers_normalized: headers,
            lines_processed: lines.length,
            total_columns: headers.length,
          },
          stats: {
            total_lines: lines.length,
            products_created: 0,
            errors: errors.length,
          }
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${products.length} produit(s) importé(s) avec succès${errors.length > 0 ? `, ${errors.length} erreur(s)` : ''}`,
      data: products,
      errors: errors.length > 0 ? errors : undefined,
      stats: {
        total_lines: lines.length,
        products_created: products.length,
        errors: errors.length,
      }
    });
  } catch (error: any) {
    console.error('❌ Erreur import produits:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de l\'import des produits',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
