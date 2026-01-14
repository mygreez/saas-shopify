# 🔐 Guide d'Authentification - GREEZ SaaS

## Comment l'utilisateur se connecte

### 1. Inscription (Première fois)

1. L'utilisateur accède à la page d'accueil : `http://localhost:3000`
2. Il clique sur "Se connecter" ou accède directement à `/auth/signup`
3. Il remplit le formulaire d'inscription :
   - Email (obligatoire)
   - Mot de passe (minimum 6 caractères)
   - Nom (optionnel)
4. Le compte est créé dans Supabase avec un hash bcrypt du mot de passe
5. Redirection vers `/auth/login?signup=success`

### 2. Connexion

1. L'utilisateur accède à `/auth/login`
2. Il saisit son email et mot de passe
3. NextAuth.js vérifie les credentials avec Supabase
4. Si valides, une session JWT est créée
5. Redirection vers `/dashboard`

### 3. Dashboard (Zone protégée)

- Toutes les routes `/dashboard/*` sont protégées par middleware
- Si non authentifié, redirection automatique vers `/auth/login`
- La session est valide pendant 30 jours

### 4. Déconnexion

- Bouton "Déconnexion" dans le dashboard
- Suppression de la session
- Redirection vers `/auth/login`

---

## 🔒 Sécurité

### Mots de passe

- Hash bcrypt avec 10 rounds
- Minimum 6 caractères requis
- Stockage sécurisé en base (jamais en clair)

### Sessions

- JWT tokens signés avec `NEXTAUTH_SECRET`
- Expiration après 30 jours
- Stockage côté serveur (cookies httpOnly)

### Protection des routes

- Middleware NextAuth protège automatiquement :
  - `/dashboard/*`
  - `/api/products/*`
  - `/api/prompt-system/*`
  - `/api/shopify/*` (sauf `/api/shopify/auth/*`)

---

## 📝 Schéma Base de Données

### Table `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash TEXT, -- Hash bcrypt
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 🛠️ Configuration

### Variables d'environnement requises

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key_here
```

### Générer NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

---

## 🔄 Flow d'authentification

```
1. User → /auth/login
   ↓
2. Saisit email/password
   ↓
3. POST /api/auth/signin (NextAuth)
   ↓
4. Vérification avec Supabase
   ↓
5. Si OK → Session JWT créée
   ↓
6. Redirection → /dashboard
   ↓
7. Middleware vérifie session sur chaque requête
```

---

## 📡 API Endpoints

### Inscription

```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe" // optionnel
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Compte créé avec succès",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Connexion

Géré automatiquement par NextAuth.js via `/api/auth/[...nextauth]`

---

## 🧪 Test Manuel

### 1. Créer un compte

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### 2. Se connecter

1. Aller sur `http://localhost:3000/auth/login`
2. Saisir les credentials
3. Vérifier la redirection vers `/dashboard`

### 3. Vérifier la session

Les endpoints protégés utilisent automatiquement `getUserId()` qui récupère l'ID depuis la session.

---

## ⚠️ Notes Importantes

1. **Première connexion** : Si un utilisateur existe sans `password_hash`, la connexion est acceptée (pour migration)
2. **Middleware** : Protège automatiquement les routes définies dans `middleware.ts`
3. **Session côté serveur** : Utilise `getServerSession()` pour récupérer la session dans les API routes
4. **Types TypeScript** : Les types NextAuth sont étendus dans `types/next-auth.d.ts` pour inclure `user.id`

---

## 🚀 Prochaines Améliorations

- [ ] OAuth social (Google, GitHub)
- [ ] Mot de passe oublié / Reset
- [ ] Email de confirmation
- [ ] 2FA (Two-Factor Authentication)
- [ ] Gestion des rôles (admin, user)

