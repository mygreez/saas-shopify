#!/bin/bash

# ============================================
# Script: Créer un compte admin
# ============================================
# Usage: ./scripts/create-admin.sh <email> <password> [name]

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier les arguments
if [ $# -lt 2 ]; then
  echo -e "${RED}❌ Usage: $0 <email> <password> [name]${NC}"
  echo ""
  echo "Exemple:"
  echo "  $0 admin@example.com password123 \"John Doe\""
  exit 1
fi

EMAIL=$1
PASSWORD=$2
NAME=${3:-""}

# Vérifier que les variables d'environnement sont définies
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo -e "${RED}❌ Erreur: Variables d'environnement manquantes${NC}"
  echo "   NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis"
  echo ""
  echo "   Assurez-vous d'avoir un fichier .env.local avec ces variables"
  exit 1
fi

# Vérifier que Node.js est disponible
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js n'est pas installé${NC}"
  exit 1
fi

echo -e "${GREEN}🔐 Création du compte admin...${NC}"
echo "   Email: $EMAIL"
if [ -n "$NAME" ]; then
  echo "   Nom: $NAME"
fi
echo ""

# Exécuter le script TypeScript
export PATH="/Users/sm/nodejs/bin:$PATH" 2>/dev/null || true
npx ts-node scripts/create-admin.ts "$EMAIL" "$PASSWORD" "$NAME"



