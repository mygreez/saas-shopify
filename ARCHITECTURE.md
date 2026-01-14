# 🏗️ Architecture - Mini-SaaS Shopify Product Generator

## Vue d'ensemble

Application SaaS B2B permettant aux marques e-commerce de générer automatiquement des fiches produits optimisées pour Shopify via IA calibrée.

---

## 🎯 Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Auth       │  │   Products   │  │   Prompt    │      │
│  │   Shopify    │  │   Creator    │  │   System    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  360 Viewer  │  │   Dashboard  │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ API Calls
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js/Next.js API)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Shopify     │  │   AI         │  │   Product    │      │
│  │  OAuth       │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  Supabase    │ │   OpenAI/    │ │   Shopify    │
    │  PostgreSQL  │ │   Claude     │ │   API        │
    └──────────────┘ └──────────────┘ └──────────────┘
```

---

## 📦 Modules Principaux

### MODULE 1 : Connexion Shopify
**Responsabilité** : Authentification OAuth et gestion des tokens

**Flux** :
1. Redirection vers Shopify OAuth
2. Callback avec code d'autorisation
3. Échange code → access_token
4. Stockage token (chiffré) en base
5. Récupération données boutique (produits, collections, vendors)

**Endpoints** :
- `GET /api/shopify/auth/init` - Initie l'OAuth
- `GET /api/shopify/auth/callback` - Gère le callback
- `GET /api/shopify/products` - Liste produits
- `GET /api/shopify/collections` - Liste collections
- `GET /api/shopify/vendors` - Liste vendors

---

### MODULE 2 : Création Rapide de Produit
**Responsabilité** : Interface de création et génération IA

**Flux** :
1. Saisie données produit (nom, catégorie, matière, prix, images)
2. Appel service IA avec calibration
3. Génération contenu (titre, descriptions, SEO, tags)
4. Prévisualisation et édition
5. Push vers Shopify (draft)

**Endpoints** :
- `POST /api/products/generate` - Génère contenu IA
- `POST /api/products/create` - Crée produit en draft
- `PUT /api/products/:id` - Met à jour produit
- `POST /api/products/:id/publish` - Publie produit

---

### MODULE 3 : Prompt System (Calibration IA)
**Responsabilité** : Configuration de l'ADN de marque et règles de génération

**Structure de données** :
```json
{
  "brand_voice": {
    "positioning": "streetwear premium",
    "tone": "urbain, minimal, authentique",
    "target": "18-35 ans, urbains, créatifs",
    "values": ["qualité", "durabilité", "style"],
    "recurring_words": ["essentiel", "iconique", "intemporel"],
    "do_not_say": ["tendance", "mode", "fashion"]
  },
  "structure": {
    "title_length": "medium", // short/medium/long
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
      "product_name": "...",
      "generated_content": {
        "title": "...",
        "short_desc": "...",
        "long_desc": "...",
        "bullets": [...]
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

**Endpoints** :
- `GET /api/prompt-system/config` - Récupère config
- `PUT /api/prompt-system/config` - Met à jour config
- `POST /api/prompt-system/examples` - Ajoute exemple
- `DELETE /api/prompt-system/examples/:id` - Supprime exemple

---

### MODULE 4 : Génération IA (Backend)
**Responsabilité** : Construction du prompt interne et appel API IA

**Flux** :
1. Récupération config calibration
2. Construction prompt structuré (jamais stocké en clair)
3. Appel OpenAI/Claude avec prompt
4. Parsing et validation réponse
5. Retour contenu structuré

**Service** : `services/ai/generator.ts`

**Prompt Template** (exemple) :
```
Tu es un expert en rédaction e-commerce pour [BRAND_POSITIONING].

TON DE VOIX :
- [TONE]
- Cible : [TARGET]
- Valeurs : [VALUES]

RÈGLES STRICTES :
- Ne jamais inventer de données
- Toujours mentionner la matière si disponible
- Ne jamais utiliser : [DO_NOT_SAY]
- Utiliser ces mots récurrents : [RECURRING_WORDS]

STRUCTURE REQUISE :
- Titre : [TITLE_LENGTH]
- Description courte : [SHORT_DESC_LENGTH]
- Description longue : [LONG_DESC_LENGTH]
- Bullet points : [BULLET_COUNT] points
- Storytelling : [STORYTELLING_ENABLED]

EXEMPLES DE RÉFÉRENCE :
[EXAMPLES]

PRODUIT À DÉCRIRE :
- Nom : [PRODUCT_NAME]
- Catégorie : [CATEGORY]
- Matière : [MATERIAL]
- Style : [STYLE]
- Prix : [PRICE]

Génère une fiche produit complète au format JSON.
```

**Endpoints** :
- `POST /api/ai/generate` - Génère contenu (interne)

---

### MODULE 5 : Visualisation 360° (POC)
**Responsabilité** : Présentation produit avec viewer 360°

**Technologie** : React 360 viewer simple (images rotatives)

**Endpoints** :
- `GET /api/products/:id/360` - Récupère images 360°
- `GET /demo/:productId` - Page démo publique

---

## 🗄️ Schéma de Base de Données

### Table : `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table : `shopify_connections`
```sql
CREATE TABLE shopify_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  shop_domain VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL, -- Chiffré
  scope TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, shop_domain)
);
```

### Table : `prompt_configs`
```sql
CREATE TABLE prompt_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  shop_domain VARCHAR(255) NOT NULL,
  config JSONB NOT NULL, -- Structure complète de calibration
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, shop_domain)
);
```

### Table : `products`
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  shopify_product_id VARCHAR(255), -- ID Shopify si publié
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  material VARCHAR(100),
  style VARCHAR(100),
  price DECIMAL(10,2),
  images JSONB, -- Array d'URLs
  variants JSONB, -- Array de variantes
  generated_content JSONB, -- Contenu généré par IA
  status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table : `product_examples`
```sql
CREATE TABLE product_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_config_id UUID REFERENCES prompt_configs(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  generated_content JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔐 Sécurité

1. **Tokens Shopify** : Chiffrement AES-256 en base
2. **API Keys IA** : Variables d'environnement, jamais en base
3. **Validation** : Zod pour tous les inputs
4. **Rate Limiting** : Limite appels IA (ex: 100/jour/user)
5. **CORS** : Configuration stricte
6. **Auth** : Session-based avec NextAuth ou JWT

---

## 📊 Flux Complet : Création Produit → Shopify

```
1. User saisit données produit
   ↓
2. Frontend → POST /api/products/generate
   ↓
3. Backend récupère config calibration
   ↓
4. Backend construit prompt interne
   ↓
5. Backend → OpenAI/Claude API
   ↓
6. Backend parse et valide réponse
   ↓
7. Backend sauvegarde en draft (table products)
   ↓
8. User édite si besoin
   ↓
9. User clique "Publier"
   ↓
10. Backend → POST /api/products/:id/publish
    ↓
11. Backend récupère token Shopify (déchiffré)
    ↓
12. Backend → Shopify Admin API (POST /products.json)
    ↓
13. Backend met à jour products.shopify_product_id
    ↓
14. Frontend affiche succès
```

---

## 🚀 Stack Technique

- **Frontend** : Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend** : Next.js API Routes
- **Database** : Supabase (PostgreSQL)
- **Auth** : NextAuth.js + Shopify OAuth
- **IA** : OpenAI GPT-4 / Anthropic Claude
- **Validation** : Zod
- **HTTP Client** : Axios / Fetch
- **UI Components** : shadcn/ui (optionnel)

---

## 📝 Bonnes Pratiques

1. **Validation** : Toujours valider inputs avec Zod
2. **Error Handling** : Try/catch systématique, logs structurés
3. **Rate Limiting** : Limiter appels IA par user
4. **Caching** : Cache config calibration (Redis optionnel)
5. **Monitoring** : Logs des appels IA (coût, latence)
6. **Tests** : Tests unitaires pour services critiques
7. **Documentation** : OpenAPI/Swagger pour API

---

## 🔄 Évolutions Futures (Post-MVP)

- Multi-boutiques par user
- Templates de produits réutilisables
- Historique des générations
- A/B testing des contenus
- Analytics de performance produits
- Export CSV/Excel
- Intégration autres marketplaces

