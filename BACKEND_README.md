# 🚀 Backend - SaaS Shopify Product Manager

## 📋 Vue d'ensemble

Backend modulaire pour centraliser et gérer les données produits avant publication sur Shopify.

**Stack** : Next.js API Routes + Prisma + PostgreSQL + S3 + Shopify GraphQL API

---

## 🏗️ Architecture

```
lib/
├── prisma/client.ts          # Client Prisma singleton
├── services/
│   ├── excel/                # Parser + Mapper Excel
│   ├── image/                # Uploader S3 + Processor
│   ├── shopify/              # Client + Transformer + Publisher
│   └── validation/           # Validators produits/variantes
└── types/                    # Types TypeScript
```

---

## 🔄 Flow Backend Complet

### 1️⃣ Import Excel → Produits

```
POST /api/imports/products
Body: FormData {
  file: File (CSV/XLSX)
  storeId: string
  partnerId?: string
}

Flow:
1. Parser Excel → Lignes brutes
2. Mapper colonnes → Produits + Variantes
3. Valider données (titre, prix, SKU unique)
4. Créer Products + Variants en base
5. Retourner { jobId, productsCreated, errors }
```

**Exemple de requête** :
```bash
curl -X POST http://localhost:3000/api/imports/products \
  -F "file=@products.xlsx" \
  -F "storeId=xxx-xxx-xxx" \
  -H "Authorization: Bearer <token>"
```

**Réponse** :
```json
{
  "jobId": "xxx-xxx-xxx",
  "status": "COMPLETED",
  "productsCreated": 15,
  "errors": []
}
```

---

### 2️⃣ Upload Images → Produit

```
POST /api/uploads/images
Body: FormData {
  productId: string
  files: File[] (images)
}

Flow:
1. Valider images (type, taille)
2. Upload vers S3
3. Créer Image records en base
4. Associer à Product
5. Retourner { images: [{ id, url, position }] }
```

**Exemple de requête** :
```bash
curl -X POST http://localhost:3000/api/uploads/images \
  -F "productId=xxx-xxx-xxx" \
  -F "files=@image1.jpg" \
  -F "files=@image2.jpg" \
  -H "Authorization: Bearer <token>"
```

**Réponse** :
```json
{
  "images": [
    {
      "id": "xxx-xxx-xxx",
      "url": "https://s3.../products/uuid.jpg",
      "position": 0
    }
  ]
}
```

---

### 3️⃣ Publication Shopify

```
POST /api/shopify/publish/:productId
Body: {
  storeId: string
}

Flow:
1. Vérifier produit READY
2. Transformer Product → Shopify format
3. Appel Shopify GraphQL API
4. Update status → PUBLISHED
5. Retourner { shopifyProductId, productUrl }
```

**Exemple de requête** :
```bash
curl -X POST http://localhost:3000/api/shopify/publish/xxx-xxx-xxx \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"storeId": "xxx-xxx-xxx"}'
```

**Réponse** :
```json
{
  "shopifyProductId": "gid://shopify/Product/123456",
  "status": "PUBLISHED",
  "productUrl": "https://store.myshopify.com/products/product-handle"
}
```

---

## 📊 Modèles de Données (Prisma)

### Product Status Flow
```
DRAFT → READY → PUBLISHED
  ↓       ↓
ARCHIVED
```

- **DRAFT** : Produit incomplet (manque image, variante, etc.)
- **READY** : Produit complet, prêt à publier
- **PUBLISHED** : Publié sur Shopify
- **ARCHIVED** : Archivé

### Relations
```
User → Store (1:N)
User → Partner (1:1)
Store → Product (1:N)
Product → Variant (1:N)
Product → Image (1:N)
Product → ImportJob (via store)
```

---

## 🔐 Sécurité

- **Auth** : NextAuth.js (récupération userId via `getUserId()`)
- **Rôles** : ADMIN peut tout, PARTNER peut créer ses produits
- **Validation** : Zod pour tous les inputs
- **S3** : Configuration via variables d'environnement

---

## ⚙️ Configuration

