/**
 * Trait panel component for displaying traits by category
 */

import React, { useState } from 'react';
import { Trait } from '../hooks/useUserTraits';

interface TraitPanelProps {
  traits: Trait[];
  selectedNFT: string | null;
}

export default function TraitPanel({ traits, selectedNFT }: TraitPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Agrupar traits por categoría
  const traitsByCategory = traits.reduce((acc, trait) => {
    const category = trait.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(trait);
    return acc;
  }, {} as Record<string, Trait[]>);

  // Obtener todas las categorías únicas
  const categories = ['ALL', ...Object.keys(traitsByCategory)];

  // Filtrar traits por categoría seleccionada
  const filteredTraits = selectedCategory === 'ALL' 
    ? traits 
    : traitsByCategory[selectedCategory] || [];

  return (
    <div className="space-y-4">
      {/* Category Selector */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            {category} ({category === 'ALL' ? traits.length : traitsByCategory[category]?.length || 0})
          </button>
        ))}
      </div>

      {/* Traits Grid */}
      {selectedNFT ? (
        <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
          {filteredTraits.map((trait) => (
            <div
              key={trait.id}
              className="bg-white/5 rounded-lg p-3 border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
            >
              {/* Trait Image */}
              <div className="aspect-square bg-gradient-to-br from-purple-500 to-blue-600 rounded mb-2 overflow-hidden">
                <img
                  src={trait.image}
                  alt={trait.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/api/preview?traitId=' + trait.tokenId;
                  }}
                />
              </div>

              {/* Trait Info */}
              <div className="space-y-1">
                <h4 className="text-white font-medium text-sm truncate">
                  {trait.name}
                </h4>
                <div className="flex justify-between items-center">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    trait.rarity === 'Legendary' ? 'bg-yellow-500/20 text-yellow-300' :
                    trait.rarity === 'Epic' ? 'bg-purple-500/20 text-purple-300' :
                    trait.rarity === 'Rare' ? 'bg-blue-500/20 text-blue-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>
                    {trait.rarity}
                  </span>
                  <span className="text-xs text-gray-400">
                    x{trait.balance}
                  </span>
                </div>
              </div>

              {/* Equip Button */}
              <button
                className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded transition-colors"
                onClick={() => {
                  // TODO: Implementar lógica para equipar trait
                  console.log('Equip trait:', trait.id);
                }}
                disabled={trait.balance === 0}
              >
                {trait.balance > 0 ? 'Equipar' : 'Sin stock'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-400">
            Selecciona un NFT para ver los traits disponibles
          </p>
        </div>
      )}

      {filteredTraits.length === 0 && selectedNFT && (
        <div className="text-center py-8">
          <p className="text-gray-400">
            No tienes traits en la categoría "{selectedCategory}"
          </p>
        </div>
      )}
    </div>
  );
} 