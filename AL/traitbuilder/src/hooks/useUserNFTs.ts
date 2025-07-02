/**
 * Hook for fetching user NFTs
 */

import { useCallback, useEffect, useState } from 'react';
import { NFT } from '@/types/nft';
import { getFromLocalStorage, saveToLocalStorage } from '@/utils/helpers';
import { STORAGE_KEYS } from '@/utils/constants';
import { useAccount, useContractReads } from 'wagmi';
import AdrianLabCoreABI from '../abis/AdrianLabCore.json';
import { ADRIAN_LAB_CORE_ADDRESS } from '../utils/constants';

// Filtrar solo las funciones del ABI para evitar errores de tipado
const abiFunctions = AdrianLabCoreABI.filter(item => item.type === 'function');

export interface UseUserNFTsOptions {
  address?: string;
  enabled?: boolean;
  pageSize?: number;
}

export function useUserNFTs() {
  const { address, isConnected } = useAccount();

  // Leer el balance de tokens de la wallet
  const { data: balanceData, isLoading: balanceLoading } = useContractReads({
    contracts: [
      {
        address: ADRIAN_LAB_CORE_ADDRESS as `0x${string}`,
        abi: abiFunctions,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
        enabled: !!address && isConnected,
      },
    ],
  });

  const balance = balanceData?.[0]?.result as bigint | undefined;
  const tokenCount = balance ? Number(balance) : 0;

  // Crear contratos para leer cada token por índice
  const tokenContracts = Array.from({ length: tokenCount }, (_, index) => ({
    address: ADRIAN_LAB_CORE_ADDRESS as `0x${string}`,
    abi: abiFunctions,
    functionName: 'tokenOfOwnerByIndex' as const,
    args: [address as `0x${string}`, BigInt(index)],
    enabled: !!address && isConnected,
  }));

  // Leer todos los token IDs
  const { data: tokenIdsData, isLoading: tokenIdsLoading } = useContractReads({
    contracts: tokenContracts,
  });

  const tokenIds = tokenIdsData?.map(result => 
    result.result ? Number(result.result) : null
  ).filter(id => id !== null) as number[] || [];

  // Crear contratos para leer datos de cada token
  const tokenDataContracts = tokenIds.map(tokenId => [
    {
      address: ADRIAN_LAB_CORE_ADDRESS as `0x${string}`,
      abi: abiFunctions,
      functionName: 'getTraits' as const,
      args: [BigInt(tokenId)],
      enabled: !!address && isConnected,
    },
    {
      address: ADRIAN_LAB_CORE_ADDRESS as `0x${string}`,
      abi: abiFunctions,
      functionName: 'getTokenSkin' as const,
      args: [BigInt(tokenId)],
      enabled: !!address && isConnected,
    },
    {
      address: ADRIAN_LAB_CORE_ADDRESS as `0x${string}`,
      abi: abiFunctions,
      functionName: 'getTokenData' as const,
      args: [BigInt(tokenId)],
      enabled: !!address && isConnected,
    },
  ]).flat();

  // Leer datos de todos los tokens
  const { data: tokenData, isLoading: tokenDataLoading } = useContractReads({
    contracts: tokenDataContracts,
  });

  // Procesar los datos de los tokens
  const nfts: NFT[] = [];
  
  if (tokenData && tokenIds.length > 0) {
    for (let i = 0; i < tokenIds.length; i++) {
      const tokenId = tokenIds[i];
      const baseIndex = i * 3;
      
      const traitsData = tokenData[baseIndex]?.result as [bigint, bigint, string] | undefined;
      const skinData = tokenData[baseIndex + 1]?.result as [bigint, string] | undefined;
      const tokenDataResult = tokenData[baseIndex + 2]?.result as [bigint, number, boolean, bigint, bigint, boolean] | undefined;

      if (traitsData) {
        const [generation, , mutation] = traitsData;
        const skinId = skinData ? Number(skinData[0]) : undefined;
        const skinName = skinData ? skinData[1] : undefined;
        const mutationLevel = tokenDataResult ? tokenDataResult[1] : undefined;
        const canReplicate = tokenDataResult ? tokenDataResult[2] : undefined;
        const hasBeenModified = tokenDataResult ? tokenDataResult[5] : undefined;

        nfts.push({
          id: `adrian-lab-${tokenId}`,
          tokenId,
          name: `AdrianLab #${tokenId}`,
          image: `/api/preview?tokenId=${tokenId}`,
          attributes: {
            generation: Number(generation),
            mutation,
            skinId,
            skinName,
            mutationLevel,
            canReplicate,
            hasBeenModified,
          },
        });
      }
    }
  }

  const isLoading = balanceLoading || tokenIdsLoading || tokenDataLoading;

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