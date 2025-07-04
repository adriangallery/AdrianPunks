/**
 * Preview display component for NFT with traits
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NFT } from '@/types/nft';
import { TraitCategory } from '@/types/traits';
import { getNFTDisplayName, getNFTImageUrl } from '@/utils/helpers';

interface PreviewDisplayProps {
  nft: NFT;
  selectedTraits: Record<TraitCategory, any[]>;
  className?: string;
}

export const PreviewDisplay: React.FC<PreviewDisplayProps> = ({
  nft,
  selectedTraits,
  className = '',
}) => {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRequestRef = useRef<string>('');

  // Build preview URL with selected traits
  const buildPreviewUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.append('tokenId', nft.tokenId);
    
    // Add equipped traits to URL
    Object.entries(selectedTraits).forEach(([category, traits]) => {
      const equippedTrait = traits.find((trait: any) => trait.isEquipped);
      if (equippedTrait) {
        params.append('traits', `${category}:${equippedTrait.id}`);
      }
    });
    
    return `/api/preview?${params.toString()}`;
  }, [nft.tokenId, selectedTraits]);

  // Debounced preview update
  const updatePreview = useCallback(async () => {
    const url = buildPreviewUrl();
    
    // Skip if this is the same request as the last one
    if (url === lastRequestRef.current) {
      return;
    }
    
    lastRequestRef.current = url;
      setIsLoading(true);
      setError(null);
      
      try {
      // Add a small delay to prevent rapid requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
        setPreviewUrl(url);
      } catch (err) {
        setError('Error generating preview');
        console.error('Preview error:', err);
      } finally {
        setIsLoading(false);
      }
  }, [buildPreviewUrl]);

  // Update preview when traits change with debouncing
  useEffect(() => {
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Set new timeout for debouncing
    debounceTimeoutRef.current = setTimeout(() => {
      updatePreview();
    }, 500); // 500ms debounce delay
    
    // Cleanup on unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [updatePreview]);

  return (
    <div className={`card ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Preview</h2>
        <p className="text-sm text-gray-600">
          Vista previa en tiempo real de tu NFT
        </p>
      </div>

      {/* NFT Info */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <img
            src={getNFTImageUrl(nft)}
            alt={getNFTDisplayName(nft)}
            className="w-12 h-12 rounded-lg object-cover"
          />
          <div>
            <h3 className="font-medium text-gray-900">
              {getNFTDisplayName(nft)}
            </h3>
            <p className="text-sm text-gray-600">
              Token #{nft.tokenId}
            </p>
          </div>
        </div>
      </div>

      {/* Preview Image */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
            <div className="spinner w-8 h-8"></div>
          </div>
        )}
        
        {error && (
          <div className="aspect-square bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-500 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}
        
        {!isLoading && !error && (
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={previewUrl || getNFTImageUrl(nft)}
              alt="NFT Preview"
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = getNFTImageUrl(nft);
              }}
            />
          </div>
        )}
      </div>

      {/* Equipped Traits Summary */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Traits Equipados</h4>
        <div className="space-y-2">
          {Object.entries(selectedTraits).map(([category, traits]) => {
            const equippedTrait = traits.find((trait: any) => trait.isEquipped);
            if (!equippedTrait) return null;
            
            return (
              <div key={category} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 capitalize">{category.toLowerCase()}</span>
                <span className="font-medium text-gray-900">{equippedTrait.name}</span>
              </div>
            );
          })}
          
          {Object.values(selectedTraits).every((traits: any[]) => 
            !traits.some((trait: any) => trait.isEquipped)
          ) && (
            <p className="text-sm text-gray-500 italic">
              No hay traits equipados
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-2">
        <button className="w-full btn-primary">
          Aplicar Cambios
        </button>
        <button className="w-full btn-secondary">
          Resetear Traits
        </button>
      </div>
    </div>
  );
}; 