# 📡 Documentation API - GREEZ SaaS

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Authentification

⚠️ **À implémenter** : Actuellement, les endpoints utilisent un `user_id` en dur.  
Dans la version finale, utiliser NextAuth.js ou JWT.

---

## 🔐 Module 1: Shopify OAuth

### Initier l'OAuth

```http
GET /api/shopify/auth/init?shop={shop_domain}
```

**Paramètres** :
- `shop` (required) : Domaine Shopify (ex: `ma-boutique.myshopify.com`)

**Réponse** :
```json
{
  "auth_url": "https://ma-boutique.myshopify.com/admin/oauth/authorize?...",
  "nonce": "random_string"
}
```

**Erreurs** :
- `400` : Paramètre `shop` manquant ou invalide

---

### Callback OAuth

```http
GET /api/shopify/auth/callback?shop={shop}&code={code}&hmac={hmac}&...
```

**Paramètres** (fournis par Shopify) :
- `shop` : Domaine Shopify
- `code` : Code d'autorisation
- `hmac` : Signature HMAC
- `state` : Nonce (à vérifier)

**Réponse** :
- Redirection vers `/dashboard?shop={shop}` en cas de succès
- Redirection vers `/auth/error?reason={reason}` en cas d'erreur

**Erreurs** :
- `invalid_signature` : Signature HMAC invalide
- `missing_params` : Paramètres manquants
- `db_error` : Erreur base de données

---

### Liste des Produits Shopify

```http
GET /api/shopify/products?shop={shop_domain}
```

**Paramètres** :
- `shop` (required) : Domaine Shopify

**Réponse** :
```json
{
  "success": true,
  "data": [
    {
      "id": 123456,
      "title": "T-Shirt Premium",
      "body_html": "...",
      "vendor": "...",
      "status": "active",
      ...
    }
  ]
}
```

**Erreurs** :
- `400` : Paramètre `shop` manquant
- `404` : Connexion Shopify non trouvée
- `500` : Erreur serveur

---

## 📦 Module 2: Produits

### Générer le Contenu IA

```http
POST /api/products/generate
```

**Body** :
```json
{
  "name": "T-Shirt Premium",
  "category": "Hauts",
  "material": "Coton 100%",
  "style": "Streetwear, minimal",
  "price": 49.90,
  "images": [
    "https://cdn.shopify.com/.../image1.jpg"
  ],
  "variants": [
    {
      "title": "S / Noir",
      "price": "49.90",
      "option1": "S",
      "option2": "Noir"
    }
  ],
  "shop_domain": "ma-boutique.myshopify.com"
}
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "content": {
      "title": "T-Shirt Premium - Streetwear Essentiel",
      "short_description": "...",
      "long_description": "...",
      "bullet_points": ["...", "..."],
      "tags": ["streetwear", "premium"],
      "meta_title": "...",
      "meta_description": "..."
    },
    "tokens_used": 1250,
    "cost": 0.0125,
    "latency_ms": 2340
  }
}
```

**Erreurs** :
- `400` : Données invalides (validation Zod)
- `500` : Erreur génération IA

---

### Créer un Produit (Draft)

```http
POST /api/products/create
```

**Body** :
```json
{
  "name": "T-Shirt Premium",
  "category": "Hauts",
  "material": "Coton 100%",
  "price": 49.90,
  "images": ["https://..."],
  "variants": [...],
  "generated_content": {
    "title": "...",
    "short_description": "...",
    ...
  },
  "shop_domain": "ma-boutique.myshopify.com"
}
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "T-Shirt Premium",
    "status": "draft",
    ...
  }
}
```

---

### Publier un Produit vers Shopify

```http
POST /api/products/{id}/publish
```

**Paramètres** :
- `id` (path) : ID du produit en base

**Réponse** :
```json
{
  "success": true,
  "data": {
    "product_id": "uuid",
    "shopify_product_id": 123456,
    "shopify_url": "https://ma-boutique.myshopify.com/admin/products/123456"
  }
}
```

**Erreurs** :
- `404` : Produit non trouvé
- `400` : Aucune connexion Shopify associée
- `500` : Erreur publication Shopify

---

### Récupérer Images 360°

```http
GET /api/products/{id}/360
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "product_id": "uuid",
    "product_name": "T-Shirt Premium",
    "images": ["https://...", "https://..."],
    "viewer_type": "rotating"
  }
}
```

---

## 🎨 Module 3: Prompt System

### Récupérer la Config

```http
GET /api/prompt-system/config?shop={shop_domain}
```

**Paramètres** :
- `shop` (required) : Domaine Shopify

**Réponse** :
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "shop_domain": "ma-boutique.myshopify.com",
    "config": {
      "brand_voice": {
        "positioning": "streetwear premium",
        "tone": "urbain, minimal",
        ...
      },
      "structure": {...},
      "examples": [...],
      "rules": {...}
    }
  }
}
```

**Réponse si aucune config** :
```json
{
  "success": true,
  "data": null
}
```

---

### Mettre à Jour la Config

```http
PUT /api/prompt-system/config
```

**Body** :
```json
{
  "shop_domain": "ma-boutique.myshopify.com",
  "config": {
    "brand_voice": {
      "positioning": "streetwear premium",
      "tone": "urbain, minimal, authentique",
      "target": "18-35 ans, urbains",
      "values": ["qualité", "durabilité"],
      "recurring_words": ["essentiel", "iconique"],
      "do_not_say": ["tendance", "mode"]
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
        "product_name": "T-Shirt Essential",
        "generated_content": {...}
      }
    ],
    "rules": {
      "never_invent_data": true,
      "always_mention_material": true,
      "stay_brand_coherent": true,
      "never_use_forbidden_words": true
    }
  }
}
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "config": {...},
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Erreurs** :
- `400` : Config invalide (validation Zod)
- `500` : Erreur sauvegarde

---

## 📊 Codes de Statut HTTP

- `200` : Succès
- `400` : Requête invalide (validation)
- `404` : Ressource non trouvée
- `500` : Erreur serveur

---

## 🔒 Sécurité

1. **Tokens Shopify** : Chiffrés en base (AES-256)
2. **Validation HMAC** : Tous les callbacks OAuth sont vérifiés
3. **Validation Input** : Tous les inputs validés avec Zod
4. **CORS** : À configurer selon l'environnement

---

## 📝 Notes

- Tous les produits sont créés en **draft** par défaut sur Shopify
- Les prompts IA ne sont **jamais stockés en clair**
- Les coûts IA sont loggés dans `ai_generation_logs`
- Rate limiting à implémenter sur `/api/products/generate`

