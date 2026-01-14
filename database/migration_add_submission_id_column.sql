-- ============================================
-- Migration: Ajouter colonne submission_id directe à products
-- ============================================
-- Alternative à l'index JSONB : ajoute une colonne dénormalisée pour de meilleures performances
-- Cette approche est plus performante mais nécessite de maintenir la cohérence des données

-- 1. Ajouter la colonne submission_id
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS submission_id UUID;

-- 2. Créer un index sur la nouvelle colonne (beaucoup plus rapide que JSONB)
CREATE INDEX IF NOT EXISTS idx_products_submission_id 
ON products(submission_id);

-- 3. Migrer les données existantes depuis raw_data
-- Mettre à jour tous les produits qui ont un submission_id dans raw_data
UPDATE products
SET submission_id = (raw_data->>'submission_id')::uuid
WHERE raw_data->>'submission_id' IS NOT NULL
  AND submission_id IS NULL
  AND (raw_data->>'submission_id')::uuid IS NOT NULL;

-- 4. Créer une fonction trigger pour maintenir la cohérence
-- Cette fonction met à jour submission_id quand raw_data change
CREATE OR REPLACE FUNCTION update_products_submission_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_data->>'submission_id' IS NOT NULL THEN
    NEW.submission_id = (NEW.raw_data->>'submission_id')::uuid;
  ELSE
    NEW.submission_id = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Créer le trigger
DROP TRIGGER IF EXISTS trigger_update_products_submission_id ON products;
CREATE TRIGGER trigger_update_products_submission_id
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_products_submission_id();

-- Vérification
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count
  FROM products
  WHERE submission_id IS NOT NULL;
  
  RAISE NOTICE 'Migration terminée : % produits avec submission_id', migrated_count;
END $$;

