// ============================================
// CONSTRUCTEUR DE PROMPT IA
// ============================================

import { PromptConfig, ProductInput } from '@/types';

/**
 * Construit le prompt interne pour l'IA
 * ⚠️ Ce prompt n'est jamais stocké en clair côté front
 */
export function buildAIPrompt(
  productInput: ProductInput,
  promptConfig: PromptConfig
): string {
  const { brand_voice, structure, examples, rules } = promptConfig;

  // Section ADN de marque
  const brandSection = `
TON DE VOIX ET POSITIONNEMENT :
- Positionnement : ${brand_voice.positioning}
- Ton : ${brand_voice.tone}
- Cible : ${brand_voice.target}
- Valeurs clés : ${brand_voice.values.join(', ')}
- Mots récurrents à utiliser : ${brand_voice.recurring_words.join(', ')}
- Mots INTERDITS (ne jamais utiliser) : ${brand_voice.do_not_say.join(', ')}
`;

  // Section structure
  const structureSection = `
STRUCTURE REQUISE :
- Titre : ${structure.title_length} (${getLengthDescription(structure.title_length)})
- Description courte : ${structure.short_desc_length} (${getLengthDescription(structure.short_desc_length)})
- Description longue : ${structure.long_desc_length} (${getLengthDescription(structure.long_desc_length)})
- Bullet points : ${structure.bullet_points_enabled ? `Oui, ${structure.bullet_count} points` : 'Non'}
- Storytelling : ${structure.storytelling_enabled ? 'Oui' : 'Non'}
- CTA obligatoire : ${structure.cta_required ? 'Oui' : 'Non'}
- Format SEO :
  * Utiliser H2 : ${structure.seo_format.use_h2 ? 'Oui' : 'Non'}
  * Phrases courtes : ${structure.seo_format.short_sentences ? 'Oui' : 'Non'}
  * Densité keywords : ${structure.seo_format.keyword_density * 100}%
`;

  // Section règles strictes
  const rulesSection = `
RÈGLES STRICTES (À RESPECTER ABSOLUMENT) :
${rules.never_invent_data ? '✓ Ne JAMAIS inventer de données (prix, dimensions, caractéristiques)' : ''}
${rules.always_mention_material ? '✓ TOUJOURS mentionner la matière si disponible' : ''}
${rules.stay_brand_coherent ? '✓ Rester cohérent avec le positionnement de la marque' : ''}
${rules.never_use_forbidden_words ? '✓ Ne JAMAIS utiliser les mots interdits listés ci-dessus' : ''}
`;

  // Section exemples (few-shot learning)
  const examplesSection = examples.length > 0
    ? `
EXEMPLES DE RÉFÉRENCE (style à reproduire) :
${examples.map((example, idx) => `
Exemple ${idx + 1} - ${example.product_name}:
Titre: ${example.generated_content.title}
Description courte: ${example.generated_content.short_description}
Description longue: ${example.generated_content.long_description}
Bullet points: ${example.generated_content.bullet_points.join(' | ')}
Tags: ${example.generated_content.tags.join(', ')}
`).join('\n---\n')}
`
    : '';

  // Section produit à décrire
  const productSection = `
PRODUIT À DÉCRIRE :
- Nom : ${productInput.name}
${productInput.category ? `- Catégorie : ${productInput.category}` : ''}
${productInput.material ? `- Matière : ${productInput.material}` : ''}
${productInput.style ? `- Style / Positionnement : ${productInput.style}` : ''}
${productInput.price ? `- Prix : ${productInput.price}€` : ''}
${productInput.images.length > 0 ? `- Images disponibles : ${productInput.images.length} image(s)` : ''}
${productInput.variants.length > 0 ? `- Variantes : ${productInput.variants.map(v => v.title).join(', ')}` : ''}
`;

  // Prompt final
  const fullPrompt = `
Tu es un expert en rédaction e-commerce pour une marque ${brand_voice.positioning}.

${brandSection}

${structureSection}

${rulesSection}

${examplesSection}

${productSection}

Génère une fiche produit complète et optimisée au format JSON suivant :
{
  "title": "titre optimisé SEO",
  "short_description": "description courte accrocheuse",
  "long_description": "description longue avec storytelling si activé",
  "bullet_points": ["point 1", "point 2", ...],
  "tags": ["tag1", "tag2", ...],
  "meta_title": "meta title SEO (max 60 caractères)",
  "meta_description": "meta description SEO (max 160 caractères)"
}

IMPORTANT : 
- Respecte scrupuleusement le ton et le positionnement de la marque
- N'invente JAMAIS de données
- Utilise les mots récurrents naturellement
- Évite absolument les mots interdits
- Sois authentique et cohérent avec l'ADN de la marque
`;

  return fullPrompt;
}

/**
 * Helper pour décrire les longueurs
 */
function getLengthDescription(length: 'short' | 'medium' | 'long'): string {
  switch (length) {
    case 'short':
      return '50-100 caractères';
    case 'medium':
      return '100-200 caractères';
    case 'long':
      return '200+ caractères';
    default:
      return '';
  }
}

