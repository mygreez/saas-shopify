-- ============================================
-- MIGRATION: Workflow Partenaires - Revalorisation
-- ============================================
-- Cette migration ajoute les tables nécessaires pour le workflow de revalorisation
-- Step 1: Formulaire de marque
-- Step 2: Création de produits

-- ============================================
-- 1. Ajouter company_name à partner_invitations
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'partner_invitations' AND column_name = 'company_name') THEN
    ALTER TABLE partner_invitations ADD COLUMN company_name VARCHAR(255);
    CREATE INDEX IF NOT EXISTS idx_partner_invitations_company ON partner_invitations(company_name);
  END IF;
END $$;

-- ============================================
-- 2. Table: brands
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
-- 3. Table: partner_submissions
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
-- 4. Table: product_details
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
-- 5. Triggers: updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_partner_submissions_updated_at ON partner_submissions;
CREATE TRIGGER update_partner_submissions_updated_at BEFORE UPDATE ON partner_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_details_updated_at ON product_details;
CREATE TRIGGER update_product_details_updated_at BEFORE UPDATE ON product_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

