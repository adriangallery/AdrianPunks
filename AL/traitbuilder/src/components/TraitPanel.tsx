/**
 * Trait panel component for displaying traits by category
 */

import React from 'react';
import { Trait, TraitCategory } from '@/types/traits';
import { CATEGORY_DISPLAY_NAMES, CATEGORY_COLORS, RARITY_LEVELS } from '@/utils/constants';
import { getTraitDisplayName, getTraitImageUrl } from '@/utils/helpers';

interface TraitPanelProps {
  traitsByCategory: Record<TraitCategory, Trait[]>;
  selectedCategory: TraitCategory;
  onSelectCategory: (category: TraitCategory) => void;
  onSelectTrait?: (trait: Trait) => void;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export const TraitPanel: React.FC<TraitPanelProps> = ({
  traitsByCategory,
  selectedCategory,
  onSelectCategory,
  onSelectTrait,
  isLoading = false,
  error = null,
  className = '',
}) => {
  const categories = Object.keys(traitsByCategory) as TraitCategory[];
  const selectedTraits = traitsByCategory[selectedCategory] || [];

  if (isLoading) {
    return (
      <div className={`card ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="spinner w-6 h-6"></div>
          <span className="ml-2 text-gray-600">Cargando traits...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`card ${className}`}>
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Traits</h2>
        
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const traitCount = traitsByCategory[category]?.length || 0;
            const isSelected = selectedCategory === category;
            
            return (
              <button
                key={category}
                onClick={() => onSelectCategory(category)}
                className={`
                  px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${isSelected 
                    ? `${CATEGORY_COLORS[category]} text-white shadow-lg` 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                <span>{CATEGORY_DISPLAY_NAMES[category]}</span>
                <span className="ml-1 text-xs opacity-75">({traitCount})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Traits Grid */}
      <div className="space-y-4">
        {selectedTraits.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-gray-600">No traits disponibles en esta categoría</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {selectedTraits.map((trait) => (
              <TraitCard
                key={trait.id}
                trait={trait}
                onClick={() => onSelectTrait?.(trait)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Trait Card Component
interface TraitCardProps {
  trait: Trait;
  onClick?: () => void;
}

const TraitCard: React.FC<TraitCardProps> = ({ trait, onClick }) => {
  const rarity = trait.rarity || 'common';
  const rarityConfig = RARITY_LEVELS[rarity];

  return (
    <div
      className={`
        relative group cursor-pointer rounded-lg border-2 transition-all duration-200
        ${trait.isEquipped 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
        }
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
      onClick={onClick}
    >
      {/* Trait Image */}
      <div className="aspect-square rounded-t-lg overflow-hidden bg-gray-100">
        <img
          src={getTraitImageUrl(trait)}
          alt={getTraitDisplayName(trait)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/api/traits/placeholder';
          }}
        />
      </div>

      {/* Trait Info */}
      <div className="p-2">
        <h3 className="font-medium text-gray-900 text-xs truncate">
          {getTraitDisplayName(trait)}
        </h3>
        
        {/* Rarity Badge */}
        <div className="mt-1 flex items-center justify-between">
          <span className={`badge ${rarityConfig.bgColor} ${rarityConfig.color} text-xs`}>
            {rarityConfig.name}
          </span>
          
          {/* Balance */}
          <span className="text-xs text-gray-500">
            x{trait.balance}
          </span>
        </div>

        {/* Equipped Indicator */}
        {trait.isEquipped && (
          <div className="absolute top-1 right-1">
            <div className="bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg" />
    </div>
  );
}; 