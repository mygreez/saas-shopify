-- ============================================
-- FIX: Ajouter company_name à partner_invitations
-- ============================================
-- Script rapide pour corriger l'erreur 500
-- Exécutez ce script dans Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'partner_invitations' 
    AND column_name = 'company_name'
  ) THEN
    ALTER TABLE partner_invitations 
    ADD COLUMN company_name VARCHAR(255);
    
    CREATE INDEX IF NOT EXISTS idx_partner_invitations_company 
    ON partner_invitations(company_name);
    
    RAISE NOTICE 'Colonne company_name ajoutée avec succès';
  ELSE
    RAISE NOTICE 'La colonne company_name existe déjà';
  END IF;
END $$;



