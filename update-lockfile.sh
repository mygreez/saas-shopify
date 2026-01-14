#!/bin/bash
# Script pour mettre à jour package-lock.json

echo "Mise à jour de package-lock.json..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ package-lock.json mis à jour avec succès"
    echo "📦 Commitez et poussez les changements :"
    echo "   git add package-lock.json"
    echo "   git commit -m 'Fix: Mettre à jour package-lock.json'"
    echo "   git push"
else
    echo "❌ Erreur lors de la mise à jour"
    exit 1
fi

