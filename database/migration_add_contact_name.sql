-- ============================================
-- MIGRATION: Ajouter contact_name à partner_invitations
-- ============================================
-- Ajoute le champ contact_name pour stocker le nom du contact lors de l'inscription Step 1

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'partner_invitations' 
    AND column_name = 'contact_name'
  ) THEN
    ALTER TABLE partner_invitations 
    ADD COLUMN contact_name VARCHAR(255);
    
    CREATE INDEX IF NOT EXISTS idx_partner_invitations_contact_name 
    ON partner_invitations(contact_name);
    
    RAISE NOTICE 'Colonne contact_name ajoutée avec succès à partner_invitations';
  ELSE
    RAISE NOTICE 'Colonne contact_name existe déjà';
  END IF;
END $$;

