// ============================================
// COMPOSANT: Viewer 360° Produit (POC)
// ============================================

'use client';

import { useState, useEffect } from 'react';

interface Product360ViewerProps {
  images: string[];
  productName: string;
}

export default function Product360Viewer({ images, productName }: Product360ViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const [rotationSpeed, setRotationSpeed] = useState(0);

  // Rotation automatique simple
  useEffect(() => {
    if (isRotating && images.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, 100); // Change d'image toutes les 100ms pour effet fluide

      return () => clearInterval(interval);
    }
  }, [isRotating, images.length]);

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <p className="text-gray-500">Aucune image disponible</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Viewer principal */}
      <div className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden shadow-lg">
        <img
          src={images[currentIndex]}
          alt={`${productName} - Vue ${currentIndex + 1}`}
          className="w-full h-full object-cover"
        />

        {/* Contrôles */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          <button
            onClick={() => setIsRotating(!isRotating)}
            className="px-4 py-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition"
          >
            {isRotating ? '⏸️ Pause' : '▶️ Rotation'}
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)}
            className="px-4 py-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition"
          >
            ⬅️
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % images.length)}
            className="px-4 py-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition"
          >
            ➡️
          </button>
        </div>

        {/* Indicateur de progression */}
        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex gap-1">
          {images.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex ? 'w-8 bg-blue-500' : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Miniatures */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentIndex(index);
              setIsRotating(false);
            }}
            className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
              index === currentIndex
                ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <img
              src={image}
              alt={`Miniature ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Info */}
      <p className="text-center text-sm text-gray-500 mt-2">
        Vue {currentIndex + 1} / {images.length}
      </p>
    </div>
  );
}

