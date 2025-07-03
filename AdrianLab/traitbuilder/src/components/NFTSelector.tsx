/**
 * NFT selection component
 */

import React from 'react';
import { NFT } from '@/types/nft';
import { formatTokenId, getNFTDisplayName, getNFTImageUrl } from '@/utils/helpers';

interface NFTSelectorProps {
  nfts: NFT[];
  selectedNFT: NFT | null;
  onSelectNFT: (nft: NFT) => void;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export const NFTSelector: React.FC<NFTSelectorProps> = ({
  nfts,
  selectedNFT,
  onSelectNFT,
  isLoading = false,
  error = null,
  className = '',
}) => {
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="text-gray-600">Loading your NFTs...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-center">
          <p className="font-medium">Error loading NFTs</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No NFTs Found</h3>
          <p className="text-gray-600">You don't have any AdrianLab NFTs in your wallet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Select an NFT</h2>
        <p className="text-gray-600">
          Choose an NFT from your collection to customize with traits
        </p>
      </div>

      {/* NFT Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {nfts.map((nft) => {
          const isSelected = selectedNFT?.tokenId === nft.tokenId;
          
          return (
            <div
              key={nft.tokenId}
              className={`
                relative group cursor-pointer rounded-lg border-2 transition-all duration-200
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50 shadow-lg' 
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }
              `}
              onClick={() => onSelectNFT(nft)}
            >
              {/* NFT Image */}
              <div className="aspect-square rounded-t-lg overflow-hidden bg-gray-100">
                <img
                  src={getNFTImageUrl(nft)}
                  alt={getNFTDisplayName(nft)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/api/preview?tokenId=' + nft.tokenId;
                  }}
                />
              </div>

              {/* NFT Info */}
              <div className="p-3">
                <h3 className="font-medium text-gray-900 text-sm truncate">
                  {getNFTDisplayName(nft)}
                </h3>
                <p className="text-xs text-gray-500">
                  {formatTokenId(nft.tokenId)}
                </p>
                
                {/* Skin Info */}
                {nft.currentSkin > 0 && (
                  <div className="mt-1">
                    <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                      Skin {nft.currentSkin}
                    </span>
                  </div>
                )}
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg" />
            </div>
          );
        })}
      </div>

      {/* Selected NFT Info */}
      {selectedNFT && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-4">
            <img
              src={getNFTImageUrl(selectedNFT)}
              alt={getNFTDisplayName(selectedNFT)}
              className="w-16 h-16 rounded-lg object-cover"
            />
            <div>
              <h3 className="font-medium text-gray-900">
                {getNFTDisplayName(selectedNFT)}
              </h3>
              <p className="text-sm text-gray-600">
                {formatTokenId(selectedNFT.tokenId)} • Ready for customization
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 