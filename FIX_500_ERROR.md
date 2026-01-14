# 🔧 Guide de résolution de l'erreur 500 - Partenaires

## ❌ Problème

L'erreur 500 lors de la création d'un lien partenaire est causée par la colonne `company_name` manquante dans la table `partner_invitations`.

## ✅ Solution rapide

### Étape 1 : Ouvrir Supabase SQL Editor

1. Allez sur votre [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Cliquez sur **SQL Editor** dans le menu de gauche

### Étape 2 : Exécuter le script SQL

Copiez-collez ce script dans l'éditeur SQL et cliquez sur **Run** :

```sql
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
```

### Étape 3 : Vérifier

Vous devriez voir un message de succès. Ensuite :

1. Rechargez la page de gestion des partenaires
2. Réessayez de créer un lien partenaire

## 📋 Alternative : Exécuter la migration complète

Si vous préférez exécuter la migration complète (qui inclut d'autres tables) :

1. Dans Supabase SQL Editor, ouvrez le fichier `database/migration_partner_workflow.sql`
2. Copiez tout son contenu
3. Collez-le dans l'éditeur SQL
4. Exécutez-le

## 🔍 Vérification

Pour vérifier que la colonne existe :

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'partner_invitations' 
AND column_name = 'company_name';
```

Vous devriez voir une ligne avec `company_name` et `character varying`.

## 💡 Note

Si l'erreur persiste après avoir exécuté le script, vérifiez les logs du serveur Next.js dans votre terminal pour voir l'erreur exacte.



