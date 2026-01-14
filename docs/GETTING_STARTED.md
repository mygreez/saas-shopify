# 🚀 Guide de Démarrage - GREEZ SaaS

## Vue d'Ensemble

Ce projet est un mini-SaaS B2B permettant aux marques e-commerce de générer automatiquement des fiches produits Shopify optimisées via IA calibrée.

## 📋 Prérequis

- Node.js 18+ et npm
- Compte Supabase (PostgreSQL)
- Compte Shopify (pour créer une App OAuth)
- Clé API OpenAI ou Anthropic Claude

## 🔧 Installation

### 1. Cloner et Installer

```bash
cd "greez saas"
npm install
```

### 2. Configuration Supabase

1. Créer un projet sur [Supabase](https://supabase.com)
2. Exécuter le schéma SQL : `database/schema.sql`
3. Récupérer l'URL et les clés API

### 3. Configuration Shopify OAuth

1. Aller sur [Shopify Partners](https://partners.shopify.com)
2. Créer une nouvelle App
3. Configurer les scopes : `read_products`, `write_products`
4. Récupérer `SHOPIFY_API_KEY` et `SHOPIFY_API_SECRET`

### 4. Configuration Variables d'Environnement

Créer un fichier `.env.local` :

```bash
# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32

# Shopify
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_SCOPES=read_products,write_products

# OpenAI
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4-turbo-preview

# Encryption (32 caractères)
ENCRYPTION_KEY=your_32_char_encryption_key
```

### 5. Générer les Secrets

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# ENCRYPTION_KEY (exactement 32 caractères)
openssl rand -hex 16
```

## 🏃 Lancer le Projet

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## 📁 Structure du Projet

```
greez-saas/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   ├── shopify/         # Module 1: OAuth Shopify
│   │   ├── products/        # Module 2: Gestion produits
│   │   └── prompt-system/   # Module 3: Calibration IA
│   ├── (auth)/              # Pages d'authentification
│   ├── dashboard/           # Dashboard principal
│   └── demo/                # Pages démo
├── components/              # Composants React
│   └── Product360Viewer.tsx # Module 5: Viewer 360°
├── lib/                     # Services et utilitaires
│   ├── db/                  # Client Supabase
│   ├── shopify/             # Client Shopify API
│   ├── ai/                  # Module 4: Génération IA
│   │   ├── prompt-builder.ts
│   │   └── generator.ts
│   └── encryption.ts        # Chiffrement tokens
├── types/                   # Types TypeScript
├── database/                # Schémas SQL
└── docs/                    # Documentation
```

## 🔄 Flow Principal

### 1. Connexion Shopify

```
GET /api/shopify/auth/init?shop=ma-boutique.myshopify.com
→ Redirige vers Shopify OAuth
→ Callback: /api/shopify/auth/callback
→ Token stocké (chiffré) en base
```

### 2. Configuration Calibration IA

```
PUT /api/prompt-system/config
Body: {
  shop_domain: "...",
  config: {
    brand_voice: {...},
    structure: {...},
    examples: [...],
    rules: {...}
  }
}
```

### 3. Création Produit

```
POST /api/products/generate
Body: {
  name: "...",
  category: "...",
  material: "...",
  ...
}
→ Génère contenu IA
→ Sauvegarde en draft: POST /api/products/create
→ Publie vers Shopify: POST /api/products/:id/publish
```

## 🧪 Tests Manuels

### Test OAuth Shopify

1. Appeler `/api/shopify/auth/init?shop=test.myshopify.com`
2. Suivre la redirection
3. Autoriser l'app
4. Vérifier le callback et le stockage en base

### Test Génération IA

```bash
curl -X POST http://localhost:3000/api/products/generate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "T-Shirt Premium",
    "category": "Hauts",
    "material": "Coton 100%",
    "price": 49.90,
    "images": ["https://example.com/image.jpg"],
    "shop_domain": "test.myshopify.com"
  }'
```

## ⚠️ Points d'Attention

### 1. Authentification User

Les endpoints utilisent actuellement `'user-id-from-session'` en dur.
**À implémenter** : NextAuth.js ou système de session custom.

### 2. Rate Limiting

Pas de rate limiting implémenté sur les appels IA.
**À implémenter** : Middleware de rate limiting (ex: Upstash Redis).

### 3. Validation HMAC

Le callback OAuth vérifie la signature mais ne vérifie pas le `state` (nonce).
**À améliorer** : Stocker le nonce en session et le vérifier.

### 4. Gestion d'Erreurs

Les erreurs sont loggées mais pas toujours remontées au client de manière structurée.
**À améliorer** : Standardiser les réponses d'erreur.

## 🚀 Prochaines Étapes

1. **Implémenter NextAuth.js** pour l'authentification
2. **Créer les pages frontend** (dashboard, création produit, calibration)
3. **Ajouter rate limiting** sur les endpoints IA
4. **Implémenter les tests** (unitaires + intégration)
5. **Ajouter monitoring** (Sentry, LogRocket, etc.)
6. **Déployer** (Vercel recommandé pour Next.js)

## 📚 Documentation Complémentaire

- [Architecture complète](./ARCHITECTURE.md)
- [Exemples et cas d'usage](./EXAMPLES.md)
- [Schéma de base de données](../database/schema.sql)

## 🆘 Support

Pour toute question ou problème, consulter la documentation ou ouvrir une issue.

