# 🔐 Guide de Configuration Admin

Ce guide explique comment créer des comptes administrateurs pour accéder à la plateforme.

## ⚠️ Important

**Seuls les utilisateurs avec le rôle `admin` peuvent se connecter à la plateforme.**

Les utilisateurs avec le rôle `partner` ne peuvent pas se connecter directement. Ils doivent être invités par un admin via le système d'invitations.

---

## 🚀 Créer le premier compte admin

### Option 1 : Script Bash (Recommandé)

```bash
# Depuis la racine du projet
./scripts/create-admin.sh admin@example.com password123 "Nom Admin"
```

### Option 2 : Script TypeScript

```bash
# Mode interactif
npx ts-node scripts/create-admin.ts

# Mode ligne de commande
npx ts-node scripts/create-admin.ts admin@example.com password123 "Nom Admin"
```

### Option 3 : Via l'interface web (nécessite un admin existant)

1. Connectez-vous en tant qu'admin
2. Allez dans le menu "Créer Admin"
3. Remplissez le formulaire pour créer un nouveau compte admin

---

## 📋 Prérequis

### Variables d'environnement

Assurez-vous d'avoir ces variables dans votre fichier `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
```

### Base de données

La table `users` doit avoir une colonne `role` avec les valeurs possibles :
- `admin` : Peut se connecter et gérer la plateforme
- `partner` : Ne peut pas se connecter directement (invitation uniquement)

---

## 🔧 Créer un admin directement en SQL

Si vous avez accès à Supabase SQL Editor :

```sql
-- Créer un admin (remplacez les valeurs)
INSERT INTO users (email, name, password_hash, role)
VALUES (
  'admin@example.com',
  'Nom Admin',
  '$2a$10$...', -- Hash bcrypt du mot de passe (généré avec bcrypt)
  'admin'
);
```

**Générer un hash bcrypt :**

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('votre_mot_de_passe', 10).then(hash => console.log(hash));"
```

---

## 🔄 Promouvoir un utilisateur existant en admin

### Via le script

Le script détecte automatiquement si l'utilisateur existe et le promeut en admin :

```bash
./scripts/create-admin.sh existing@example.com newpassword123
```

### Via SQL

```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'existing@example.com';
```

---

## ✅ Vérifier qu'un utilisateur est admin

```sql
SELECT id, email, name, role 
FROM users 
WHERE email = 'admin@example.com';
```

Le champ `role` doit être `'admin'`.

---

## 🚫 Désactiver la page signup publique

La page `/auth/signup` crée maintenant des comptes avec le rôle `partner` par défaut, qui ne peuvent pas se connecter.

Pour désactiver complètement la page signup publique, vous pouvez :

1. **Rediriger vers la page de login :**

Modifiez `app/auth/signup/page.tsx` pour rediriger automatiquement :

```typescript
useEffect(() => {
  router.push('/auth/login');
}, []);
```

2. **Ou supprimer la route :**

Supprimez le dossier `app/auth/signup/` si vous ne voulez plus permettre les inscriptions publiques.

---

## 🔒 Sécurité

- Les mots de passe sont hashés avec bcrypt (10 rounds)
- Seuls les admins peuvent créer d'autres admins
- Les partenaires ne peuvent pas se connecter directement
- Les sessions expirent après 30 jours

---

## 📝 Notes

- Le premier admin doit être créé via script ou SQL
- Les admins peuvent créer d'autres admins via l'interface web
- Les partenaires sont créés via le système d'invitations



