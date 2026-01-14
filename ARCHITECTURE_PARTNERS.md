# 🏗️ Architecture - SaaS Partenaires Shopify

## Vue d'ensemble

SaaS permettant aux marques Shopify de centraliser la collecte de données produit via des partenaires, avec un workflow de validation avant publication.

---

## 🎯 Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Auth       │  │   Dashboard  │  │   Products   │      │
│  │   (Admin/    │  │   (Admin)    │  │   (Partner)  │      │
│  │   Partner)   │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │   Invite     │  │   Upload     │                        │
│  │   Partners   │  │   Images     │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ API Calls
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Next.js API Routes)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Shopify     │  │   Product    │  │   Partner    │      │
│  │  OAuth       │  │   Workflow   │  │   Management │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │   Excel      │  │   Image      │                        │
│  │   Import     │  │   Upload     │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  PostgreSQL  │ │   S3/Storage │ │   Shopify    │
    │  (Supabase)  │ │   (Images)   │ │   API        │
    └──────────────┘ └──────────────┘ └──────────────┘
```

---

## 👥 Rôles Utilisateurs

### 1. Admin / Marque
- Connecte sa boutique Shopify
- Invite des partenaires par email
- Valide/modifie les fiches produit soumises
- Publie les produits sur Shopify
- Accès complet à tous les produits

### 2. Partenaire
- Accède à un espace dédié (via invitation)
- Crée des fiches produit (formulaire ou import Excel)
- Upload des images (drag & drop)
- Soumet les produits à validation
- Voit uniquement ses propres produits

---

## 🔄 Workflow Produit

```
┌─────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│ DRAFT   │ ───> │ PENDING  │ ───> │ APPROVED │ ───> │ PUBLISHED│
│         │      │          │      │          │      │          │
│ (Brouillon)    │ (En      │      │ (Validé) │      │ (Sur     │
│                │ attente) │      │          │      │ Shopify) │
└─────────┘      └──────────┘      └──────────┘      └──────────┘
     │                │                  │
     │                │                  │
     └────────────────┴──────────────────┘
                      │
                      ▼
                 ┌──────────┐
                 │ REJECTED │
                 │          │
                 │ (Refusé) │
                 └──────────┘
