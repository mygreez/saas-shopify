# 📄 Pages Partenaires - Vérification

## ✅ Pages existantes

### 1. Page Formulaire Step 1
**Route:** `/partner/[token]/form`
**Fichier:** `app/partner/[token]/form/page.tsx`
**Description:** Formulaire de marque (Step 1 du workflow de revalorisation)

**Fonctionnalités:**
- ✅ Validation du token d'invitation
- ✅ Affichage du formulaire de marque
- ✅ Soumission vers `/api/partner/submit-brand`
- ✅ Redirection vers Step 2 après soumission

**Composant utilisé:** `PartnerFormStep1`

---

### 2. Page Création Produits Step 2
**Route:** `/partner/[token]/products`
**Fichier:** `app/partner/[token]/products/page.tsx`
**Description:** Création des produits (Step 2 du workflow)

**Fonctionnalités:**
- ✅ Chargement de la submission via `/api/partner/submission/[token]`
- ✅ Affichage du formulaire de produit
- ✅ Gestion de plusieurs produits
- ✅ Soumission vers `/api/partner/create-products`

**Composant utilisé:** `PartnerProductForm`

---

## 🔗 Format du lien partenaire

Le lien généré par l'API `/api/partners/invite` est au format :
```
http://localhost:3000/partner/{token}/form
```

**Exemple:**
```
http://localhost:3000/partner/abc123def456.../form
```

---

## 📋 API Routes nécessaires

### ✅ Routes existantes

1. **GET `/api/partners/invitations/[token]`**
   - Valide le token d'invitation
   - Retourne les infos de l'invitation
   - Fichier: `app/api/partners/invitations/[token]/route.ts`

2. **POST `/api/partner/submit-brand`**
   - Soumet le formulaire de marque (Step 1)
   - Fichier: `app/api/partner/submit-brand/route.ts`

3. **GET `/api/partner/submission/[token]`**
   - Récupère la submission et parse l'Excel
   - Fichier: `app/api/partner/submission/[token]/route.ts`

4. **POST `/api/partner/create-products`**
   - Crée les produits (Step 2)
   - Fichier: `app/api/partner/create-products/route.ts`

---

## 🧩 Composants nécessaires

### ✅ Composants existants

1. **`PartnerFormStep1`**
   - Fichier: `components/PartnerFormStep1.tsx`
   - Utilisé par: `/partner/[token]/form`

2. **`PartnerProductForm`**
   - Fichier: `components/PartnerProductForm.tsx`
   - Utilisé par: `/partner/[token]/products`

---

## 🔍 Vérification

Pour vérifier que tout fonctionne :

1. **Créer un lien partenaire** via `/dashboard/partners`
2. **Copier le lien** généré (format: `/partner/{token}/form`)
3. **Ouvrir le lien** dans un navigateur
4. **Vérifier** que la page se charge correctement

---

## ⚠️ Problèmes possibles

### Si la page ne se charge pas :

1. **Vérifier que le token est valide**
   - Tester: `GET /api/partners/invitations/{token}`
   - Doit retourner `{ valid: true }`

2. **Vérifier que la colonne `company_name` existe**
   - Exécuter le SQL dans `database/fix_company_name.sql`

3. **Vérifier les logs du serveur**
   - Regarder les erreurs dans le terminal Next.js

4. **Vérifier la console du navigateur**
   - Ouvrir F12 → Console
   - Regarder les erreurs JavaScript

---

## 🚀 Test complet

1. Créer un lien partenaire avec seulement le nom d'entreprise
2. Copier le lien généré
3. Ouvrir le lien dans un nouvel onglet (navigation privée)
4. Vérifier que :
   - ✅ La page se charge
   - ✅ Le token est validé
   - ✅ Le formulaire s'affiche
   - ✅ On peut soumettre le formulaire

---

## 📝 Notes

- Les pages utilisent `'use client'` (composants React côté client)
- Les API routes sont côté serveur (Next.js API routes)
- Le token est passé dans l'URL comme paramètre dynamique



