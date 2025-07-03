/**
 * Equipped traits component
 */

import React from 'react';
import { NFT } from '@/types/nft';
import { TraitCategory } from '@/types/traits';
import { CATEGORY_DISPLAY_NAMES } from '@/utils/constants';

interface EquippedTraitsProps {
  nftId: string;
}

export default function EquippedTraits({ nftId }: EquippedTraitsProps) {
  // TODO: Implementar lógica para obtener traits equipados del NFT
  // Por ahora mostrar información básica del NFT seleccionado
  
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="text-white font-medium mb-2">NFT #{nftId.split('-').pop()}</h4>
        <div className="aspect-square bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg overflow-hidden mb-3">
          <img
            src={`/api/preview?tokenId=${nftId.split('-').pop()}`}
            alt={`NFT ${nftId}`}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Traits Equipados */}
      <div className="space-y-3">
        <h5 className="text-white font-medium text-sm">Traits Equipados:</h5>
        
        {/* Placeholder para traits equipados */}
        <div className="space-y-2">
          <div className="bg-white/5 rounded p-2 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-xs">Background</span>
              <span className="text-gray-400 text-xs">Default</span>
            </div>
          </div>
          
          <div className="bg-white/5 rounded p-2 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-xs">Body</span>
              <span className="text-gray-400 text-xs">Default</span>
            </div>
          </div>
          
          <div className="bg-white/5 rounded p-2 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-xs">Eyes</span>
              <span className="text-gray-400 text-xs">Default</span>
            </div>
          </div>
          
          <div className="bg-white/5 rounded p-2 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-xs">Mouth</span>
              <span className="text-gray-400 text-xs">Default</span>
            </div>
          </div>
          
          <div className="bg-white/5 rounded p-2 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-xs">Accessory</span>
              <span className="text-gray-400 text-xs">None</span>
            </div>
          </div>
        </div>

        {/* Botón para guardar cambios */}
        <button
          className="w-full bg-green-500 hover:bg-green-600 text-white text-sm py-2 px-4 rounded transition-colors"
          onClick={() => {
            // TODO: Implementar lógica para guardar cambios
            console.log('Guardar cambios para NFT:', nftId);
          }}
        >
          Guardar Cambios
        </button>
      </div>
    </div>
  );
} 