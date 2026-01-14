// ============================================
// API: Exporter les produits vers Shopify (Admin) - CSV compatible Shopify
// Format strictement conforme aux spécifications STEP 3
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getUserId } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });

    const { data: user } = await supabaseAdmin.from('users').select('role').eq('id', userId).single();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Accès refusé : Admin requis' }, { status: 403 });
    }

    const resolvedParams = params instanceof Promise ? await params : params;
    const { id: submissionId } = resolvedParams;

    // Récupérer les product_ids sélectionnés depuis le body
    const body = await request.json().catch(() => ({}));
    const selectedProductIds: string[] | undefined = body.product_ids;

    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('partner_submissions')
      .select('id, invitation:partner_invitations!inner(admin_id)')
      .eq('id', submissionId)
      .eq('invitation.admin_id', userId)
      .single();
    if (submissionError || !submission) {
      return NextResponse.json({ success: false, error: 'Soumission non trouvée' }, { status: 404 });
    }

    // Récupérer les produits selon les IDs sélectionnés ou tous les produits de la submission
    let productsQuery = supabaseAdmin
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .filter('raw_data->>submission_id', 'eq', submissionId);

    if (selectedProductIds && Array.isArray(selectedProductIds) && selectedProductIds.length > 0) {
      // Filtrer par les IDs sélectionnés
      productsQuery = productsQuery.in('id', selectedProductIds);
    }

    const { data: productsData, error: productsError } = await productsQuery.order('created_at', { ascending: false });

    if (productsError || !productsData || productsData.length === 0) {
      return NextResponse.json({ success: false, error: 'Aucun produit à exporter' }, { status: 400 });
    }

    const productIds = productsData.map(p => p.id);
    const { data: detailsData } = await supabaseAdmin
      .from('product_details')
      .select('*')
      .in('product_id', productIds);

    // Colonnes exactes selon le plan STEP 3
    const headers = [
      'Title',
      'Vendor',
      'Product Type',
      'Body (HTML)',
      'Tags',
      'Variant SKU',
      'Variant Price',
      'Variant Compare At Price',
      'Variant Inventory Qty',
      'Variant Weight',
      'Variant Weight Unit',
      'Variant Barcode',
      'Variant HS Code',
      'Image Src',
      'Image Alt Text',
      'Metafield: custom.subtitle',
      'Metafield: custom.inci',
      'Metafield: custom.usage',
      'Metafield: custom.endocrine_disruptors',
      'Metafield: custom.fragrance_family',
      'Metafield: custom.fragrance_notes',
      'Metafield: custom.color_hex',
      'Metafield: custom.lot_number',
      'Metafield: custom.expiration_date',
    ];

    const csvRows: string[] = [];
    csvRows.push(headers.join(','));

    const exportedProductIds: string[] = [];

    /**
     * Formate un nombre pour le CSV (2 décimales)
     */
    const formatNumber = (n: any): string => {
      if (n === null || n === undefined || n === '') return '';
      const num = typeof n === 'number' ? n : parseFloat(String(n));
      if (isNaN(num)) return '';
      return num.toFixed(2);
    };

    /**
     * Extrait la date d'expiration depuis les détails de revalorisation
     * Formats supportés: DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD, YYYY-MM-DD
     */
    const extractExpirationDate = (text?: string): string => {
      if (!text) return '';
      // Recherche de dates au format DD/MM/YYYY ou DD-MM-YYYY
      const regexDDMM = /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/;
      // Recherche de dates au format YYYY/MM/DD ou YYYY-MM-DD
      const regexYYYY = /(\d{4}[\/\-]\d{2}[\/\-]\d{2})/;
      const matchDDMM = text.match(regexDDMM);
      const matchYYYY = text.match(regexYYYY);
      return matchDDMM ? matchDDMM[1] : (matchYYYY ? matchYYYY[1] : '');
    };

    /**
     * Échappe les guillemets doubles dans une chaîne pour le CSV
     */
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      return String(value).replace(/"/g, '""');
    };

    /**
     * Parse le poids/volume et retourne { value, unit }
     * Supporte: "100g", "100 g", "50mL", "50 mL", "100", etc.
     */
    const parseWeightVolume = (weightVolumeStr?: string): { value: string; unit: string } => {
      if (!weightVolumeStr) return { value: '', unit: 'g' };
      
      const str = String(weightVolumeStr).trim();
      // Extraire le nombre (supporte virgule et point comme séparateur décimal)
      const numberMatch = str.match(/(\d+(?:[.,]\d+)?)/);
      if (!numberMatch) return { value: '', unit: 'g' };
      
      const numberValue = numberMatch[1].replace(',', '.');
      
      // Détecter l'unité (g, kg, mL, L, etc.)
      const unitMatch = str.match(/([a-zA-Z]+)/i);
      let unit = 'g';
      if (unitMatch) {
        const unitStr = unitMatch[1].toLowerCase();
        if (unitStr.includes('ml') || unitStr.includes('l')) {
          unit = 'g'; // Shopify utilise 'g' pour le poids, même pour les liquides
        } else if (unitStr.includes('kg')) {
          // Convertir kg en g
          const numValue = parseFloat(numberValue);
          return { value: (numValue * 1000).toString(), unit: 'g' };
        } else if (unitStr.includes('g')) {
          unit = 'g';
        }
      }
      
      return { value: numberValue, unit };
    };

    for (const product of productsData) {
      const pd = detailsData?.find(d => d.product_id === product.id) || {};
      const rd = product.raw_data || {};

      // ============================================
      // Section 1 - Identité Produit
      // ============================================
      const title = rd.product_name || product.generated_content?.title || product.name || 'Produit sans titre';
      const vendor = pd.brand_name || rd.brand || '';
      const productType = pd.product_type || product.category || rd.product_type || '';

      // ============================================
      // Section 5 - Contenu Produit (SHOPIFY)
      // ============================================
      const bodyHtml = rd.description || product.generated_content?.long_description || pd.description || '';

      // ============================================
      // Tags = Actions & efficacités + Souhait revalorisation
      // ============================================
      const actionsEfficacites = pd.actions_efficacites || rd.actions_efficacites || '';
      const revalorisationWish = pd.revalorisation_wish || rd.revalorisation_wish || '';
      const tagsParts = [actionsEfficacites, revalorisationWish].filter(Boolean);
      const tags = tagsParts.join(', ');

      // ============================================
      // Section 2 - Identification & Logistique
      // ============================================
      const variantSku = pd.sku || rd.sku || '';
      const barcode = rd.ean || pd.ean || '';
      const hsCode = pd.sh || rd.sh || '';
      const variantQty = pd.quantity_uvc ?? rd.quantity_uvc ?? 0;

      // Poids/Volume
      const weightVolumeStr = pd.weight_volume || rd.weight_volume || '';
      const { value: variantWeight, unit: variantWeightUnit } = parseWeightVolume(weightVolumeStr);

      // ============================================
      // Section 4 - Prix & Commission (AUTO)
      // Mapping selon le plan:
      // - Variant Price = Prix final TTC (avec commission)
      // - Variant Compare At Price = Prix standard TTC
      // ============================================
      // Prix final TTC = Prix remisé TTC + Commission TTC
      // Stocké dans raw_data.price_final_ttc ou product.price
      const variantPrice = rd.price_final_ttc ?? product.price ?? 0;
      
      // Prix standard TTC (prix de comparaison)
      const variantCompareAt = pd.price_standard_ttc ?? rd.price_standard_ttc ?? '';

      // ============================================
      // Section 7 - Images Produit
      // ============================================
      // Exporter toutes les images (séparées par des virgules pour Shopify)
      const imageSrc = product.images && Array.isArray(product.images) && product.images.length > 0 
        ? product.images.join(',') 
        : '';
      const altText = title;

      // ============================================
      // Metafields Shopify
      // ============================================
      // Priorité: raw_data > product_details (raw_data est la source la plus fiable)
      
      // Metafield: custom.subtitle
      const metafieldSubtitle = escapeCSV(rd.subtitle || pd.subtitle || '');

      // Metafield: custom.inci
      const metafieldInci = escapeCSV(rd.inci_list || pd.inci_list || '');

      // Metafield: custom.usage
      const metafieldUsage = escapeCSV(rd.usage_advice || pd.usage_advice || '');

      // Metafield: custom.endocrine_disruptors
      const endocrineDisruptors = rd.endocrine_disruptors !== undefined 
        ? rd.endocrine_disruptors 
        : (pd.endocrine_disruptors !== undefined ? pd.endocrine_disruptors : null);
      const metafieldEndocrineDisruptors = endocrineDisruptors === true || endocrineDisruptors === 'OUI' || endocrineDisruptors === 'oui' 
        ? 'OUI' 
        : (endocrineDisruptors === false || endocrineDisruptors === 'NON' || endocrineDisruptors === 'non' ? 'NON' : '');

      // Metafield: custom.fragrance_family (si Type = "Parfum")
      const metafieldFragranceFamily = escapeCSV(rd.fragrance_family || pd.perfume_family_notes || '');

      // Metafield: custom.fragrance_notes (si Type = "Parfum")
      const metafieldFragranceNotes = escapeCSV(rd.fragrance_notes || '');

      // Metafield: custom.color_hex (si Type = "Maquillage")
      const metafieldColorHex = escapeCSV(rd.color_hex || pd.makeup_color_hex || '');

      // Metafield: custom.lot_number
      const metafieldLotNumber = escapeCSV(rd.lot_number || pd.lot_number || '');

      // Metafield: custom.expiration_date (extrait de revalorisation_details)
      const metafieldExpirationDate = extractExpirationDate(
        rd.revalorisation_details || pd.revalorisation_details || ''
      );

      // ============================================
      // Construction de la ligne CSV
      // Note: Les données internes sont exclues:
      // - revalorisation_reason
      // - commission_greez_ttc
      // - price_greez_ht
      // - price_greez_ttc
      // - defect_images
      // - confirm_accuracy
      // - confirm_sale
      // ============================================
      const row = [
        escapeCSV(title),                    // Title
        escapeCSV(vendor),                   // Vendor
        escapeCSV(productType),              // Product Type
        escapeCSV(bodyHtml),                 // Body (HTML)
        escapeCSV(tags),                     // Tags
        escapeCSV(variantSku),                // Variant SKU
        formatNumber(variantPrice),           // Variant Price (Prix final TTC avec commission)
        formatNumber(variantCompareAt),       // Variant Compare At Price (Prix standard TTC)
        String(variantQty || 0),             // Variant Inventory Qty
        variantWeight,                       // Variant Weight
        variantWeightUnit,                   // Variant Weight Unit
        escapeCSV(barcode),                  // Variant Barcode
        escapeCSV(hsCode),                   // Variant HS Code
        escapeCSV(imageSrc),                 // Image Src
        escapeCSV(altText),                  // Image Alt Text
        // Metafields Shopify
        metafieldSubtitle,                   // Metafield: custom.subtitle
        metafieldInci,                       // Metafield: custom.inci
        metafieldUsage,                      // Metafield: custom.usage
        metafieldEndocrineDisruptors,        // Metafield: custom.endocrine_disruptors
        metafieldFragranceFamily,            // Metafield: custom.fragrance_family
        metafieldFragranceNotes,             // Metafield: custom.fragrance_notes
        metafieldColorHex,                   // Metafield: custom.color_hex
        metafieldLotNumber,                   // Metafield: custom.lot_number
        metafieldExpirationDate,              // Metafield: custom.expiration_date
      ];

      // Encapsuler chaque cellule dans des guillemets doubles
      csvRows.push(row.map(cell => `"${cell}"`).join(','));
      exportedProductIds.push(product.id);
    }

    // Marquer les produits comme exportés
    const exportDate = new Date().toISOString();
    for (const productId of exportedProductIds) {
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('raw_data')
        .eq('id', productId)
        .single();
      
      const updatedRawData = {
        ...(product?.raw_data || {}),
        shopify_exported_at: exportDate,
        shopify_exported: true,
      };
      
      await supabaseAdmin
        .from('products')
        .update({
          raw_data: updatedRawData,
          updated_at: exportDate,
        })
        .eq('id', productId);
    }

    // Générer le CSV en UTF-8
    const csvContent = csvRows.join('\n');
    const csvBuffer = Buffer.from(csvContent, 'utf-8');

    // Vérifier la taille du fichier (limite de 15 Mo)
    const maxSize = 15 * 1024 * 1024; // 15 Mo
    if (csvBuffer.length > maxSize) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Le fichier CSV est trop volumineux (${(csvBuffer.length / 1024 / 1024).toFixed(2)} Mo). La limite est de 15 Mo. Veuillez sélectionner moins de produits.` 
        },
        { status: 400 }
      );
    }

    return new NextResponse(csvBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="export-shopify-${submissionId}-${Date.now()}.csv"`,
        'Content-Length': csvBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('Erreur export Shopify:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur lors de l\'export vers Shopify' },
      { status: 500 }
    );
  }
}

