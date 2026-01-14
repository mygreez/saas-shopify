# Guide de diagnostic des erreurs HTTP 500

## Vue d'ensemble

Ce guide vous aide à diagnostiquer et résoudre les erreurs HTTP 500 dans l'application.

## Améliorations récentes

La gestion d'erreur a été améliorée pour fournir plus de détails en mode développement :
- Messages d'erreur plus descriptifs
- Détection automatique des types d'erreurs courants
- Stack traces en mode développement
- Suggestions de résolution

## Causes courantes

### 1. Problème de connexion à la base de données

**Symptômes :**
- Erreur mentionnant "P1001", "connect", ou "Prisma"
- Message : "Erreur de connexion à la base de données"

**Solutions :**
1. Vérifiez que `DATABASE_URL` est défini dans `.env.local`
2. Vérifiez que la base de données est accessible
3. Vérifiez que les migrations Prisma sont à jour :
   ```bash
   npx prisma migrate dev
   ```

### 2. Problème de connexion à Supabase

**Symptômes :**
- Erreur mentionnant "supabase", "PGRST", ou "column does not exist"
- Message : "Erreur de connexion à Supabase"

**Solutions :**
1. Vérifiez que les variables suivantes sont définies dans `.env.local` :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (optionnel, pour le backend)

2. Vérifiez que les tables nécessaires existent dans Supabase
3. Exécutez les migrations SQL si nécessaire :
   ```bash
   # Voir les fichiers dans database/
   ```

### 3. Colonnes manquantes dans la base de données

**Symptômes :**
- Erreur : "column X does not exist"
- Erreur : "La colonne company_name n'existe pas"

**Solutions :**
1. Vérifiez les migrations dans le dossier `database/`
2. Exécutez la migration appropriée :
   ```sql
   -- Exemple pour company_name
   ALTER TABLE partner_invitations ADD COLUMN company_name TEXT;
   ```

### 4. Variables d'environnement manquantes

**Symptômes :**
- Erreur lors de l'initialisation d'un service
- Erreur de configuration

**Solutions :**
1. Vérifiez que `.env.local` existe et contient toutes les variables nécessaires
2. Consultez `docs/GETTING_STARTED.md` pour la liste complète

### 5. Erreur d'authentification

**Symptômes :**
- Erreur : "Non authentifié"
- Erreur : "getUserId returned null"

**Solutions :**
1. Vérifiez que vous êtes connecté
2. Vérifiez la configuration NextAuth dans `app/api/auth/[...nextauth]/route.ts`
3. Vérifiez que `NEXTAUTH_SECRET` est défini

## Comment diagnostiquer

### 1. Vérifier les logs du serveur

En mode développement, les erreurs sont affichées dans la console :
```bash
npm run dev
```

### 2. Vérifier la réponse de l'API

En mode développement, la réponse JSON contient :
- `error` : Message d'erreur principal
- `details` : Détails supplémentaires (si disponible)
- `context` : Contexte de l'erreur (route API)
- `stack` : Stack trace complète (en développement uniquement)

### 3. Utiliser les outils de développement

Ouvrez les DevTools du navigateur (F12) et vérifiez :
- L'onglet **Network** pour voir les requêtes qui échouent
- L'onglet **Console** pour les erreurs JavaScript

### 4. Vérifier la base de données

```bash
# Pour Prisma
npx prisma studio

# Pour Supabase
# Utilisez le dashboard Supabase
```

## Exemples de réponses d'erreur

### Erreur de base de données
```json
{
  "error": "Erreur de connexion à la base de données",
  "details": {
    "original": "P1001: Can't reach database server",
    "hint": "Vérifiez que DATABASE_URL est correctement configuré dans .env.local"
  },
  "context": "GET /api/products"
}
```

### Erreur Supabase
```json
{
  "error": "Erreur de connexion à Supabase",
  "details": {
    "original": "column partner_invitations.company_name does not exist",
    "hint": "Vérifiez que NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont configurés"
  },
  "context": "POST /api/partners/invite"
}
```

## Prochaines étapes

Si vous rencontrez toujours une erreur 500 :

1. **Notez le message d'erreur exact** de la réponse JSON
2. **Vérifiez les logs du serveur** pour plus de détails
3. **Vérifiez la section "Causes courantes"** ci-dessus
4. **Vérifiez que toutes les migrations sont appliquées**

## Support

Pour obtenir de l'aide supplémentaire :
- Consultez les autres fichiers dans `docs/`
- Vérifiez les logs détaillés en mode développement
- Vérifiez que toutes les dépendances sont installées : `npm install`



