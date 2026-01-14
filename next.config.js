const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['cdn.shopify.com', 'images.unsplash.com'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Configuration pour Netlify
  output: 'standalone',
  // Améliorer la résolution des modules
  webpack: (config, { isServer }) => {
    // S'assurer que les alias sont bien résolus
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    // Ajouter les extensions pour la résolution (déjà présentes par défaut, mais on s'assure)
    if (!config.resolve.extensions.includes('.ts')) {
      config.resolve.extensions.unshift('.ts', '.tsx');
    }
    // S'assurer que les modules sont bien résolus
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname),
    ];
    return config;
  },
}

module.exports = nextConfig
