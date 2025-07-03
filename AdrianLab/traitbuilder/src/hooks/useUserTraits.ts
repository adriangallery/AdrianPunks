/**
 * Hook for fetching user traits
 */

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { TraitCategory } from '@/types/traits';

export interface Trait {
  id: string;
  tokenId: number;
  category: TraitCategory;
  name: string;
  image: string;
  rarity: string;
  balance: number;
}

export function useUserTraits() {
  const { address, isConnected } = useAccount();
  const [traits, setTraits] = useState<Trait[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for now - will be replaced with real contract calls
  useEffect(() => {
    if (!address || !isConnected) {
      setTraits([]);
      return;
    }

    setIsLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      // Create mock traits
      const mockTraits: Trait[] = [];
      const categories: TraitCategory[] = ['BACKGROUND', 'BASE', 'BODY', 'CLOTHING', 'EYES', 'MOUTH', 'HEAD', 'ACCESSORIES'];
      const rarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
      
      for (let i = 1; i <= 20; i++) {
        const category = categories[i % categories.length];
        const rarity = rarities[i % rarities.length];
        
        const trait: Trait = {
          id: `trait-${i}`,
          tokenId: i,
          category,
          name: `${category} #${i}`,
          image: `/api/preview?traitId=${i}`,
          rarity,
          balance: Math.floor(Math.random() * 5) + 1, // Random balance 1-5
        };
        
        mockTraits.push(trait);
      }

      setTraits(mockTraits);
      setIsLoading(false);
    }, 1000);
  }, [address, isConnected]);

  return {
    traits,
    isLoading,
    error: null,
  };
} 