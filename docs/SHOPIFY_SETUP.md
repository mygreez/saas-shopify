# 🔧 Configuration Shopify OAuth

Ce guide vous explique comment configurer l'authentification Shopify OAuth pour Photify.

## 📋 Prérequis

- Un compte [Shopify Partners](https://partners.shopify.com) (gratuit)
- Une boutique Shopify (de test ou réelle)

## 🚀 Étapes de Configuration

### 1. Créer une Application Shopify

1. Connectez-vous à [Shopify Partners](https://partners.shopify.com)
2. Allez dans **Apps** → **Create app**
3. Choisissez **Create app manually** (pas de template)
4. Donnez un nom à votre application (ex: "Photify")
5. Cliquez sur **Create app**

### 2. Configurer la Méthode de Distribution ⚠️ IMPORTANT

1. Dans votre application, allez dans **Overview** (ou **App setup**)
2. Trouvez la section **Distribution** ou **App distribution**
3. Cliquez sur **Configure** ou **Set up**
4. Choisissez **Custom app** (pour développement local)
   - Ou **Public app** si vous voulez publier l'app plus tard
5. Sauvegardez la configuration

⚠️ **Sans cette étape, l'app ne pourra pas être installée !**

### 3. Configurer les Scopes (Permissions)

1. Dans votre application, allez dans **Configuration** → **Scopes**
2. Ajoutez les permissions suivantes :
   - `read_products` - Lire les produits
   - `write_products` - Créer/modifier les produits
3. Cliquez sur **Save**

### 4. Configurer l'URL de Redirection

1. Allez dans **Configuration** → **App URL**
2. Dans **Allowed redirection URL(s)**, ajoutez :
   ```
   http://localhost:3000/api/shopify/auth/callback
   ```
   (Pour la production, ajoutez aussi votre URL de production)

### 5. Récupérer les Clés API

1. Dans votre application, allez dans **API credentials**
2. Vous verrez :
   - **Client ID** → C'est votre `SHOPIFY_API_KEY`
   - **Client secret** → C'est votre `SHOPIFY_API_SECRET`

### 6. Configurer les Variables d'Environnement

Créez un fichier `.env.local` à la racine du projet :

```bash
# Shopify OAuth
SHOPIFY_API_KEY=votre_api_key_ici
SHOPIFY_API_SECRET=votre_api_secret_ici
SHOPIFY_SCOPES=read_products,write_products

# URL de l'application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 7. Redémarrer le Serveur

Après avoir ajouté les variables d'environnement :

```bash
npm run dev
```

## ✅ Vérification

1. Allez sur `/dashboard/shopify/connect`
2. Entrez votre domaine Shopify (ex: `ma-boutique` ou `ma-boutique.myshopify.com`)
3. Cliquez sur **Se connecter avec Shopify**
4. Vous devriez être redirigé vers Shopify pour autoriser l'application

## 🐛 Dépannage

### Erreur : "Could not find Shopify API application with api_key"

**Cause** : Les variables `SHOPIFY_API_KEY` et `SHOPIFY_API_SECRET` ne sont pas configurées ou sont incorrectes.

**Solution** :
1. Vérifiez que `.env.local` existe et contient les bonnes valeurs
2. Vérifiez que vous avez copié le **Client ID** (pas l'App ID) comme `SHOPIFY_API_KEY`
3. Vérifiez que vous avez copié le **Client secret** comme `SHOPIFY_API_SECRET`
4. Redémarrez le serveur (`npm run dev`)

### Erreur : "redirect_uri_mismatch"

**Cause** : L'URL de redirection dans Shopify ne correspond pas à celle configurée.

**Solution** :
1. Vérifiez que `NEXT_PUBLIC_APP_URL` dans `.env.local` correspond à votre URL
2. Vérifiez que l'URL de redirection dans Shopify est exactement : `http://localhost:3000/api/shopify/auth/callback`

### Erreur : "Invalid scope"

**Cause** : Les scopes demandés ne sont pas autorisés dans votre application Shopify.

**Solution** :
1. Vérifiez que vous avez bien ajouté `read_products` et `write_products` dans les scopes
2. Vérifiez que `SHOPIFY_SCOPES` dans `.env.local` correspond

### Erreur : "This app can't be installed yet. The app developer needs to select a distribution method first."

**Cause** : La méthode de distribution n'a pas été configurée dans Shopify Partners.

**Solution** :
1. Allez dans votre app sur [Shopify Partners](https://partners.shopify.com)
2. Dans **Overview** ou **App setup**, trouvez la section **Distribution**
3. Cliquez sur **Configure** et sélectionnez **Custom app** (pour développement)
4. Sauvegardez et réessayez l'installation

## 📚 Ressources

- [Documentation Shopify OAuth](https://shopify.dev/docs/apps/auth/oauth)
- [Shopify Partners Dashboard](https://partners.shopify.com)
- [Guide de création d'app Shopify](https://shopify.dev/docs/apps/getting-started)

