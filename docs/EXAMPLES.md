# 📝 Exemples et Cas d'Usage

## Exemple de Prompt IA Généré Dynamiquement

Voici un exemple concret de prompt généré à partir d'une configuration de calibration :

### Configuration de Calibration (Stockée en Base)

```json
{
  "brand_voice": {
    "positioning": "streetwear premium",
    "tone": "urbain, minimal, authentique",
    "target": "18-35 ans, urbains, créatifs, sensibles au design",
    "values": ["qualité", "durabilité", "style intemporel", "authenticité"],
    "recurring_words": ["essentiel", "iconique", "intemporel", "premium"],
    "do_not_say": ["tendance", "mode", "fashion", "tendance", "in"]
  },
  "structure": {
    "title_length": "medium",
    "short_desc_length": "short",
    "long_desc_length": "long",
    "storytelling_enabled": true,
    "bullet_points_enabled": true,
    "bullet_count": 5,
    "cta_required": true,
    "seo_format": {
      "use_h2": true,
      "short_sentences": true,
      "keyword_density": 0.02
    }
  },
  "examples": [
    {
      "product_name": "T-Shirt Essential Noir",
      "generated_content": {
        "title": "T-Shirt Essential Noir - Streetwear Premium",
        "short_description": "L'essentiel réinventé. Un t-shirt iconique qui transcende les saisons.",
        "long_description": "Le T-Shirt Essential Noir incarne l'essence du streetwear premium. Conçu pour durer, ce vêtement intemporel s'adapte à tous les styles. Matière premium, coupe parfaite, finitions soignées. Un incontournable de la garde-robe moderne.",
        "bullet_points": [
          "100% coton bio premium",
          "Coupe regular fit",
          "Finitions surpiquées renforcées",
          "Made in Europe",
          "Lavable en machine"
        ],
        "tags": ["streetwear", "premium", "essentiel", "noir", "basique"],
        "meta_title": "T-Shirt Essential Noir - Streetwear Premium",
        "meta_description": "T-shirt streetwear premium en coton bio. Essentiel intemporel pour une garde-robe moderne. Qualité premium, style authentique."
      }
    }
  ],
  "rules": {
    "never_invent_data": true,
    "always_mention_material": true,
    "stay_brand_coherent": true,
    "never_use_forbidden_words": true
  }
}
```

### Produit à Générer

```json
{
  "name": "Sweat à Capuche Oversized Beige",
  "category": "Hauts",
  "material": "Coton 80% / Polyester 20%",
  "style": "Oversized, streetwear, confort",
  "price": 89.90,
  "images": [
    "https://cdn.shopify.com/.../sweat-1.jpg",
    "https://cdn.shopify.com/.../sweat-2.jpg"
  ],
  "variants": [
    {
      "title": "S / Beige",
      "price": "89.90",
      "option1": "S",
      "option2": "Beige"
    },
    {
      "title": "M / Beige",
      "price": "89.90",
      "option1": "M",
      "option2": "Beige"
    }
  ]
}
```

### Prompt Final Généré (Interne - Jamais Exposé)

```
Tu es un expert en rédaction e-commerce pour une marque streetwear premium.

TON DE VOIX ET POSITIONNEMENT :
- Positionnement : streetwear premium
- Ton : urbain, minimal, authentique
- Cible : 18-35 ans, urbains, créatifs, sensibles au design
- Valeurs clés : qualité, durabilité, style intemporel, authenticité
- Mots récurrents à utiliser : essentiel, iconique, intemporel, premium
- Mots INTERDITS (ne jamais utiliser) : tendance, mode, fashion, tendance, in

STRUCTURE REQUISE :
- Titre : medium (100-200 caractères)
- Description courte : short (50-100 caractères)
- Description longue : long (200+ caractères)
- Bullet points : Oui, 5 points
- Storytelling : Oui
- CTA obligatoire : Oui
- Format SEO :
  * Utiliser H2 : Oui
  * Phrases courtes : Oui
  * Densité keywords : 2%

RÈGLES STRICTES (À RESPECTER ABSOLUMENT) :
✓ Ne JAMAIS inventer de données (prix, dimensions, caractéristiques)
✓ TOUJOURS mentionner la matière si disponible
✓ Rester cohérent avec le positionnement de la marque
✓ Ne JAMAIS utiliser les mots interdits listés ci-dessus

EXEMPLES DE RÉFÉRENCE (style à reproduire) :

Exemple 1 - T-Shirt Essential Noir:
Titre: T-Shirt Essential Noir - Streetwear Premium
Description courte: L'essentiel réinventé. Un t-shirt iconique qui transcende les saisons.
Description longue: Le T-Shirt Essential Noir incarne l'essence du streetwear premium. Conçu pour durer, ce vêtement intemporel s'adapte à tous les styles. Matière premium, coupe parfaite, finitions soignées. Un incontournable de la garde-robe moderne.
Bullet points: 100% coton bio premium | Coupe regular fit | Finitions surpiquées renforcées | Made in Europe | Lavable en machine
Tags: streetwear, premium, essentiel, noir, basique

---

PRODUIT À DÉCRIRE :
- Nom : Sweat à Capuche Oversized Beige
- Catégorie : Hauts
- Matière : Coton 80% / Polyester 20%
- Style / Positionnement : Oversized, streetwear, confort
- Prix : 89.90€
- Images disponibles : 2 image(s)
- Variantes : S / Beige, M / Beige

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
```

