-- ============================================
-- SCRIPT COMPLET DE SETUP - GREEZ SAAS
-- ============================================
-- Exécutez ce script dans Supabase SQL Editor pour créer toutes les tables
-- Ce script inclut toutes les migrations nécessaires

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Fonction helper: update_updated_at_column
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash TEXT, -- Hash bcrypt du mot de passe
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'partner')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- TABLE: shopify_connections
-- ============================================
CREATE TABLE IF NOT EXISTS shopify_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_domain VARCHAR(255) NOT NULL,
  access_token_encrypted TEXT NOT NULL, -- Token chiffré
  scope TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, shop_domain)
);

CREATE INDEX IF NOT EXISTS idx_shopify_connections_user ON shopify_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_shopify_connections_shop ON shopify_connections(shop_domain);

-- ============================================
-- TABLE: folders
-- ============================================
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  publication_date DATE, -- Date de publication prévue
  color VARCHAR(7) DEFAULT '#6366f1', -- Couleur du dossier (hex)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_created ON folders(created_at);

-- ============================================
-- TABLE: products
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  shopify_product_id VARCHAR(255), -- ID Shopify si publié
  shopify_connection_id UUID REFERENCES shopify_connections(id) ON DELETE SET NULL,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  material VARCHAR(100),
  style VARCHAR(100),
  price DECIMAL(10,2),
  images JSONB DEFAULT '[]'::jsonb, -- Array d'URLs
  variants JSONB DEFAULT '[]'::jsonb, -- Array de variantes
  generated_content JSONB, -- Contenu généré par IA
  raw_data JSONB, -- Données brutes saisies par l'utilisateur
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'published', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_partner ON products(partner_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_shopify_id ON products(shopify_product_id);
CREATE INDEX IF NOT EXISTS idx_products_folder ON products(folder_id);

COMMENT ON COLUMN products.status IS 'Workflow: draft (brouillon) → pending (en attente) → approved (validé) → published (publié). Peut aussi être rejected ou archived.';

-- ============================================
-- TABLE: partner_invitations
-- ============================================
CREATE TABLE IF NOT EXISTS partner_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  company_name VARCHAR(255), -- Nom d'entreprise
  token VARCHAR(255) UNIQUE NOT NULL, -- Token unique pour l'invitation
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_invitations_admin ON partner_invitations(admin_id);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_email ON partner_invitations(email);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_token ON partner_invitations(token);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_status ON partner_invitations(status);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_company ON partner_invitations(company_name);

-- ============================================
-- TABLE: partner_relationships
-- ============================================
CREATE TABLE IF NOT EXISTS partner_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shopify_connection_id UUID REFERENCES shopify_connections(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(admin_id, partner_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_relationships_admin ON partner_relationships(admin_id);
CREATE INDEX IF NOT EXISTS idx_partner_relationships_partner ON partner_relationships(partner_id);

-- ============================================
-- TABLE: brands
-- ============================================
-- Stocke les informations de marque du Step 1
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL, -- Nom de la marque
  contact_email VARCHAR(255) NOT NULL, -- Mail du contact
  logo_url TEXT, -- Logo 500x500px PNG
  lifestyle_image_url TEXT, -- Image lifestyle 1500x1400px
  banner_image_url TEXT, -- Bannière 2000x420px
  description TEXT, -- Description de la marque
  label_ecoconception TEXT, -- Label/écoconception
  wetransfer_link TEXT, -- Lien Wetransfert
  collaboration_reason TEXT, -- Pourquoi collaborer avec Greez
  press_links TEXT[], -- Liens presse (array)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);
CREATE INDEX IF NOT EXISTS idx_brands_contact_email ON brands(contact_email);

-- ============================================
-- TABLE: partner_submissions
-- ============================================
-- Lie les invitations aux soumissions de marques
CREATE TABLE IF NOT EXISTS partner_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invitation_id UUID NOT NULL REFERENCES partner_invitations(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  excel_file_url TEXT, -- URL du fichier Excel matrice
  excel_filename VARCHAR(255), -- Nom du fichier Excel
  defects_images_urls TEXT[], -- URLs des photos de défauts
  status VARCHAR(50) DEFAULT 'step1_completed' CHECK (status IN ('step1_completed', 'step2_in_progress', 'step2_completed', 'submitted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_submissions_invitation ON partner_submissions(invitation_id);
CREATE INDEX IF NOT EXISTS idx_partner_submissions_brand ON partner_submissions(brand_id);
CREATE INDEX IF NOT EXISTS idx_partner_submissions_status ON partner_submissions(status);

-- ============================================
-- TABLE: product_details
-- ============================================
-- Stocke les détails complets des produits (champs spécifiques Step 2)
CREATE TABLE IF NOT EXISTS product_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  brand_name VARCHAR(255), -- Marque
  subtitle VARCHAR(255), -- Sous titre
  sku VARCHAR(255) NOT NULL, -- SKU
  sh VARCHAR(255), -- SH
  weight_volume VARCHAR(255) NOT NULL, -- Poids en g et volume en mL
  lot_number VARCHAR(255), -- N° Lot
  revalorisation_reason TEXT NOT NULL, -- Raison de la revalorisation
  revalorisation_details TEXT, -- Détails (date fin utilisation, défaut esthétique, etc.)
  product_type VARCHAR(255) NOT NULL, -- Type
  price_standard_ht DECIMAL(10,2) NOT NULL, -- Prix de vente standard HT
  price_standard_ttc DECIMAL(10,2) NOT NULL, -- Prix de vente standard TTC
  price_greez_ht DECIMAL(10,2) NOT NULL, -- Prix remisé sur Greez HT (sans commission)
  price_greez_ttc DECIMAL(10,2) NOT NULL, -- Prix remisé sur Greez TTC (sans commission)
  commission_greez_ttc DECIMAL(10,2), -- Commission Greez (50%) TTC (calcul automatique)
  facturation_marque_ttc DECIMAL(10,2), -- Facturation Marque (50%) TTC (calcul automatique)
  description TEXT NOT NULL, -- Description
  actions_efficacites TEXT NOT NULL, -- Actions et efficacités produits
  inci_list TEXT NOT NULL, -- Liste INCI
  usage_advice TEXT NOT NULL, -- Conseils d'utilisation
  endocrine_disruptors BOOLEAN NOT NULL, -- Présence de perturbateurs endocriniens
  ean VARCHAR(255), -- EAN
  quantity_uvc INTEGER NOT NULL, -- Quantité (UVC)
  perfume_family_notes TEXT, -- Si parfum : Famille olfactive et Notes
  makeup_color_hex VARCHAR(7), -- Si maquillage : Couleur hexadécimale (#FFFFF)
  revalorisation_wish TEXT NOT NULL, -- Souhait de revalorisation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_details_product ON product_details(product_id);
CREATE INDEX IF NOT EXISTS idx_product_details_sku ON product_details(sku);
CREATE INDEX IF NOT EXISTS idx_product_details_brand ON product_details(brand_name);

-- ============================================
-- TABLE: product_images
-- ============================================
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL, -- URL de l'image (S3, Cloudinary, etc.)
  filename VARCHAR(255),
  file_size INTEGER, -- Taille en bytes
  mime_type VARCHAR(100),
  position INTEGER DEFAULT 0, -- Ordre d'affichage
  is_primary BOOLEAN DEFAULT false, -- Image principale
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_position ON product_images(product_id, position);

-- ============================================
-- TABLE: excel_imports
-- ============================================
CREATE TABLE IF NOT EXISTS excel_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  filename VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL, -- URL du fichier Excel uploadé
  mapping JSONB, -- Mapping des colonnes Excel vers les champs produit
  status VARCHAR(50) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  total_rows INTEGER,
  imported_rows INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_excel_imports_user ON excel_imports(user_id);
CREATE INDEX IF NOT EXISTS idx_excel_imports_partner ON excel_imports(partner_id);
CREATE INDEX IF NOT EXISTS idx_excel_imports_status ON excel_imports(status);

-- ============================================
-- TABLE: product_approvals (historique des validations)
-- ============================================
CREATE TABLE IF NOT EXISTS product_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('approved', 'rejected', 'modified')),
  comment TEXT, -- Commentaire de l'admin
  changes JSONB, -- Changements effectués (si modified)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_approvals_product ON product_approvals(product_id);
CREATE INDEX IF NOT EXISTS idx_product_approvals_admin ON product_approvals(admin_id);

-- ============================================
-- TRIGGERS: updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shopify_connections_updated_at ON shopify_connections;
CREATE TRIGGER update_shopify_connections_updated_at BEFORE UPDATE ON shopify_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_folders_updated_at ON folders;
CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_partner_invitations_updated_at ON partner_invitations;
CREATE TRIGGER update_partner_invitations_updated_at BEFORE UPDATE ON partner_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_partner_relationships_updated_at ON partner_relationships;
CREATE TRIGGER update_partner_relationships_updated_at BEFORE UPDATE ON partner_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_partner_submissions_updated_at ON partner_submissions;
CREATE TRIGGER update_partner_submissions_updated_at BEFORE UPDATE ON partner_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_details_updated_at ON product_details;
CREATE TRIGGER update_product_details_updated_at BEFORE UPDATE ON product_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_images_updated_at ON product_images;
CREATE TRIGGER update_product_images_updated_at BEFORE UPDATE ON product_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_excel_imports_updated_at ON excel_imports;
CREATE TRIGGER update_excel_imports_updated_at BEFORE UPDATE ON excel_imports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Fonction helper: Vérifier si un user est partenaire d'un admin
-- ============================================
CREATE OR REPLACE FUNCTION is_partner_of(partner_user_id UUID, admin_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM partner_relationships
    WHERE partner_id = partner_user_id
      AND admin_id = admin_user_id
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Vue: Vue simplifiée des produits avec infos partenaire
-- ============================================
CREATE OR REPLACE VIEW products_with_partner AS
SELECT 
  p.*,
  u_partner.email as partner_email,
  u_partner.name as partner_name,
  u_admin.email as admin_email,
  u_admin.name as admin_name
FROM products p
LEFT JOIN users u_partner ON p.partner_id = u_partner.id
LEFT JOIN partner_relationships pr ON p.partner_id = pr.partner_id
LEFT JOIN users u_admin ON pr.admin_id = u_admin.id;

-- ============================================
-- FIN DU SCRIPT
-- ============================================
-- Toutes les tables ont été créées avec succès !
-- Vous pouvez maintenant utiliser l'application.



