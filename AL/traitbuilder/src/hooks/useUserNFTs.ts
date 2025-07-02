/**
 * Hook for fetching user NFTs
 */

import { useCallback, useEffect, useState } from 'react';
import { useContractReads } from 'wagmi';
import { NFT } from '@/types/nft';
import { CONTRACTS } from '@/utils/contracts';
import { getFromLocalStorage, saveToLocalStorage } from '@/utils/helpers';
import { STORAGE_KEYS } from '@/utils/constants';

// Import ABIs
import adrianLabCoreABI from '@/abis/AdrianLabCore.json';

export interface UseUserNFTsOptions {
  address?: string;
  enabled?: boolean;
  pageSize?: number;
}

export const useUserNFTs = ({ address, enabled = true, pageSize = 12 }: UseUserNFTsOptions = {}) => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // Get user's NFT balance
  const { data: balanceData, isLoading: balanceLoading } = useContractReads({
    contracts: address ? [
      {
        address: CONTRACTS.ADRIAN_LAB_CORE as `0x${string}`,
        abi: adrianLabCoreABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      }
    ] : [],
    enabled: !!address && enabled,
  });

  const balance = balanceData?.[0]?.result as number || 0;

  // Fetch NFTs for the user
  const fetchNFTs = useCallback(async () => {
    if (!address || !enabled) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get token IDs owned by user
      const tokenIds: string[] = [];
      
      // Fetch token IDs in batches
      for (let i = 0; i < balance; i++) {
        try {
          const { data: tokenIdData } = await useContractReads({
            contracts: [{
              address: CONTRACTS.ADRIAN_LAB_CORE as `0x${string}`,
              abi: adrianLabCoreABI,
              functionName: 'tokenOfOwnerByIndex',
              args: [address as `0x${string}`, BigInt(i)],
            }],
          });
          
          const tokenId = tokenIdData?.[0]?.result;
          if (tokenId !== undefined) {
            tokenIds.push(tokenId.toString());
          }
        } catch (err) {
          console.error(`Error fetching token ${i}:`, err);
        }
      }

      // Fetch metadata for each token
      const nftPromises = tokenIds.map(async (tokenId) => {
        try {
          // Get token skin
          const { data: skinData } = await useContractReads({
            contracts: [{
              address: CONTRACTS.ADRIAN_LAB_CORE as `0x${string}`,
              abi: adrianLabCoreABI,
              functionName: 'tokenSkin',
              args: [BigInt(tokenId)],
            }],
          });

          const skin = skinData?.[0]?.result as number || 0;

          // Get token URI
          const { data: uriData } = await useContractReads({
            contracts: [{
              address: CONTRACTS.ADRIAN_LAB_CORE as `0x${string}`,
              abi: adrianLabCoreABI,
              functionName: 'tokenURI',
              args: [BigInt(tokenId)],
            }],
          });

          const tokenURI = uriData?.[0]?.result as string;

          // Fetch metadata from URI
          let metadata = null;
          if (tokenURI) {
            try {
              const response = await fetch(tokenURI);
              metadata = await response.json();
            } catch (err) {
              console.error(`Error fetching metadata for token ${tokenId}:`, err);
            }
          }

          const nft: NFT = {
            tokenId,
            owner: address,
            currentSkin: skin,
            previewUrl: metadata?.image || `/api/preview?tokenId=${tokenId}`,
            metadata,
          };

          return nft;
        } catch (err) {
          console.error(`Error processing token ${tokenId}:`, err);
          return null;
        }
      });

      const nftResults = await Promise.all(nftPromises);
      const validNFTs = nftResults.filter((nft): nft is NFT => nft !== null);

      setNfts(validNFTs);
      setHasMore(validNFTs.length >= pageSize);
      
      // Save to local storage
      saveToLocalStorage(STORAGE_KEYS.SELECTED_NFT, validNFTs[0]?.tokenId || null);

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
    isLoading: isLoading || balanceLoading,
    error,
    hasMore,
    balance,
    loadMore,
    refresh,
  };
}; 