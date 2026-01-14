// ============================================
// COMPOSANT: Upload d'image avec validation de dimensions
// ============================================

'use client';

import { useState, useRef } from 'react';
import { validateImageDimensions, validatePNGFormat } from '@/lib/utils/partner-workflow';

interface ImageUploadWithValidationProps {
  label: string;
  required?: boolean;
  expectedWidth: number;
  expectedHeight: number;
  format?: 'png' | 'any';
  accept?: string;
  value: File | null;
  onChange: (file: File | null) => void;
  error?: string;
}

export default function ImageUploadWithValidation({
  label,
  required = false,
  expectedWidth,
  expectedHeight,
  format,
  accept,
  value,
  onChange,
  error,
}: ImageUploadWithValidationProps) {
  const [uploading, setUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e || !e.target || !e.target.files) {
      onChange(null);
      setPreview(null);
      setValidationError(null);
      return;
    }
    
    const file = e.target.files[0];
    if (!file) {
      onChange(null);
      setPreview(null);
      setValidationError(null);
      return;
    }

    setUploading(true);
    setValidationError(null);

    try {
      // Valider le format PNG si requis
      if (format === 'png') {
        const pngValidation = validatePNGFormat(file);
        if (!pngValidation.valid) {
          setValidationError(pngValidation.error || 'Format invalide');
          setUploading(false);
          return;
        }
      }

      // Valider les dimensions
      const dimensionValidation = await validateImageDimensions(
        file,
        expectedWidth,
        expectedHeight
      );

      if (!dimensionValidation.valid) {
        setValidationError(dimensionValidation.error || 'Dimensions incorrectes');
        setUploading(false);
        return;
      }

      // Créer une preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (result) {
          setPreview(result as string);
        }
      };
      reader.readAsDataURL(file);

      onChange(file);
      setValidationError(null);
    } catch (err: any) {
      setValidationError(err.message || 'Erreur lors de la validation');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange(null);
    setPreview(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-900">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {preview && (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Preview"
            className="max-w-xs max-h-48 rounded-lg border border-gray-300"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
          >
            ×
          </button>
        </div>
      )}

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept || 'image/*'}
          onChange={handleFileSelect}
          disabled={uploading}
          className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
        <p className="mt-1 text-xs text-gray-900">
          Dimensions requises: {expectedWidth}x{expectedHeight}px
          {format === 'png' && ' (format PNG uniquement)'}
        </p>
      </div>

      {(validationError || error) && (
        <p className="text-sm text-red-600">
          {validationError || error}
        </p>
      )}

      {uploading && (
        <p className="text-sm text-[#1b6955]">Validation en cours...</p>
      )}
    </div>
  );
}


