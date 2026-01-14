#!/bin/bash
# Script de vérification des erreurs

echo "🔍 Vérification des erreurs TypeScript..."
npx tsc --noEmit --skipLibCheck 2>&1 | head -30

echo ""
echo "🔍 Vérification des erreurs ESLint..."
npm run lint 2>&1 | head -30




