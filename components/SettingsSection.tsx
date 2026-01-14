// ============================================
// Composant: Section Paramètres système
// ============================================

'use client';

import { useState, useEffect } from 'react';

export default function SettingsSection() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    commission_rate: 0.57,
    tva_rate: 0.20,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/settings');
      const result = await response.json();
      if (result.success && result.data) {
        setSettings({
          commission_rate: result.data.commission_rate || 0.57,
          tva_rate: result.data.tva_rate || 0.20,
        });
      }
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/dashboard/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const result = await response.json();
      if (result.success) {
        alert('Paramètres sauvegardés avec succès !');
      } else {
        alert(result.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur sauvegarde paramètres:', error);
      alert('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: number) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1b6955]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Commission GREEZ */}
      <div className="bg-[#1b6955]/5 rounded-xl p-5 border border-[#1b6955]/20">
        <label className="block text-sm font-semibold text-[#1b6955] mb-3">
          Taux de commission GREEZ
        </label>
        <div className="flex items-center gap-4">
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={settings.commission_rate}
            onChange={(e) => handleChange('commission_rate', parseFloat(e.target.value) || 0)}
            className="flex-1 px-4 py-2.5 border border-[#1b6955]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] text-base font-semibold bg-white"
          />
          <span className="text-xl font-bold text-[#1b6955] min-w-[60px]">
            {(settings.commission_rate * 100).toFixed(1)}%
          </span>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Pourcentage de commission appliqué sur le prix remisé TTC (ex: 57% = 0.57)
        </p>
      </div>

      {/* TVA */}
      <div className="bg-[#1b6955]/5 rounded-xl p-5 border border-[#1b6955]/20">
        <label className="block text-sm font-semibold text-[#1b6955] mb-3">
          Taux de TVA
        </label>
        <div className="flex items-center gap-4">
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={settings.tva_rate}
            onChange={(e) => handleChange('tva_rate', parseFloat(e.target.value) || 0)}
            className="flex-1 px-4 py-2.5 border border-[#1b6955]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] text-base font-semibold bg-white"
          />
          <span className="text-xl font-bold text-[#1b6955] min-w-[60px]">
            {(settings.tva_rate * 100).toFixed(1)}%
          </span>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Taux de TVA appliqué (ex: 20% = 0.20)
        </p>
      </div>

      {/* Bouton sauvegarder */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sauvegarde...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Sauvegarder les paramètres
            </>
          )}
        </button>
      </div>
    </div>
  );
}

