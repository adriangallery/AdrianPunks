/**
 * Hook for fetching user traits
 */

import { useCallback, useEffect, useState } from 'react';
import { useContractReads } from 'wagmi';
import { Trait, TraitCategory } from '@/types/traits';
import { CONTRACTS } from '@/utils/contracts';
import { groupTraitsByCategory, filterTraits, sortTraits } from '@/utils/helpers';

// Import ABIs
import adrianTraitsCoreABI from '@/abis/AdrianTraitsCore.json';

export interface UseUserTraitsOptions {
  address?: string;
  enabled?: boolean;
  filters?: {
    category?: TraitCategory;
    rarity?: string;
    equipped?: boolean;
    search?: string;
  };
  sortBy?: 'id' | 'name' | 'rarity' | 'balance';
}

export const useUserTraits = ({ 
  address, 
  enabled = true, 
  filters = {},
  sortBy = 'id'
}: UseUserTraitsOptions = {}) => {
  const [traits, setTraits] = useState<Trait[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user traits from contract
  const { data: userTraitsData, isLoading: contractLoading } = useContractReads({
    contracts: address ? [
      {
        address: CONTRACTS.ADRIAN_TRAITS_CORE as `0x${string}`,
        abi: adrianTraitsCoreABI,
        functionName: 'getUserTraits',
        args: [address as `0x${string}`],
      }
    ] : [],
    enabled: !!address && enabled,
  });

  // Fetch traits metadata
  const fetchTraitsMetadata = useCallback(async (traitIds: number[], balances: number[]) => {
    if (!traitIds.length) return [];

    try {
      const traitPromises = traitIds.map(async (traitId, index) => {
        try {
          // Get trait metadata from contract
          const { data: metadataData } = await useContractReads({
            contracts: [{
              address: CONTRACTS.ADRIAN_TRAITS_CORE as `0x${string}`,
              abi: adrianTraitsCoreABI,
              functionName: 'getTraitMetadata',
              args: [BigInt(traitId)],
            }],
          });

          const metadata = metadataData?.[0]?.result as [string, string, string, string] | undefined;
          
          if (metadata) {
            const [name, category, description, imageURI] = metadata;
            
            const trait: Trait = {
              id: traitId,
              category: category as TraitCategory,
              name: name || `Trait #${traitId}`,
              description: description || '',
              imageURI: imageURI || '',
              balance: balances[index] || 0,
              isEquipped: false, // Will be updated by useEquippedTraits hook
              rarity: 'common', // Default rarity, can be enhanced later
            };

            return trait;
          }
        } catch (err) {
          console.error(`Error fetching metadata for trait ${traitId}:`, err);
        }
        return null;
      });

      const traitResults = await Promise.all(traitPromises);
      return traitResults.filter((trait): trait is Trait => trait !== null);

    } catch (err) {
      console.error('Error fetching traits metadata:', err);
      return [];
    }
  }, []);

  // Process user traits data
  useEffect(() => {
    const processUserTraits = async () => {
      if (!userTraitsData?.[0]?.result) return;

      try {
        setIsLoading(true);
        setError(null);

        const [traitIds, balances] = userTraitsData[0].result as [number[], number[]];
        
        if (!traitIds || !balances) {
          setTraits([]);
          return;
        }

        const traitsWithMetadata = await fetchTraitsMetadata(traitIds, balances);
        
        // Apply filters and sorting
        let filteredTraits = filterTraits(traitsWithMetadata, filters);
        filteredTraits = sortTraits(filteredTraits, sortBy);

        setTraits(filteredTraits);

      } catch (err) {
        setError('Failed to fetch traits');
        console.error('Error processing user traits:', err);
      } finally {
        setIsLoading(false);
      }
    };

    processUserTraits();
  }, [userTraitsData, fetchTraitsMetadata, filters, sortBy]);

  // Group traits by category
  const traitsByCategory = groupTraitsByCategory(traits);

  // Get traits for specific category
  const getTraitsByCategory = useCallback((category: TraitCategory) => {
    return traitsByCategory[category] || [];
  }, [traitsByCategory]);

  // Get trait by ID
  const getTraitById = useCallback((traitId: number) => {
    return traits.find(trait => trait.id === traitId);
  }, [traits]);

  // Refresh traits
  const refresh = useCallback(() => {
    // This will trigger a re-fetch by changing the enabled state temporarily
    // Implementation depends on how you want to handle refresh
  }, []);

  return {
    traits,
    traitsByCategory,
    isLoading: isLoading || contractLoading,
    error,
    getTraitsByCategory,
    getTraitById,
    refresh,
  };
}; 