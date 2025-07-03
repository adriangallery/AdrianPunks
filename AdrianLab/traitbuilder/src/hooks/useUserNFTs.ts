/**
 * Hook for fetching user NFTs
 */

import { useCallback, useEffect, useState } from 'react';
import { NFT } from '@/types/nft';
import { getFromLocalStorage, saveToLocalStorage } from '@/utils/helpers';
import { STORAGE_KEYS } from '@/utils/constants';
import { useAccount } from 'wagmi';

export interface UseUserNFTsOptions {
  address?: string;
  enabled?: boolean;
  pageSize?: number;
}

export function useUserNFTs() {
  const { address, isConnected } = useAccount();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for now - will be replaced with real contract calls
  useEffect(() => {
    if (!address || !isConnected) {
      setNfts([]);
      return;
    }

    setIsLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      // Create mock NFTs
      const mockNFTs: NFT[] = [];
      
      for (let i = 1; i <= 5; i++) {
        const nft: NFT = {
          tokenId: i.toString(),
          owner: address,
          currentSkin: 0,
          previewUrl: `/api/preview?tokenId=${i}`,
          metadata: {
            name: `AdrianLab NFT #${i}`,
            description: `AdrianLab NFT with token ID ${i}`,
            image: `/api/preview?tokenId=${i}`,
            attributes: [
              { trait_type: 'Background', value: 'Default' },
              { trait_type: 'Base', value: 'Default' },
              { trait_type: 'Body', value: 'Default' },
            ],
          },
        };
        
        mockNFTs.push(nft);
      }

      setNfts(mockNFTs);
      setIsLoading(false);
    }, 1000);
  }, [address, isConnected]);

  return {
    nfts,
    isLoading,
    error: null,
  };
}

export const useUserNFTsOld = ({ address, enabled = true, pageSize = 12 }: UseUserNFTsOptions = {}) => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // Mock balance for now - in real implementation this would come from contract
  const balance = 5; // Mock balance

  // Fetch NFTs for the user
  const fetchNFTs = useCallback(async () => {
    if (!address || !enabled) {
      setNfts([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Create mock NFTs for testing
      const mockNFTs: NFT[] = [];
      
      for (let i = 0; i < Math.min(balance, pageSize); i++) {
        const tokenId = (i + 1).toString();
        
        const nft: NFT = {
          tokenId,
          owner: address,
          currentSkin: 0,
          previewUrl: `/api/preview?tokenId=${tokenId}`,
          metadata: {
            name: `AdrianLab NFT #${tokenId}`,
            description: `AdrianLab NFT with token ID ${tokenId}`,
            image: `/api/preview?tokenId=${tokenId}`,
            attributes: [
              { trait_type: 'Background', value: 'Default' },
              { trait_type: 'Base', value: 'Default' },
              { trait_type: 'Body', value: 'Default' },
            ],
          },
        };
        
        mockNFTs.push(nft);
      }

      setNfts(mockNFTs);
      setHasMore(mockNFTs.length >= pageSize);
      
      // Save to local storage
      if (mockNFTs.length > 0) {
        saveToLocalStorage(STORAGE_KEYS.SELECTED_NFT, mockNFTs[0].tokenId);
      }

    } catch (err) {
      setError('Failed to fetch NFTs');
      console.error('Error fetching NFTs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [address, balance, enabled, pageSize]);

  // Load NFTs on mount or when dependencies change
  useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  // Load more NFTs
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setPage(prev => prev + 1);
      // Implement pagination logic here
    }
  }, [isLoading, hasMore]);

  // Refresh NFTs
  const refresh = useCallback(() => {
    setPage(0);
    fetchNFTs();
  }, [fetchNFTs]);

  return {
    nfts,
    isLoading,
    error,
    hasMore,
    balance,
    loadMore,
    refresh,
  };
}; 