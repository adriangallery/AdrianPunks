/**
 * Equipped traits component
 */

import React from 'react';
import { NFT } from '@/types/nft';
import { TraitCategory } from '@/types/traits';
import { CATEGORY_DISPLAY_NAMES } from '@/utils/constants';

interface EquippedTraitsProps {
  nft: NFT;
  equippedTraits: Record<TraitCategory, any[]>;
  className?: string;
}

export const EquippedTraits: React.FC<EquippedTraitsProps> = ({
  nft,
  equippedTraits,
  className = '',
}) => {
  // Get equipped traits by category
  const getEquippedTraits = () => {
    const equipped: Array<{ category: TraitCategory; trait: any }> = [];
    
    Object.entries(equippedTraits).forEach(([category, traits]) => {
      const equippedTrait = traits.find((trait: any) => trait.isEquipped);
      if (equippedTrait) {
        equipped.push({
          category: category as TraitCategory,
          trait: equippedTrait,
        });
      }
    });
    
    return equipped;
  };

  const equippedTraitsList = getEquippedTraits();

  return (
    <div className={`card ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Traits Equipados</h2>
        <p className="text-sm text-gray-600">
          Traits actualmente equipados en tu NFT
        </p>
      </div>

      {/* Equipped Traits List */}
      <div className="space-y-4">
        {equippedTraitsList.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-gray-600">No hay traits equipados</p>
            <p className="text-sm text-gray-500 mt-1">
              Selecciona traits en el panel izquierdo para equiparlos
            </p>
          </div>
        ) : (
          equippedTraitsList.map(({ category, trait }) => (
            <div
              key={`${category}-${trait.id}`}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
            >
              {/* Trait Image */}
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-white">
                <img
                  src={trait.imageURI || `/api/traits/${trait.id}/image`}
                  alt={trait.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/api/traits/placeholder';
                  }}
                />
              </div>

              {/* Trait Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 text-sm truncate">
                  {trait.name}
                </h3>
                <p className="text-xs text-gray-500">
                  {CATEGORY_DISPLAY_NAMES[category]}
                </p>
                {trait.rarity && (
                  <span className="inline-block mt-1 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    {trait.rarity}
                  </span>
                )}
              </div>

              {/* Unequip Button */}
              <button
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="Desequipar trait"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      {equippedTraitsList.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Traits Equipados</p>
              <p className="font-medium text-gray-900">{equippedTraitsList.length}</p>
            </div>
            <div>
              <p className="text-gray-600">Categorías</p>
              <p className="font-medium text-gray-900">
                {new Set(equippedTraitsList.map(item => item.category)).size}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 space-y-2">
        <button className="w-full btn-danger">
          Desequipar Todo
        </button>
        <button className="w-full btn-secondary">
          Guardar Configuración
        </button>
      </div>
    </div>
  );
}; 