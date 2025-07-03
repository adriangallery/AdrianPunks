import React from 'react';
import { NFT } from '@/types/nft';

interface NFTGridProps {
  nfts: NFT[];
  selectedNFT: string | null;
  onSelectNFT: (nftId: string) => void;
}

export default function NFTGrid({ nfts, selectedNFT, onSelectNFT }: NFTGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {nfts.map((nft) => (
        <div
          key={nft.tokenId}
          className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-105 ${
            selectedNFT === nft.tokenId
              ? 'border-blue-400 shadow-lg shadow-blue-400/25'
              : 'border-white/20 hover:border-white/40'
          }`}
          onClick={() => onSelectNFT(nft.tokenId)}
        >
          {/* NFT Image */}
          <div className="aspect-square bg-gradient-to-br from-purple-500 to-blue-600 relative">
            <img
              src={nft.previewUrl}
              alt={nft.metadata?.name || `NFT #${nft.tokenId}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/api/preview?tokenId=' + nft.tokenId;
              }}
            />
            
            {/* Overlay with NFT info */}
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
              <h3 className="text-white font-semibold text-sm">{nft.metadata?.name || `NFT #${nft.tokenId}`}</h3>
              <div className="text-gray-300 text-xs mt-1">
                <p>Token ID: {nft.tokenId}</p>
                <p>Skin: {nft.currentSkin}</p>
              </div>
            </div>
          </div>

          {/* Selection indicator */}
          {selectedNFT === nft.tokenId && (
            <div className="absolute top-2 right-2 w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );
} 