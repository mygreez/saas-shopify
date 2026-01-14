'use client';

import { useState } from 'react';

interface PartnerRegisterFormProps {
  token: string;
  onSubmit: (formData: FormData) => Promise<void>;
  loading?: boolean;
}

export default function PartnerRegisterForm({ token, onSubmit, loading = false }: PartnerRegisterFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (formData: FormData): boolean => {
    const newErrors: Record<string, string> = {};
    
    const companyName = formData.get('company_name') as string;
    const email = formData.get('email') as string;
    const contactName = formData.get('contact_name') as string;

    if (!companyName || companyName.trim().length === 0) {
      newErrors.company_name = 'Le nom d\'entreprise est requis';
    }

    if (!email || email.trim().length === 0) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'L\'email n\'est pas valide';
    }

    if (!contactName || contactName.trim().length === 0) {
      newErrors.contact_name = 'Le nom du contact est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append('token', token);

    if (validateForm(formData)) {
      await onSubmit(formData);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 md:p-10 max-w-2xl mx-auto border border-gray-200">
      {/* En-tête avec icône */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1b6955]/10 mb-4">
          <svg className="w-8 h-8 text-[#1b6955]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Inscription Partenaire</h1>
        <p className="text-gray-600 text-lg">Remplissez les informations suivantes pour commencer votre collaboration avec GREEZ</p>
      </div>

      {/* Indicateur de progression */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#1b6955] text-white flex items-center justify-center font-semibold text-sm">
            1
          </div>
          <div className="h-1 w-16 bg-gray-200 rounded-full">
            <div className="h-1 w-0 bg-gray-300 rounded-full"></div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-semibold text-sm">
            2
          </div>
          <div className="h-1 w-16 bg-gray-200 rounded-full">
            <div className="h-1 w-0 bg-gray-300 rounded-full"></div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-semibold text-sm">
            3
          </div>
        </div>
        <p className="text-center text-sm text-gray-500">Étape 1 sur 3 : Informations de base</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nom d'entreprise */}
        <div>
          <label htmlFor="company_name" className="block text-sm font-semibold text-gray-700 mb-2">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#1b6955]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Nom d'entreprise
              <span className="text-red-500">*</span>
            </span>
          </label>
          <input
            type="text"
            id="company_name"
            name="company_name"
            required
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] transition-colors ${
              errors.company_name ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="Ex: Ma Société SARL"
          />
          {errors.company_name && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.company_name}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#1b6955]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
              <span className="text-red-500">*</span>
            </span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] transition-colors ${
              errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="contact@exemple.com"
          />
          {errors.email && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.email}
            </p>
          )}
        </div>

        {/* Nom du contact */}
        <div>
          <label htmlFor="contact_name" className="block text-sm font-semibold text-gray-700 mb-2">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#1b6955]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Nom du contact
              <span className="text-red-500">*</span>
            </span>
          </label>
          <input
            type="text"
            id="contact_name"
            name="contact_name"
            required
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:border-[#1b6955] transition-colors ${
              errors.contact_name ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="Ex: Jean Dupont"
          />
          {errors.contact_name && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.contact_name}
            </p>
          )}
        </div>

        {/* Bouton de soumission */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-[#1b6955] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#165544] focus:outline-none focus:ring-2 focus:ring-[#1b6955] focus:ring-offset-2 transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02] ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enregistrement en cours...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Continuer
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            )}
          </button>
        </div>
      </form>

      {/* Lien "Déjà partenaire" */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-600 mb-2">Déjà partenaire ?</p>
        <a
          href="/partner/check-email"
          className="text-[#1b6955] hover:text-[#165544] text-sm font-semibold underline transition-colors inline-flex items-center gap-1"
        >
          Vérifiez votre accès
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  );
}

