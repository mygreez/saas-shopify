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
  // Améliorer la résolution des modules
  webpack: (config) => {
    // S'assurer que les alias sont bien résolus
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    // Ajouter les extensions pour la résolution
    config.resolve.extensions = [
      ...config.resolve.extensions,
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
    ];
    return config;
  },
}

module.exports = nextConfig
