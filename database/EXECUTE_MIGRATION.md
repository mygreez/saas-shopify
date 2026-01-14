# Migration requise : Ajouter contact_name

## Problème
La colonne `contact_name` n'existe pas dans la table `partner_invitations`, ce qui cause une erreur lors de la récupération des invitations.

## Solution
Exécutez la migration SQL suivante dans votre éditeur SQL Supabase :

### Via Supabase Dashboard
1. Allez dans votre projet Supabase
2. Ouvrez l'éditeur SQL
3. Copiez-collez le contenu du fichier `database/migration_add_contact_name.sql`
4. Exécutez la requête

### Contenu de la migration

```sql
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
```

## Après l'exécution
Une fois la migration exécutée, l'application fonctionnera correctement et affichera le nom du contact pour chaque entreprise.