### Réponse IA Générée (Exemple)

```json
{
  "title": "Sweat à Capuche Oversized Beige - Streetwear Premium",
  "short_description": "L'essentiel du confort urbain. Un sweat iconique qui allie style intemporel et qualité premium.",
  "long_description": "## Un Essentiel de la Garde-Robe Moderne\n\nLe Sweat à Capuche Oversized Beige incarne l'essence du streetwear premium. Conçu pour ceux qui recherchent l'authenticité et la qualité, ce vêtement transcende les saisons.\n\n**Qualité Premium**\n\nFabriqué en Coton 80% / Polyester 20%, ce sweat allie confort et durabilité. La matière premium garantit un toucher doux et une résistance dans le temps.\n\n**Style Intemporel**\n\nLa coupe oversized offre un confort optimal tout en conservant une silhouette moderne. Un essentiel qui s'adapte à tous les styles, de la tenue décontractée au look urbain affirmé.\n\n**Finitions Soignées**\n\nChaque détail a été pensé pour durer. Des finitions renforcées aux coutures surpiquées, ce sweat premium est conçu pour résister aux années.\n\n**Un Incontournable**\n\nAjoutez ce sweat iconique à votre garde-robe et découvrez l'authenticité du streetwear premium.",
  "bullet_points": [
    "Matière premium : Coton 80% / Polyester 20%",
    "Coupe oversized pour un confort optimal",
    "Capuche ajustable avec cordons",
    "Poche kangourou fonctionnelle",
    "Lavable en machine, séchage à basse température"
  ],
  "tags": ["streetwear", "premium", "sweat", "oversized", "beige", "confort", "essentiel"],
  "meta_title": "Sweat Capuche Oversized Beige - Streetwear Premium",
  "meta_description": "Sweat à capuche oversized beige en coton premium. Style streetwear intemporel, qualité durable. Essentiel de la garde-robe moderne."
}
```

---

## Flow Complet : Création Produit → Shopify

### 1. User saisit les données produit

```typescript
const productInput = {
  name: "Sweat à Capuche Oversized Beige",
  category: "Hauts",
  material: "Coton 80% / Polyester 20%",
  style: "Oversized, streetwear, confort",
  price: 89.90,
  images: ["https://..."],
  variants: [...]
};
```

### 2. Frontend appelle `/api/products/generate`

```typescript
const response = await fetch('/api/products/generate', {
  method: 'POST',
  body: JSON.stringify({
    ...productInput,
    shop_domain: 'ma-boutique.myshopify.com'
  })
});

const { data } = await response.json();
// data.content contient le GeneratedContent
```

### 3. Backend génère le contenu IA

- Récupère la config de calibration
- Construit le prompt interne
- Appelle OpenAI/Claude
- Parse et valide la réponse
- Log la génération (coût, tokens)

### 4. User édite si besoin

```typescript
// User peut modifier le contenu généré
const editedContent = {
  ...generatedContent,
  title: "Sweat Oversized Beige - Modifié"
};
```

### 5. User sauvegarde en draft

```typescript
await fetch('/api/products/create', {
  method: 'POST',
  body: JSON.stringify({
    ...productInput,
    generated_content: editedContent,
    shop_domain: 'ma-boutique.myshopify.com'
  })
});
```

### 6. User publie vers Shopify

```typescript
await fetch(`/api/products/${productId}/publish`, {
  method: 'POST'
});

// Le produit est créé sur Shopify en statut "draft"
// L'utilisateur peut ensuite le publier depuis Shopify Admin
```

---

## Bonnes Pratiques Implémentées

### 1. Sécurité

- ✅ Tokens Shopify chiffrés (AES-256)
- ✅ Validation HMAC pour OAuth
- ✅ Validation Zod pour tous les inputs
- ✅ Variables d'environnement pour secrets

### 2. Validation

- ✅ Schémas Zod pour tous les endpoints
- ✅ Validation des URLs d'images
- ✅ Validation des prix et quantités
- ✅ Validation des domaines Shopify

### 3. Rate Limiting (À Implémenter)

```typescript
// Exemple avec middleware
const rateLimiter = new RateLimiter({
  tokensPerInterval: 100,
  interval: 'day'
});

// Appliquer sur /api/products/generate
```

### 4. Error Handling

- ✅ Try/catch systématique
- ✅ Messages d'erreur clairs
- ✅ Logs structurés
- ✅ Codes HTTP appropriés

### 5. Monitoring

- ✅ Logs des générations IA (table `ai_generation_logs`)
- ✅ Tracking coûts et tokens
- ✅ Latence mesurée

---

## Évolutions Futures

### Phase 2

- Multi-boutiques par user
- Templates de produits réutilisables
- Historique des générations
- A/B testing des contenus

### Phase 3

- Analytics de performance produits
- Export CSV/Excel
- Intégration autres marketplaces
- API publique pour partenaires

