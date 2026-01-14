-- ============================================
-- Migration: Ajouter le statut "confirmed" à partner_submissions
-- ============================================
-- Ajoute le statut "confirmed" à la contrainte CHECK de partner_submissions.status

DO $$
BEGIN
  -- Supprimer l'ancienne contrainte CHECK si elle existe
  ALTER TABLE partner_submissions 
    DROP CONSTRAINT IF EXISTS partner_submissions_status_check;
  
  -- Ajouter la nouvelle contrainte avec le statut "confirmed"
  ALTER TABLE partner_submissions
    ADD CONSTRAINT partner_submissions_status_check 
    CHECK (status IN ('step1_completed', 'step2_in_progress', 'step2_completed', 'submitted', 'confirmed'));
  
  RAISE NOTICE 'Statut "confirmed" ajouté avec succès à partner_submissions';
END $$;


