-- ============================================
-- Migration: Table system_settings
-- ============================================
-- Table pour stocker les paramètres système (commissions, TVA, etc.)

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  key VARCHAR(255) NOT NULL, -- Ex: 'commission_rate', 'tva_rate', etc.
  value JSONB NOT NULL, -- Valeur du paramètre (peut être un nombre, string, objet, etc.)
  description TEXT, -- Description du paramètre
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, key) -- Un paramètre unique par utilisateur
);

CREATE INDEX IF NOT EXISTS idx_system_settings_user ON system_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Insérer les paramètres par défaut pour tous les admins
-- Note: Ces valeurs seront utilisées si aucun paramètre spécifique n'est défini pour un utilisateur
INSERT INTO system_settings (user_id, key, value, description)
SELECT 
  id,
  'commission_rate',
  '0.57'::jsonb,
  'Taux de commission GREEZ (57% = 0.57)'
FROM users
WHERE role = 'admin'
ON CONFLICT (user_id, key) DO NOTHING;

INSERT INTO system_settings (user_id, key, value, description)
SELECT 
  id,
  'tva_rate',
  '0.20'::jsonb,
  'Taux de TVA (20% = 0.20)'
FROM users
WHERE role = 'admin'
ON CONFLICT (user_id, key) DO NOTHING;

