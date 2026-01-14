# 🎯 Mode Démo - Photify

## Accès Utilisateur Démo

Photify inclut un **mode démo** qui permet de tester l'application sans configuration de Supabase ou autres services.

## 🔑 Identifiants Démo

- **Email** : `demo@photify.app`
- **Mot de passe** : `demo123456`

## 🚀 Comment utiliser

### Option 1 : Bouton démo sur la page de connexion

1. Aller sur `/auth/login`
2. Cliquer sur le bouton **"Se connecter en mode démo"**
3. Vous êtes automatiquement connecté

### Option 2 : Saisie manuelle

1. Aller sur `/auth/login`
2. Saisir :
   - Email : `demo@photify.app`
   - Mot de passe : `demo123456`
3. Cliquer sur "Se connecter"

## ✨ Fonctionnalités disponibles en mode démo

- ✅ **Dashboard** - Accès complet au dashboard
- ✅ **Création de produit** - Interface de création (sans sauvegarde réelle)
- ✅ **Analyse d'images** - Analyse d'images avec GPT-4 Vision (si configuré)
- ⚠️ **Connexion Shopify** - Nécessite configuration Shopify OAuth
- ⚠️ **Analyse de boutique** - Nécessite connexion Shopify active
- ⚠️ **Sauvegarde produits** - Nécessite Supabase configuré

## 🔧 Limitations du mode démo

1. **Pas de sauvegarde persistante** : Les données ne sont pas sauvegardées en base
2. **Pas de connexion Shopify** : Nécessite configuration OAuth Shopify
3. **Session temporaire** : La session expire après 30 jours

## 🎨 Indicateur visuel

En mode démo, un badge **"Mode Démo"** apparaît dans le dashboard pour indiquer que vous êtes en mode démo.

## 🔄 Passer en mode production

Pour utiliser toutes les fonctionnalités :

1. **Configurer Supabase** :
   - Créer un projet Supabase
   - Exécuter le schéma SQL
   - Ajouter les variables d'environnement

2. **Configurer Shopify** :
   - Créer une App Shopify
   - Configurer OAuth
   - Ajouter les credentials

3. **Créer un vrai compte** :
   - Aller sur `/auth/signup`
   - Créer un compte avec votre email
   - Se connecter avec ce compte

## 💡 Cas d'usage

Le mode démo est parfait pour :
- Tester l'interface utilisateur
- Démontrer l'application à des clients
- Développement sans configuration complète
- Formation et onboarding

---

**Note** : Le mode démo est activé automatiquement si Supabase n'est pas configuré.

