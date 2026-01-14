# 🚀 Guide Déploiement Propre sur Vercel

## 📋 Problèmes rencontrés et solutions

### Problème 1 : Vercel utilise toujours l'ancien commit
**Symptôme** : Vercel clone `899fdc7` au lieu du dernier commit

**Solution** : Vérifier et reconfigurer la connexion Git

---

## ✅ ÉTAPE 1 : Vérifier que tout est sur GitHub

```bash
# Vérifier le dernier commit
git log --oneline -1

# Vérifier que c'est bien sur GitHub
git ls-remote origin main

# Les deux doivent afficher le même commit hash
```

---

## ✅ ÉTAPE 2 : Reconnecter Vercel à GitHub

1. **Allez sur** : https://vercel.com/dashboard
2. **Sélectionnez** votre projet `saas-shopify`
3. **Settings** → **Git**
4. **Disconnect** le repository
5. **Reconnect** le repository GitHub
6. **Sélectionnez** : `mygreez/saas-shopify`
7. **Configurez** :
   - **Production Branch** : `main`
   - **Root Directory** : `./` (laisser vide)
   - **Framework Preset** : `Next.js` (détecté automatiquement)
   - **Build Command** : `npm run build`
   - **Output Directory** : `.next`
   - **Install Command** : `npm install`

---

## ✅ ÉTAPE 3 : Configurer les variables d'environnement

1. **Dans Vercel**, allez dans **Settings** → **Environment Variables**
2. **Ajoutez toutes vos variables** :

```
NEXT_PUBLIC_SUPABASE_URL=votre_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle
NEXTAUTH_SECRET=votre_secret
NEXTAUTH_URL=https://votre-projet.vercel.app
SHOPIFY_API_KEY=votre_cle
SHOPIFY_API_SECRET=votre_secret
# ... autres variables
```

3. **Sélectionnez** les environnements : Production, Preview, Development
4. **Save**

---

## ✅ ÉTAPE 4 : Créer vercel.json (Configuration optimale)

Créez un fichier `vercel.json` à la racine du projet :

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NODE_ENV": "production"
  },
  "build": {
    "env": {
      "NODE_ENV": "production"
    }
  }
}
```

---

## ✅ ÉTAPE 5 : Vérifier les fichiers critiques

Assurez-vous que ces fichiers sont corrects :

### 1. `app/api/auth/[...nextauth]/route.ts`
```typescript
// DOIT être comme ça (sans export authOptions)
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-config';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

### 2. `lib/auth-config.ts`
```typescript
// DOIT exporter authOptions
export const authOptions: NextAuthOptions = {
  // ... configuration
};
```

### 3. `package.json`
```json
{
  "dependencies": {
    "next": "^14.2.15",
    "@supabase/ssr": "^0.5.2"
  }
}
```

---

## ✅ ÉTAPE 6 : Forcer un nouveau déploiement

### Option A : Via l'interface Vercel (Recommandé)

1. **Allez dans** "Deployments"
2. **Cliquez sur** "..." à côté du dernier build
3. **Sélectionnez** "Redeploy"
4. **Dans "Deploy from"**, choisissez :
   - **Branch** : `main`
   - **Commit** : (laissez vide pour utiliser HEAD)
5. **Cliquez** sur "Redeploy"

### Option B : Via Git (Push un nouveau commit)

```bash
# Créer un commit vide pour forcer le rebuild
git commit --allow-empty -m "Trigger: Force Vercel rebuild"
git push origin main
```

---

## ✅ ÉTAPE 7 : Vérifier le build

1. **Allez dans** "Deployments"
2. **Cliquez** sur le build en cours
3. **Vérifiez les logs** :
   - ✅ "Cloning github.com/mygreez/saas-shopify (Branch: main, Commit: [DERNIER_COMMIT])"
   - ✅ "Installing dependencies..."
   - ✅ "Running npm run build"
   - ✅ "Compiled successfully"
   - ✅ "Build Completed"

