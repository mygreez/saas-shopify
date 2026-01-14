-- ============================================
-- Migration: Ajouter index sur products.raw_data->>submission_id
-- ============================================
-- Optimise les requêtes qui filtrent par submission_id dans le JSONB raw_data
-- Utilise un index GIN pour les requêtes JSONB

-- Option 1: Index GIN sur le champ JSONB (recommandé pour JSONB)
-- Cet index permet des recherches rapides sur raw_data->>'submission_id'
CREATE INDEX IF NOT EXISTS idx_products_submission_id_jsonb 
ON products USING gin ((raw_data->>'submission_id'));

-- Option 2: Index standard si on veut aussi rechercher par valeur exacte
-- (moins performant que GIN pour JSONB mais peut être utile)
-- CREATE INDEX IF NOT EXISTS idx_products_submission_id_btree 
-- ON products ((raw_data->>'submission_id'));

-- Vérification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_products_submission_id_jsonb'
  ) THEN
    RAISE NOTICE 'Index idx_products_submission_id_jsonb créé avec succès';
  ELSE
    RAISE WARNING 'Index idx_products_submission_id_jsonb non trouvé après création';
  END IF;
END $$;

