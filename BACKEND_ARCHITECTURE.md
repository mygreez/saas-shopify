# 🏗️ Architecture Backend - SaaS Shopify Product Manager

## 📋 Vue d'ensemble

Architecture modulaire basée sur **Next.js API Routes + Prisma + PostgreSQL** pour centraliser et gérer les données produits avant publication Shopify.

## 🗂️ Structure du Projet

```
app/
├── api/
│   ├── imports/
│   │   └── products/
│   │       └── route.ts          # POST /api/imports/products
│   ├── uploads/
│   │   └── images/
│   │       └── route.ts          # POST /api/uploads/images
│   ├── shopify/
│   │   ├── publish/
│   │   │   └── [productId]/
│   │   │       └── route.ts      # POST /api/shopify/publish/:productId
│   │   └── validate/
│   │       └── route.ts          # POST /api/shopify/validate
│   └── products/
│       ├── route.ts              # GET /api/products (liste)
│       └── [id]/
│           └── route.ts          # GET/PUT/DELETE /api/products/:id
│
lib/
├── prisma/
│   └── client.ts                 # Client Prisma singleton
├── services/
│   ├── excel/
│   │   ├── parser.ts             # Parse CSV/XLSX
│   │   └── mapper.ts             # Map colonnes → modèle
│   ├── image/
│   │   ├── uploader.ts           # Upload S3
│   │   └── processor.ts          # Optimisation images
│   ├── shopify/
│   │   ├── client.ts             # Client Shopify GraphQL
│   │   ├── transformer.ts       # Transform Product → Shopify format
│   │   └── publisher.ts          # Publier sur Shopify
│   └── validation/
│       ├── product.ts            # Validation produits
│       └── variant.ts            # Validation variantes
├── utils/
│   ├── errors.ts                 # Gestion erreurs
│   └── logger.ts                 # Logging
└── types/
    └── index.ts                  # Types TypeScript

prisma/
├── schema.prisma                 # Schéma Prisma complet
└── migrations/                   # Migrations Prisma
```

## 🔄 Flow de Données

### 1. Import Excel
```
Client → POST /api/imports/products
  ↓
Excel Parser → Parse CSV/XLSX
  ↓
Column Mapper → Map colonnes standards
  ↓
Validator → Valider données
  ↓
Prisma → Créer Products + Variants + ImportJob
  ↓
Response → { jobId, products, errors }
```

### 2. Upload Images
```
Client → POST /api/uploads/images
  ↓
Image Processor → Optimiser/Redimensionner
  ↓
S3 Uploader → Upload vers S3
  ↓
Prisma → Associer Image → Product
  ↓
Response → { images: [{ url, position }] }
```

### 3. Publication Shopify
```
Client → POST /api/shopify/publish/:productId
  ↓
Validator → Vérifier produit complet
  ↓
Shopify Transformer → Format Shopify
  ↓
Shopify Publisher → API GraphQL
  ↓
Prisma → Update status + shopifyProductId
  ↓
Response → { shopifyProductId, status }
```

## 📊 Modèles de Données (Prisma)

### User
- id, email, role (ADMIN | PARTNER), createdAt, updatedAt

### Store
- id, shopifyShop, accessToken, ownerId, createdAt, updatedAt

### Partner
- id, name, storeId, userId, createdAt, updatedAt

### Product
- id, title, description, vendor, status (DRAFT | READY | PUBLISHED)
- storeId, partnerId (nullable)
- shopifyProductId (nullable)
- createdAt, updatedAt

### Variant
- id, productId, option1Name, option1Value, option2Name, option2Value
- price, sku, inventoryQty
- createdAt, updatedAt

### Image
- id, productId, url, position, alt
- createdAt, updatedAt

### ImportJob
- id, status (PENDING | PROCESSING | COMPLETED | FAILED)
- errors (JSON), fileUrl
- userId, storeId
- createdAt, updatedAt

## 🔐 Sécurité

- **Auth** : NextAuth.js (déjà en place)
- **Rôles** : ADMIN peut tout, PARTNER peut créer ses produits
- **Validation** : Zod pour tous les inputs
- **Rate Limiting** : À implémenter si nécessaire

## 🚀 Prochaines Étapes

1. ✅ Créer schéma Prisma
2. ✅ Implémenter services Excel
3. ✅ Implémenter services Image
4. ✅ Implémenter services Shopify
5. ✅ Créer endpoints API
6. ✅ Tests et documentation