---

## 🔧 Configuration avancée

### Optimiser les builds

Dans `next.config.js` :
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['cdn.shopify.com', 'images.unsplash.com'],
  },
  // Optimisations pour Vercel
  output: 'standalone', // Pour de meilleures performances
  experimental: {
    optimizeCss: true,
  },
}
```

### Ignorer certains fichiers

Dans `.vercelignore` :
```
# Fichiers à ignorer
.cursor/
*.log
.DS_Store
.env*.local
```

---

## 🐛 Dépannage

### Erreur : "authOptions is not a valid Route export"

**Cause** : Le fichier `route.ts` exporte encore `authOptions`

**Solution** :
1. Vérifiez que `app/api/auth/[...nextauth]/route.ts` n'exporte QUE `GET` et `POST`
2. Vérifiez que `lib/auth-config.ts` existe et exporte `authOptions`
3. Supprimez le cache Vercel : Settings → General → Clear Build Cache

### Erreur : "Property 'products' does not exist"

**Cause** : Erreur TypeScript dans un fichier API

**Solution** : Vérifiez que tous les commits récents sont bien poussés :
```bash
git log --oneline -5
git push origin main
```

### Vercel clone toujours l'ancien commit

**Solution** :
1. Déconnectez et reconnectez le repository dans Vercel
2. Vérifiez les webhooks GitHub : Settings → Webhooks
3. Forcez un redeploy depuis le bon commit

### Build échoue avec "Module not found"

**Solution** :
1. Vérifiez que `package.json` contient toutes les dépendances
2. Vérifiez que `package-lock.json` est à jour
3. Supprimez le cache : Settings → General → Clear Build Cache

---

## 📊 Monitoring

### Vérifier les logs en temps réel

1. **Dans Vercel**, allez dans "Deployments"
2. **Cliquez** sur un déploiement
3. **Onglet** "Logs" pour voir les logs en temps réel

### Analytics Vercel

1. **Settings** → **Analytics**
2. Activez "Web Analytics" (gratuit)
3. Suivez les performances de votre app

---

## 🚀 Déploiement automatique

Vercel déploie automatiquement à chaque push sur `main` :

```bash
# Workflow normal
git add .
git commit -m "Vos changements"
git push origin main
# → Vercel déploie automatiquement
```

---

## ✅ Checklist de déploiement

Avant de déployer, vérifiez :

- [ ] Tous les commits sont poussés sur GitHub
- [ ] `package.json` est à jour
- [ ] `lib/auth-config.ts` existe et exporte `authOptions`
- [ ] `app/api/auth/[...nextauth]/route.ts` n'exporte QUE GET/POST
- [ ] Toutes les variables d'environnement sont configurées dans Vercel
- [ ] Le build fonctionne localement : `npm run build`
- [ ] Aucune erreur TypeScript : `npm run build` (vérifie les types)
- [ ] `.vercelignore` est configuré (optionnel)

---

## 🎯 Commandes utiles

```bash
# Vérifier le dernier commit
git log --oneline -1

# Vérifier que c'est sur GitHub
git ls-remote origin main

# Forcer un nouveau commit
git commit --allow-empty -m "Trigger Vercel"
git push

# Vérifier les erreurs TypeScript localement
npm run build

# Vérifier les erreurs ESLint
npm run lint
```

---

## 📝 Notes importantes

1. **Vercel utilise toujours le dernier commit de la branche `main`**
2. Si Vercel clone un ancien commit, c'est un problème de configuration Git
3. Les variables d'environnement doivent être configurées dans Vercel, pas dans `.env`
4. Le build doit fonctionner localement avant de déployer sur Vercel

---

## 🆘 Support

- **Documentation Vercel** : https://vercel.com/docs
- **Documentation Next.js** : https://nextjs.org/docs
- **Status Vercel** : https://www.vercel-status.com

