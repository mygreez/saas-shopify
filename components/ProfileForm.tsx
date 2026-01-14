// ============================================
// Composant: Formulaire d'édition du profil
// ============================================

'use client';

import { useState } from 'react';

interface ProfileFormProps {
  initialName: string | null | undefined;
  email: string;
  onUpdate?: () => void;
}

export default function ProfileForm({ initialName, email, onUpdate }: ProfileFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Le nom ne peut pas être vide');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la mise à jour');
      }

      setSuccess(true);
      
      // Rafraîchir la page après un court délai
      setTimeout(() => {
        if (onUpdate) {
          onUpdate();
        } else {
          window.location.reload();
        }
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour du profil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setName(initialName || '');
    setIsEditing(false);
    setError(null);
    setSuccess(false);
  };

  return (
    <div className="space-y-5">
      {/* Email (non éditable) */}
      <div className="bg-[#1b6955]/5 rounded-xl border border-[#1b6955]/20 p-5">
        <p className="text-xs font-semibold text-[#1b6955] uppercase tracking-wider mb-2">
          Email
        </p>
        <p className="text-base font-semibold text-gray-700">{email}</p>
      </div>

      {/* Nom (éditable) */}
      <div className="bg-[#1b6955]/5 rounded-xl border border-[#1b6955]/20 p-5">
        <p className="text-xs font-semibold text-[#1b6955] uppercase tracking-wider mb-4">
          Nom
        </p>
        
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                  setSuccess(false);
                }}
                className="w-full px-4 py-2.5 text-base text-gray-700 font-medium bg-white border border-[#1b6955]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] transition-all duration-300"
                placeholder="Votre nom"
                autoFocus
                disabled={isLoading}
              />
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </p>
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Profil mis à jour avec succès
                </p>
              </div>
            )}
            
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={isLoading || !name.trim()}
                className="px-6 py-2.5 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Enregistrer
                  </>
                )}
              </button>
              
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-gray-700">
              {name || 'Non défini'}
            </p>
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm text-[#1b6955] bg-white border border-[#1b6955]/30 rounded-lg hover:bg-[#1b6955]/5 transition-all duration-300 font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Modifier
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
