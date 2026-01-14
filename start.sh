#!/bin/bash

# Charger nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Utiliser la version LTS de Node.js
nvm use --lts

# Aller dans le répertoire du projet
cd "/Users/sm/Desktop/TAFF PRO /greez saas "

# Lancer le serveur
echo "🚀 Démarrage du serveur Next.js..."
npm run dev




