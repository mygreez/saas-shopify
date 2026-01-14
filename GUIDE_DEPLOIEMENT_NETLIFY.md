# 🚀 Guide de Déploiement sur Netlify

## ✅ Configuration Complète

Votre projet est maintenant configuré pour Netlify avec le plugin officiel Next.js.

## 📋 Fichiers de Configuration

### 1. `netlify.toml`
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "20"
```

### 2. `package.json`
Le plugin `@netlify/plugin-nextjs` a été ajouté dans `devDependencies`.

## 🔧 Étapes de Déploiement

### Option 1 : Via l'Interface Netlify (Recommandé)

1. **Allez sur** https://app.netlify.com
2. **Cliquez sur** "Add new site" → "Import an existing project"
3. **Connectez votre repository GitHub** (ou GitLab/Bitbucket)
4. **Sélectionnez votre repository** `mygreez/saas-shopify`
5. **Netlify détectera automatiquement** :
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Plugin: `@netlify/plugin-nextjs`
6. **Configurez les variables d'environnement** :
   - Allez dans "Site settings" → "Environment variables"
   - Ajoutez toutes vos variables d'environnement (Supabase, NextAuth, etc.)
7. **Cliquez sur** "Deploy site"

### Option 2 : Via Netlify CLI

```bash
# Installer Netlify CLI
npm install -g netlify-cli

# Se connecter
netlify login

# Initialiser le site
netlify init

# Déployer
netlify deploy --prod
```

## 🔑 Variables d'Environnement Requises

Assurez-vous d'ajouter toutes ces variables dans Netlify :

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### NextAuth
- `NEXTAUTH_URL` (votre URL Netlify : `https://votre-site.netlify.app`)
- `NEXTAUTH_SECRET`

### Autres
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `OPENAI_API_KEY` (si utilisé)
- `ANTHROPIC_API_KEY` (si utilisé)
- Variables S3 (si utilisé)

## 🐛 Résolution des Problèmes

### Erreur 404 sur toutes les pages

**Cause** : Le plugin Next.js n'est pas installé ou configuré.

**Solution** :
1. Vérifiez que `@netlify/plugin-nextjs` est dans `package.json`
2. Vérifiez que `netlify.toml` contient la section `[[plugins]]`
3. Redéployez le site

### Erreur "Module not found"

**Cause** : Problème de résolution des modules.

**Solution** :
1. Vérifiez que `next.config.js` contient la configuration webpack
2. Videz le cache Netlify : "Site settings" → "Build & deploy" → "Clear build cache"
3. Redéployez

### Erreur "Function not found"

**Cause** : Les API routes Next.js ne sont pas correctement déployées.

**Solution** :
1. Vérifiez que le plugin `@netlify/plugin-nextjs` est installé
2. Vérifiez les logs de build dans Netlify
3. Assurez-vous que toutes les dépendances sont dans `package.json`

## 📊 Vérification du Déploiement

### 1. Vérifier les Build Logs
- Allez dans "Deployments"
- Cliquez sur un déploiement
- Consultez les logs pour voir si le build a réussi

### 2. Vérifier les Functions
- Allez dans "Functions"
- Vous devriez voir les fonctions Next.js générées automatiquement

### 3. Tester les Routes
- Testez la page d'accueil : `https://votre-site.netlify.app`
- Testez une API route : `https://votre-site.netlify.app/api/health` (si existante)
- Testez une page dynamique : `https://votre-site.netlify.app/dashboard`

## 🔄 Déploiements Automatiques

Netlify déploie automatiquement à chaque push sur la branche `main` :
- Push sur `main` → Déploiement en production
- Pull Request → Déploiement de prévisualisation

## 📝 Notes Importantes

1. **Le plugin Netlify Next.js** gère automatiquement :
   - Les redirections pour les routes Next.js
   - Le SSR (Server-Side Rendering)
   - Les API routes
   - Les fonctions Edge

2. **Pas besoin de** :
   - Fichier `_redirects` manuel
   - Configuration de redirections manuelle
   - Configuration `output: 'standalone'` dans `next.config.js`

3. **Le répertoire de publication** est `.next` (géré automatiquement par le plugin)

## 🆘 Support

Si vous rencontrez des problèmes :
1. Consultez les logs de build dans Netlify
2. Vérifiez la documentation : https://docs.netlify.com/integrations/frameworks/nextjs/
3. Ouvrez une issue sur GitHub

