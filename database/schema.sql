-- ============================================
-- SCHÉMA BASE DE DONNÉES - GREEZ SAAS
-- ============================================

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash TEXT, -- Hash bcrypt du mot de passe
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: shopify_connections
-- ============================================
CREATE TABLE shopify_connections (
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

CREATE INDEX idx_shopify_connections_user ON shopify_connections(user_id);
CREATE INDEX idx_shopify_connections_shop ON shopify_connections(shop_domain);

-- ============================================
-- TABLE: prompt_configs
-- ============================================
CREATE TABLE prompt_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_domain VARCHAR(255) NOT NULL,
  config JSONB NOT NULL, -- Structure complète de calibration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, shop_domain)
);

CREATE INDEX idx_prompt_configs_user ON prompt_configs(user_id);

-- ============================================
-- TABLE: products
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shopify_product_id VARCHAR(255), -- ID Shopify si publié
  shopify_connection_id UUID REFERENCES shopify_connections(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  material VARCHAR(100),
  style VARCHAR(100),
  price DECIMAL(10,2),
  images JSONB DEFAULT '[]'::jsonb, -- Array d'URLs
  variants JSONB DEFAULT '[]'::jsonb, -- Array de variantes
  generated_content JSONB, -- Contenu généré par IA
  raw_data JSONB, -- Données brutes saisies par l'utilisateur
  status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_user ON products(user_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_shopify_id ON products(shopify_product_id);

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

-- Ajouter folder_id à products si la colonne n'existe pas
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'folder_id') THEN
      ALTER TABLE products ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_products_folder ON products(folder_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- TABLE: product_examples
-- ============================================
CREATE TABLE product_examples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_config_id UUID NOT NULL REFERENCES prompt_configs(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  generated_content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_product_examples_config ON product_examples(prompt_config_id);

-- ============================================
-- TABLE: ai_generation_logs
-- ============================================
CREATE TABLE ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  provider VARCHAR(50) NOT NULL, -- 'openai' ou 'claude'
  model VARCHAR(100) NOT NULL,
  tokens_used INTEGER,
  cost DECIMAL(10,6),
  latency_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_logs_user ON ai_generation_logs(user_id);
CREATE INDEX idx_ai_logs_product ON ai_generation_logs(product_id);
CREATE INDEX idx_ai_logs_created ON ai_generation_logs(created_at);

-- ============================================
-- TRIGGERS: updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopify_connections_updated_at BEFORE UPDATE ON shopify_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_configs_updated_at BEFORE UPDATE ON prompt_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