```

**Transitions possibles :**
- `draft` → `pending` : Partenaire soumet le produit
- `pending` → `approved` : Admin valide
- `pending` → `rejected` : Admin refuse
- `pending` → `draft` : Admin demande des modifications
- `approved` → `published` : Admin publie sur Shopify
- Tous → `archived` : Archivage

---

## 📦 Modules Principaux

### MODULE 1 : Gestion des Partenaires

**Responsabilité** : Invitation et gestion des partenaires

**Flux d'invitation** :
1. Admin invite un partenaire par email
2. Génération d'un token unique
3. Email envoyé avec lien d'activation
4. Partenaire clique sur le lien et crée son compte
5. Relation créée automatiquement

**Endpoints** :
- `POST /api/partners/invite` - Invite un partenaire
- `GET /api/partners/invitations` - Liste des invitations
- `GET /api/partners/invitations/:token` - Valide une invitation
- `GET /api/partners` - Liste des partenaires actifs
- `DELETE /api/partners/:id` - Désactive un partenaire

---

### MODULE 2 : Création de Produit (Partenaire)

**Responsabilité** : Formulaire de création et import Excel

**Flux création manuelle** :
1. Partenaire remplit le formulaire
2. Upload des images (drag & drop)
3. Sauvegarde en `draft`
4. Soumission → `pending`

**Flux import Excel** :
1. Partenaire upload un fichier Excel
2. Mapping des colonnes (titre, description, prix, SKU, etc.)
3. Prévisualisation des données
4. Validation et création des produits en `draft`
5. Soumission → `pending`

**Endpoints** :
- `POST /api/products/create` - Crée un produit (draft)
- `POST /api/products/import` - Import Excel
- `POST /api/products/:id/submit` - Soumet à validation
- `PUT /api/products/:id` - Modifie un produit
- `GET /api/products` - Liste des produits (filtré par rôle)

---

### MODULE 3 : Upload d'Images

**Responsabilité** : Gestion des images produit

**Flux** :
1. Partenaire drag & drop des images
2. Upload vers S3 (ou équivalent)
3. Génération de thumbnails
4. Association au produit
5. Ordre et image principale

**Endpoints** :
- `POST /api/images/upload` - Upload une image
- `POST /api/images/upload-multiple` - Upload multiple
- `DELETE /api/images/:id` - Supprime une image
- `PUT /api/images/:id` - Met à jour (position, primary)

---

### MODULE 4 : Workflow de Validation (Admin)

**Responsabilité** : Validation et publication des produits

**Flux validation** :
1. Admin voit les produits en `pending`
2. Consultation de la fiche complète
3. Action : Approuver / Refuser / Modifier
4. Si approuvé → `approved`
5. Si modifié → retour en `draft` avec commentaires

**Flux publication** :
1. Admin sélectionne un produit `approved`
2. Clic sur "Publier sur Shopify"
3. Synchronisation via Shopify Admin API
4. Mise à jour du statut → `published`
5. Stockage de l'ID Shopify

**Endpoints** :
- `GET /api/products/pending` - Liste produits en attente
- `POST /api/products/:id/approve` - Approuve un produit
- `POST /api/products/:id/reject` - Refuse un produit
- `POST /api/products/:id/publish` - Publie sur Shopify
- `GET /api/products/:id` - Détails d'un produit

---

### MODULE 5 : Connexion Shopify

**Responsabilité** : OAuth et gestion des tokens

**Flux** (identique à l'existant, mais lié à l'admin) :
1. Admin initie la connexion
2. Redirection OAuth Shopify
3. Callback avec code
4. Échange code → access_token
5. Stockage token chiffré
6. Association à la relation admin-partenaire

**Endpoints** :
- `GET /api/shopify/auth/init` - Initie OAuth
- `GET /api/shopify/auth/callback` - Gère callback
- `GET /api/shopify/disconnect` - Déconnecte

---

## 🗄️ Schéma de Base de Données

### Table : `users` (modifiée)
```sql
- id UUID
- email VARCHAR(255) UNIQUE
- name VARCHAR(255)
- password_hash TEXT
- role VARCHAR(50) DEFAULT 'admin' -- 'admin' ou 'partner'
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### Table : `partner_invitations`
```sql
- id UUID
- admin_id UUID (FK users)
- email VARCHAR(255)
- token VARCHAR(255) UNIQUE
- status VARCHAR(50) -- 'pending', 'accepted', 'expired'
- expires_at TIMESTAMP
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### Table : `partner_relationships`
```sql
- id UUID
- admin_id UUID (FK users)
- partner_id UUID (FK users)
- shopify_connection_id UUID (FK shopify_connections)
- is_active BOOLEAN
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### Table : `products` (modifiée)
```sql
- id UUID
- user_id UUID (FK users) -- Admin propriétaire
- partner_id UUID (FK users) -- Partenaire créateur (nullable)
- shopify_product_id VARCHAR(255)
- shopify_connection_id UUID (FK shopify_connections)
- name VARCHAR(255)
- category VARCHAR(100)
- material VARCHAR(100)
- style VARCHAR(100)
- price DECIMAL(10,2)
- variants JSONB
- generated_content JSONB
- raw_data JSONB
- status VARCHAR(50) -- 'draft', 'pending', 'approved', 'rejected', 'published', 'archived'
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### Table : `product_images`
```sql
- id UUID
- product_id UUID (FK products)
- url TEXT
- filename VARCHAR(255)
- file_size INTEGER
- mime_type VARCHAR(100)
- position INTEGER
- is_primary BOOLEAN
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### Table : `excel_imports`
```sql
- id UUID
- user_id UUID (FK users)
- partner_id UUID (FK users)
- filename VARCHAR(255)
- file_url TEXT
- mapping JSONB
- status VARCHAR(50) -- 'processing', 'completed', 'failed'
- total_rows INTEGER
- imported_rows INTEGER
- error_message TEXT
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### Table : `product_approvals`
```sql
- id UUID
- product_id UUID (FK products)
- admin_id UUID (FK users)
- action VARCHAR(50) -- 'approved', 'rejected', 'modified'
- comment TEXT
- changes JSONB
- created_at TIMESTAMP
```

---

## 🔐 Sécurité & Permissions

### Règles d'accès

**Admin** :
- Accès à tous les produits de sa boutique
- Peut inviter des partenaires
- Peut valider/refuser/modifier les produits
- Peut publier sur Shopify

**Partenaire** :
- Accès uniquement à ses propres produits
- Peut créer/modifier ses produits (si draft)
- Peut soumettre à validation
- Ne peut pas publier directement

### Middleware de protection

```typescript
// Vérifie si l'utilisateur est admin
export async function requireAdmin(userId: string) {
  const user = await getUserById(userId);
  if (user?.role !== 'admin') {
    throw new Error('Accès refusé : Admin requis');
  }
}

