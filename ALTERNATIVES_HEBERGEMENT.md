# Alternatives Gratuites à Vercel

## 🚀 Options d'hébergement gratuites

### 1. **Cloudflare Pages** (Recommandé ⭐)
- ✅ **Gratuit** et très performant
- ✅ Intégration GitHub directe
- ✅ CDN global inclus
- ✅ Build automatique
- ✅ Nom de domaine gratuit : `votre-projet.pages.dev`
- ✅ Support Next.js complet

**Setup :**
1. Allez sur https://pages.cloudflare.com
2. Connectez votre repo GitHub
3. Configurez :
   - Build command: `npm run build`
   - Build output directory: `.next`
   - Root directory: `/`
4. Déployez !

---

### 2. **Netlify** (Très similaire à Vercel)
- ✅ **Gratuit** (100GB bandwidth/mois)
- ✅ Intégration GitHub
- ✅ Build automatique
- ✅ Nom de domaine gratuit : `votre-projet.netlify.app`
- ✅ Support Next.js

**Setup :**
1. Allez sur https://app.netlify.com
2. "Add new site" → "Import an existing project"
3. Connectez GitHub
4. Configurez :
   - Build command: `npm run build`
   - Publish directory: `.next`
5. Déployez !

---

### 3. **Render** (Bon pour les apps full-stack)
- ✅ **Gratuit** (avec limitations)
- ✅ Support Next.js
- ✅ Nom de domaine gratuit : `votre-projet.onrender.com`
- ⚠️ Le service "s'endort" après 15 min d'inactivité (gratuit)

**Setup :**
1. Allez sur https://render.com
2. "New" → "Web Service"
3. Connectez GitHub
4. Configurez :
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
5. Déployez !

---

### 4. **Railway** (Simple et efficace)
- ✅ **Gratuit** ($5 de crédit/mois)
- ✅ Support Next.js
- ✅ Nom de domaine gratuit : `votre-projet.up.railway.app`
- ✅ Pas de "sleep" comme Render

**Setup :**
1. Allez sur https://railway.app
2. "New Project" → "Deploy from GitHub repo"
3. Sélectionnez votre repo
4. Railway détecte automatiquement Next.js
5. Déployez !

---

## 🌐 Noms de domaine gratuits

### Option 1 : Sous-domaines gratuits
- Cloudflare Pages : `votre-projet.pages.dev`
- Netlify : `votre-projet.netlify.app`
- Render : `votre-projet.onrender.com`
- Railway : `votre-projet.up.railway.app`

### Option 2 : Domaines gratuits (attention, souvent limités)
- **Freenom** (freenom.com) : .tk, .ml, .ga, .cf, .gq
  - ⚠️ Réputation parfois douteuse
  - ⚠️ Peut être révoqué

- **No-IP** (noip.com) : Sous-domaines dynamiques gratuits
  - Exemple : `votre-projet.ddns.net`

### Option 3 : Domaines à très bas prix
- **Namecheap** : ~$1/an pour .xyz
- **Porkbun** : Domaines à partir de $1/an
- **Cloudflare Registrar** : Prix au coût (pas de marge)

---

## 📁 Gestionnaire de fichiers

### Option 1 : FileZilla (FTP)
- Gratuit et open-source
- Support FTP/SFTP
- Interface graphique simple

### Option 2 : Cyberduck
- Gratuit
- Support FTP/SFTP/S3
- Interface moderne

### Option 3 : VS Code Remote
- Extension "Remote - SSH"
- Éditez directement sur le serveur
- Intégré à VS Code

---

## 🎯 Ma recommandation

**Cloudflare Pages** + **Nom de domaine Cloudflare Registrar**

Pourquoi :
1. ✅ **Gratuit** et très performant
2. ✅ **CDN global** (plus rapide que Vercel)
3. ✅ **Pas de limitations** strictes
4. ✅ **Support Next.js** complet
5. ✅ **Nom de domaine** pas cher via Cloudflare Registrar
6. ✅ **Gestionnaire de fichiers** : Utilisez GitHub directement ou VS Code

---

## 🚀 Setup rapide Cloudflare Pages

1. **Préparez votre projet :**
   ```bash
   # Assurez-vous que votre build fonctionne
   npm run build
   ```

2. **Sur Cloudflare Pages :**
   - Créez un compte sur https://dash.cloudflare.com
   - Allez dans "Pages" → "Create a project"
   - Connectez GitHub
   - Sélectionnez votre repo `saas-shopify`
   - Configurez :
     - Framework preset: `Next.js`
     - Build command: `npm run build`
     - Build output directory: `.next`
   - Ajoutez vos variables d'environnement
   - Déployez !

3. **Nom de domaine personnalisé (optionnel) :**
   - Dans Cloudflare Pages → Settings → Custom domains
   - Ajoutez votre domaine
   - Configurez les DNS dans Cloudflare

---

## ⚙️ Configuration pour Cloudflare Pages

Créez un fichier `_headers` dans `public/` pour les headers :
```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

---

## 🔧 Variables d'environnement

N'oubliez pas d'ajouter vos variables d'environnement dans :
- Cloudflare Pages : Settings → Environment variables
- Netlify : Site settings → Environment variables
- Render : Environment → Environment variables
- Railway : Variables → Environment variables

---

## 📝 Note importante

Pour les **gestionnaires de fichiers**, avec les plateformes modernes (Cloudflare, Netlify, etc.), vous n'avez **pas besoin de FTP**. Tout se fait via :
- **GitHub** : Push vos changements → Build automatique
- **VS Code** : Éditez localement → Push → Déploiement automatique

Si vous voulez vraiment un accès FTP, vous devrez utiliser un VPS (Virtual Private Server) comme :
- **Hetzner** : ~€4/mois
- **DigitalOcean** : $6/mois
- **Linode** : $5/mois

Mais pour une app Next.js, les plateformes PaaS (Cloudflare, Netlify) sont plus simples et gratuites !

