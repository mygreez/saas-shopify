'use client';

import React from 'react';
import Link from 'next/link';

interface CompanyCardProps {
  company: {
    invitation_id: string;
    company_name: string;
    email: string;
    contact_name?: string;
    created_at: string;
    submission: {
      id: string;
      status: string;
      created_at: string;
      updated_at: string;
      brand: {
        id: string;
        name: string;
        contact_email: string;
        logo_url: string | null;
        description: string | null;
      } | null;
      product_count: number;
    } | null;
  };
  onDelete?: (invitationId: string, companyName: string) => void;
  onConfirm?: (submissionId: string) => void;
  deleting?: boolean;
}

const statusLabels: Record<string, string> = {
  step1_completed: 'Step 1 complété',
  step2_in_progress: 'Step 2 en cours',
  step2_completed: 'Step 2 complété',
  submitted: 'Soumis',
  confirmed: 'Confirmé',
};

const statusColors: Record<string, string> = {
  step1_completed: 'bg-yellow-100 text-yellow-800',
  step2_in_progress: 'bg-blue-100 text-blue-800',
  step2_completed: 'bg-purple-100 text-purple-800',
  submitted: 'bg-green-100 text-green-800',
  confirmed: 'bg-gray-100 text-gray-800',
};

function CompanyCard({ company, onDelete, onConfirm, deleting }: CompanyCardProps) {
  const logoUrl = company.submission?.brand?.logo_url;
  const productCount = company.submission?.product_count || 0;
  const status = company.submission?.status || 'no_submission';

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
      {/* Header avec logo et nom */}
      <div className="flex items-start mb-4">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={company.company_name}
            className="h-16 w-16 rounded-lg object-cover mr-4"
            loading="lazy"
          />
        ) : (
          <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center mr-4">
            <span className="text-2xl font-bold text-gray-400">
              {company.company_name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{company.company_name}</h3>
          {company.submission?.brand?.name && company.submission.brand.name !== company.company_name && (
            <p className="text-sm text-gray-500">Marque: {company.submission.brand.name}</p>
          )}
        </div>
      </div>

      {/* Informations */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <span className="font-medium mr-2">Email:</span>
          <span>{company.email || company.submission?.brand?.contact_email || '-'}</span>
        </div>
        {company.contact_name && (
          <div className="flex items-center text-sm text-gray-600">
            <span className="font-medium mr-2">Contact:</span>
            <span>{company.contact_name}</span>
          </div>
        )}
        <div className="flex items-center text-sm text-gray-600">
          <span className="font-medium mr-2">Produits:</span>
          <span className="font-bold text-[#1b6955]">{productCount}</span>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <span>Créé le {new Date(company.created_at).toLocaleDateString('fr-FR')}</span>
        </div>
      </div>

      {/* Statut */}
      {company.submission ? (
        <div className="mb-4">
          <span
            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
              statusColors[status] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {statusLabels[status] || status}
          </span>
        </div>
      ) : (
        <div className="mb-4">
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-500">
            Aucune soumission
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-gray-200">
        {company.submission && (
          <>
            <Link
              href={`/dashboard/companies/${company.submission.id}`}
              className="flex-1 text-center px-4 py-2 bg-[#1b6955] text-white rounded-lg hover:bg-[#165544] transition-colors text-sm font-medium"
            >
              Voir détails
            </Link>
            {company.submission.status !== 'confirmed' && onConfirm && (
              <button
                onClick={() => onConfirm(company.submission!.id)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Confirmer
              </button>
            )}
          </>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(company.invitation_id, company.company_name)}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? '...' : 'Supprimer'}
          </button>
        )}
      </div>
    </div>
  );
}

// Memoize le composant pour éviter les re-renders inutiles
export default React.memo(CompanyCard, (prevProps, nextProps) => {
  // Comparaison personnalisée pour éviter les re-renders si les données n'ont pas changé
  return (
    prevProps.company.invitation_id === nextProps.company.invitation_id &&
    prevProps.company.submission?.id === nextProps.company.submission?.id &&
    prevProps.company.submission?.status === nextProps.company.submission?.status &&
    prevProps.company.submission?.product_count === nextProps.company.submission?.product_count &&
    prevProps.deleting === nextProps.deleting
  );
});

