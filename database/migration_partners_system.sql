-- ============================================
-- MIGRATION: Système de Partenaires & Workflow
-- ============================================
-- Cette migration ajoute le système de partenaires et le workflow de validation

-- ============================================
-- 1. Ajouter le champ role à users
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'partner'));
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  END IF;
END $$;

-- ============================================
-- 2. Table: partner_invitations
-- ============================================
CREATE TABLE IF NOT EXISTS partner_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
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

-- ============================================
-- 3. Table: partner_relationships
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
-- 4. Modifier la table products pour le workflow
-- ============================================
DO $$
BEGIN
  -- Ajouter partner_id si n'existe pas
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'partner_id') THEN
    ALTER TABLE products ADD COLUMN partner_id UUID REFERENCES users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_products_partner ON products(partner_id);
  END IF;

  -- Modifier le status pour inclure le workflow complet
  -- Les valeurs possibles: draft, pending, approved, rejected, published, archived
  -- On garde la valeur par défaut 'draft' mais on peut avoir d'autres valeurs
END $$;

-- Ajouter un commentaire pour clarifier le workflow
COMMENT ON COLUMN products.status IS 'Workflow: draft (brouillon) → pending (en attente) → approved (validé) → published (publié). Peut aussi être rejected ou archived.';

-- ============================================
-- 5. Table: product_images
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
-- 6. Table: excel_imports
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
-- 7. Table: product_approvals (historique des validations)
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
-- 8. Triggers: updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_partner_invitations_updated_at ON partner_invitations;
CREATE TRIGGER update_partner_invitations_updated_at BEFORE UPDATE ON partner_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_partner_relationships_updated_at ON partner_relationships;
CREATE TRIGGER update_partner_relationships_updated_at BEFORE UPDATE ON partner_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_images_updated_at ON product_images;
CREATE TRIGGER update_product_images_updated_at BEFORE UPDATE ON product_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_excel_imports_updated_at ON excel_imports;
CREATE TRIGGER update_excel_imports_updated_at BEFORE UPDATE ON excel_imports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. Fonction helper: Vérifier si un user est partenaire d'un admin
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
-- 10. Vue: Vue simplifiée des produits avec infos partenaire
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


