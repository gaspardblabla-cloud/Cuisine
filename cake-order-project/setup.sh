#!/bin/bash
echo "🍰 Installation de SweetCakes..."

# Créer la structure des dossiers
mkdir -p public/images data

# Créer les fichiers
echo "Création des fichiers..."

# package.json
cat > package.json << 'EOF'
{
  "name": "cake-order-project",
  "version": "1.0.0",
  "description": "Système de commande de gâteaux avec interface moderne",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "express": "^4.18.2",
    "bcryptjs": "^2.4.3",
    "express-session": "^1.17.3",
    "uuid": "^9.0.0"
  },
  "keywords": ["cake", "order", "pastry", "reservation"],
  "author": "CakeOrder Team",
  "license": "MIT"
}
EOF

echo "✅ Fichiers créés avec succès!"
echo "📦 Installation des dépendances..."
npm install

echo "🎉 Installation terminée!"
echo "🚀 Pour lancer l'application: npm run dev"
echo "🌐 Puis ouvrez: http://localhost:3000"
