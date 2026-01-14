-- ============================================
-- MIGRATION: Ajout du système de dossiers
-- ============================================
-- ⚠️ IMPORTANT: Exécutez d'abord database/schema.sql si les tables n'existent pas

-- Vérifier que la table users existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    RAISE EXCEPTION 'La table "users" n''existe pas. Veuillez d''abord exécuter database/schema.sql';
  END IF;
END $$;

-- Extension pour UUID (si pas déjà fait)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fonction update_updated_at_column (si pas déjà créée)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Table pour les dossiers (folders)
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

-- Index pour folders (si pas déjà créés)
CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_created ON folders(created_at);

-- Ajouter folder_id à products (optionnel, pour garder compatibilité Shopify)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
    ALTER TABLE products ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_products_folder ON products(folder_id);
  END IF;
END $$;

-- Trigger pour updated_at sur folders (remplace si existe déjà)
DROP TRIGGER IF EXISTS update_folders_updated_at ON folders;
CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

