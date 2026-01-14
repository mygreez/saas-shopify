-- ============================================
-- TABLE: avis_garantis_connections
-- ============================================

CREATE TABLE IF NOT EXISTS avis_garantis_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL, -- Clé API de la Société des Avis Garantis
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_avis_garantis_user ON avis_garantis_connections(user_id);

-- Trigger pour updated_at
CREATE TRIGGER update_avis_garantis_updated_at BEFORE UPDATE ON avis_garantis_connections
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