// Vérifie si le partenaire appartient à l'admin
export async function requirePartnerAccess(partnerId: string, adminId: string) {
  const relationship = await getPartnerRelationship(partnerId, adminId);
  if (!relationship?.is_active) {
    throw new Error('Accès refusé : Partenaire non autorisé');
  }
}
```

---

## 📊 Flux Complet : Création → Publication

### Scénario 1 : Création manuelle par partenaire

```
1. Partenaire se connecte
   ↓
2. Accède au formulaire de création
   ↓
3. Remplit les champs (titre, description, prix, etc.)
   ↓
4. Upload des images (drag & drop)
   ↓
5. Sauvegarde → status: 'draft'
   ↓
6. Clic sur "Soumettre à validation"
   ↓
7. Status → 'pending'
   ↓
8. Admin reçoit notification (ou voit dans dashboard)
   ↓
9. Admin consulte la fiche
   ↓
10. Admin approuve → status: 'approved'
    ↓
11. Admin clique "Publier sur Shopify"
    ↓
12. Backend → Shopify Admin API (POST /products.json)
    ↓
13. Status → 'published', shopify_product_id stocké
    ↓
14. Produit visible sur Shopify
```

### Scénario 2 : Import Excel

```
1. Partenaire upload un fichier Excel
   ↓
2. Backend parse le fichier
   ↓
3. Mapping des colonnes (interface de mapping)
   ↓
4. Prévisualisation des données
   ↓
5. Partenaire valide
   ↓
6. Création des produits en 'draft'
   ↓
7. Partenaire soumet tous → 'pending'
   ↓
8. (Suite identique au scénario 1)
```

---

## 🚀 Stack Technique

- **Frontend** : Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend** : Next.js API Routes
- **Database** : PostgreSQL (Supabase)
- **Auth** : NextAuth.js
- **Storage** : S3 (ou Cloudinary, Supabase Storage)
- **Shopify** : Shopify Admin API (REST)
- **Excel** : xlsx ou exceljs pour le parsing
- **Validation** : Zod

---

## 📝 Endpoints API Principaux

### Partenaires
- `POST /api/partners/invite`
- `GET /api/partners/invitations`
- `GET /api/partners/invitations/:token`
- `GET /api/partners`
- `DELETE /api/partners/:id`

### Produits
- `POST /api/products/create`
- `GET /api/products` (filtré par rôle)
- `GET /api/products/pending` (admin seulement)
- `GET /api/products/:id`
- `PUT /api/products/:id`
- `POST /api/products/:id/submit`
- `POST /api/products/:id/approve`
- `POST /api/products/:id/reject`
- `POST /api/products/:id/publish`
- `POST /api/products/import`

### Images
- `POST /api/images/upload`
- `POST /api/images/upload-multiple`
- `DELETE /api/images/:id`
- `PUT /api/images/:id`

### Shopify
- `GET /api/shopify/auth/init`
- `GET /api/shopify/auth/callback`
- `GET /api/shopify/disconnect`

---

## 🎨 Interfaces Utilisateur

### Dashboard Admin
- Vue d'ensemble des produits (tous statuts)
- Liste des produits en attente de validation
- Gestion des partenaires
- Connexion Shopify

### Dashboard Partenaire
- Mes produits (draft, pending, approved)
- Formulaire de création
- Import Excel
- Upload d'images

### Formulaire Produit
- Champs : titre, description, prix, SKU, variantes
- Zone de drag & drop pour images
- Bouton "Sauvegarder" (draft) et "Soumettre" (pending)

### Page de Validation (Admin)
- Détails complets du produit
- Images
- Actions : Approuver / Refuser / Modifier
- Zone de commentaires

---

## 🔄 Évolutions Futures

- Notifications email (nouveau produit, validation, etc.)
- Commentaires sur les produits
- Historique des modifications
- Templates de produits
- Export des produits
- Multi-boutiques
- Analytics




