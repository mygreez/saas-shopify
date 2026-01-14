# 📖 Guide Simple - Créer un compte admin

## 🎯 Ce qui a changé

**AVANT** : Tout le monde pouvait se connecter  
**MAINTENANT** : Seuls les **admins** peuvent se connecter

## ❓ Pourquoi je ne peux plus me connecter ?

Si vous aviez un compte avant, il faut le transformer en **admin**.

## ✅ Solution : Créer un compte admin

### Méthode 1 : Via le terminal (LE PLUS SIMPLE)

1. **Ouvrez votre terminal** dans le dossier du projet

2. **Exécutez cette commande** (remplacez les valeurs) :

```bash
export PATH="/Users/sm/nodejs/bin:$PATH"
npx ts-node scripts/create-admin.ts votre@email.com votremotdepasse "Votre Nom"
```

**Exemple concret :**
```bash
export PATH="/Users/sm/nodejs/bin:$PATH"
npx ts-node scripts/create-admin.ts admin@test.com password123 "Admin Test"
```

3. **Attendez le message** : `✅ Compte admin créé avec succès !`

4. **Allez sur** : http://localhost:3000/auth/login

5. **Connectez-vous** avec :
   - Email : `admin@test.com`
   - Mot de passe : `password123`

### Méthode 2 : Via Supabase (si vous avez accès)

1. Allez sur votre Supabase : https://mclstrnmonxjjbjvpqbz.supabase.co
2. Ouvrez le **SQL Editor**
3. Exécutez cette requête (remplacez les valeurs) :

```sql
-- Créer un admin directement
INSERT INTO users (email, name, password_hash, role)
VALUES (
  'admin@test.com',
  'Admin Test',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- Hash de "password123"
  'admin'
);
```

**OU** si vous avez déjà un compte, le transformer en admin :

```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'votre@email.com';
```

## 🔍 Vérifier si un compte est admin

Dans Supabase SQL Editor :

```sql
SELECT email, name, role 
FROM users 
WHERE email = 'votre@email.com';
```

Le champ `role` doit être `'admin'`.

## 🚀 Après avoir créé l'admin

1. Allez sur : http://localhost:3000/auth/login
2. Connectez-vous avec votre email et mot de passe
3. Vous êtes maintenant dans le dashboard !

## 📝 Créer d'autres admins

Une fois connecté en tant qu'admin :

1. Cliquez sur **"Créer Admin"** dans le menu
2. Remplissez le formulaire
3. Cliquez sur **"Créer le compte admin"**

## ❌ Erreurs possibles

### "Variables d'environnement manquantes"
→ Vérifiez que votre fichier `.env.local` contient :
```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### "Node.js n'est pas installé"
→ Utilisez la méthode 2 (Supabase SQL) à la place

### "Cet email est déjà utilisé"
→ Le script va transformer votre compte existant en admin automatiquement



