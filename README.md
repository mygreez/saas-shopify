# 📸 Photify - Créez vos fiches produits Shopify en un clic

Application simple pour créer rapidement des fiches produits Shopify optimisées avec analyse d'images et IA.

## 🎯 Fonctionnalités

- ✅ **Création de compte simple** - Inscription rapide
- ✅ **Connexion Shopify** - Connectez votre compte et choisissez une boutique
- ✅ **Analyse d'images** - L'IA lit vos images pour créer automatiquement la fiche produit
- ✅ **Création rapide** - Créez des fiches produits en quelques clics
- ✅ **Analyse de boutique** - Analysez votre boutique pour optimiser vos produits
- ✅ **Import d'images** - Importez facilement vos images de produits

## 🛠️ Stack Technique

- **Frontend** : Next.js 14 (App Router), React, TypeScript
- **Backend** : Next.js API Routes
- **Database** : Supabase (PostgreSQL)
- **Auth** : NextAuth.js + Shopify OAuth
- **IA** : OpenAI GPT-4 Vision (analyse d'images)
- **UI** : Tailwind CSS

## 📦 Installation

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local

# Lancer le serveur de développement
npm run dev
```

## 🔐 Variables d'environnement

Voir `.env.example` pour la liste complète des variables requises.

## 🚦 Démarrage Rapide

1. Créer un compte Supabase
2. Exécuter le schéma SQL dans Supabase
3. Configurer les credentials Shopify (App OAuth)
4. Configurer les API keys OpenAI (GPT-4 Vision pour analyse d'images)
5. Lancer `npm run dev`

## 📚 Documentation

- [Architecture complète](./ARCHITECTURE.md)
- [Schéma de base de données](./database/schema.sql)
- [Guide API](./docs/API.md)
- [Authentification](./docs/AUTHENTICATION.md)

## 🏗️ Structure du Projet

```
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── products/      # Création produits
│   │   ├── images/       # Analyse d'images
│   │   ├── shopify/       # Connexion Shopify
│   │   └── analyze/       # Analyse boutique
│   ├── (auth)/           # Pages d'authentification
│   └── dashboard/        # Dashboard principal
├── components/            # Composants React
├── lib/                   # Utilitaires et services
│   ├── shopify/          # Service Shopify
│   ├── ai/               # Service IA (GPT-4 Vision)
│   └── db/               # Client Supabase
├── types/                 # Types TypeScript
└── database/              # Schémas SQL
```

## 📝 License

Propriétaire - Tous droits réservés