### Variables d'environnement requises

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# S3 (pour images)
S3_ENDPOINT="https://s3.amazonaws.com"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="xxx"
S3_SECRET_ACCESS_KEY="xxx"
S3_BUCKET="my-bucket"

# Shopify (stocké en base via Store model)
# Pas besoin de variables d'env
```

---

## 🚀 Installation

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer Prisma

```bash
# Générer le client Prisma
npm run prisma:generate

# Créer les migrations
npm run prisma:migrate

# (Optionnel) Ouvrir Prisma Studio
npm run prisma:studio
```

### 3. Configurer les variables d'environnement

Copier `.env.example` vers `.env.local` et remplir les valeurs.

---

## 📝 Format Excel Attendu

### Colonnes supportées (mapping automatique)

| Colonne Excel | Mapped To | Obligatoire |
|--------------|-----------|-------------|
| `title`, `name`, `product name` | `title` | ✅ Oui |
| `description`, `body` | `description` | ❌ Non |
| `vendor`, `brand` | `vendor` | ❌ Non |
| `option1 name`, `size` | `option1Name` | ❌ Non |
| `option1 value` | `option1Value` | ❌ Non |
| `option2 name`, `color` | `option2Name` | ❌ Non |
| `option2 value` | `option2Value` | ❌ Non |
| `price`, `variant price` | `price` | ✅ Oui |
| `sku`, `reference` | `sku` | ❌ Non |
| `inventory`, `stock`, `qty` | `inventoryQty` | ❌ Non |

### Exemple CSV

```csv
title,description,vendor,option1 name,option1 value,price,sku
T-Shirt Premium,Superbe t-shirt,T-Shirt Co,Size,L,29.99,TSH-001
T-Shirt Premium,Superbe t-shirt,T-Shirt Co,Size,M,29.99,TSH-002
```

---

## 🧪 Tests

### Test Import Excel

```bash
curl -X POST http://localhost:3000/api/imports/products \
  -F "file=@test-products.xlsx" \
  -F "storeId=xxx"
```

### Test Upload Images

```bash
curl -X POST http://localhost:3000/api/uploads/images \
  -F "productId=xxx" \
  -F "files=@image.jpg"
```

### Test Publication

```bash
curl -X POST http://localhost:3000/api/shopify/publish/xxx \
  -H "Content-Type: application/json" \
  -d '{"storeId": "xxx"}'
```

---

## 📚 Services Disponibles

### ExcelParser
- `parseFile(file: File): Promise<ExcelRow[]>`
- Support CSV et XLSX
- Détection automatique des colonnes

### ExcelMapper
- `mapToProducts(rows: ExcelRow[]): MappedProduct[]`
- Mapping automatique vers colonnes Shopify
- Groupement par titre de produit

### ProductValidator
- `validateProduct(product, rowIndex): ValidationResult`
- `isProductComplete(product): boolean`
- `checkDuplicateSKUs(products): ValidationError[]`

### ImageUploader
- `uploadImage(file, folder): Promise<string>`
- `uploadImages(files, folder): Promise<string[]>`
- Configuration S3 via variables d'env

### ShopifyPublisher
- `publishProduct(productId, client): Promise<{shopifyProductId, productUrl}>`
- Gestion automatique des emplacements de stock
- Transformation automatique vers format Shopify

---

## 🐛 Debug

### Logs
Les logs sont affichés dans la console avec préfixes :
- `[INFO]` : Informations générales
- `[ERROR]` : Erreurs
- `[WARN]` : Avertissements
- `[DEBUG]` : Debug (dev uniquement)

### Prisma Studio
```bash
npm run prisma:studio
```
Ouvre une interface graphique pour explorer la base de données.

---

## 📖 Documentation Complète

- **Architecture** : `BACKEND_ARCHITECTURE.md`
- **Schéma Prisma** : `prisma/schema.prisma`
- **Types** : `lib/types/index.ts`

---

## ✅ Checklist Déploiement

- [ ] Variables d'environnement configurées
- [ ] Prisma migrations appliquées
- [ ] S3 configuré et accessible
- [ ] Shopify API credentials en base (Store model)
- [ ] Tests endpoints effectués
- [ ] Logs configurés

---

**Créé avec ❤️ pour centraliser vos produits Shopify**




