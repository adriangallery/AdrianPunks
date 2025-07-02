/**
 * Helper functions for the application
 */

import { Trait, TraitCategory } from '@/types/traits';
import { NFT } from '@/types/nft';

// Formatting functions
export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatTokenId = (tokenId: string): string => {
  return `#${tokenId}`;
};

export const formatTraitId = (traitId: number): string => {
  return `Trait #${traitId}`;
};

// Array and object utilities
export const groupTraitsByCategory = (traits: Trait[]): Record<TraitCategory, Trait[]> => {
  const grouped = {} as Record<TraitCategory, Trait[]>;
  
  // Initialize empty arrays for each category
  ['BACKGROUND', 'BASE', 'BODY', 'CLOTHING', 'EYES', 'MOUTH', 'HEAD', 'ACCESSORIES'].forEach(category => {
    grouped[category as TraitCategory] = [];
  });
  
  // Group traits by category
  traits.forEach(trait => {
    if (grouped[trait.category]) {
      grouped[trait.category].push(trait);
    }
  });
  
  return grouped;
};

export const filterTraits = (
  traits: Trait[],
  filters: {
    category?: TraitCategory;
    rarity?: string;
    equipped?: boolean;
    search?: string;
  }
): Trait[] => {
  return traits.filter(trait => {
    if (filters.category && trait.category !== filters.category) return false;
    if (filters.rarity && trait.rarity !== filters.rarity) return false;
    if (filters.equipped !== undefined && trait.isEquipped !== filters.equipped) return false;
    if (filters.search && !trait.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });
};

export const sortTraits = (traits: Trait[], sortBy: 'id' | 'name' | 'rarity' | 'balance' = 'id'): Trait[] => {
  return [...traits].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'rarity':
        const rarityOrder = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
        return (rarityOrder[a.rarity || 'common'] || 1) - (rarityOrder[b.rarity || 'common'] || 1);
      case 'balance':
        return b.balance - a.balance;
      default:
        return a.id - b.id;
    }
  });
};

// Local storage utilities
export const saveToLocalStorage = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const getFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
};

export const removeFromLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Validation utilities
export const validateTraitSelection = (
  traitId: number,
  category: TraitCategory,
  userTraits: Trait[]
): { isValid: boolean; error?: string } => {
  const trait = userTraits.find(t => t.id === traitId && t.category === category);
  
  if (!trait) {
    return { isValid: false, error: 'Trait not found' };
  }
  
  if (trait.balance <= 0) {
    return { isValid: false, error: 'Insufficient trait balance' };
  }
  
  return { isValid: true };
};

// URL utilities
export const buildPreviewUrl = (tokenId: string, traits: Record<string, number>): string => {
  const params = new URLSearchParams();
  params.append('tokenId', tokenId);
  
  Object.entries(traits).forEach(([category, traitId]) => {
    if (traitId) {
      params.append('traits', `${category}:${traitId}`);
    }
  });
  
  return `/api/preview?${params.toString()}`;
};

// Error handling utilities
export const isUserRejectedError = (error: any): boolean => {
  return error?.code === 'ACTION_REJECTED' || 
         error?.message?.includes('User rejected') ||
         error?.message?.includes('user rejected');
};

export const getErrorMessage = (error: any): string => {
  if (isUserRejectedError(error)) {
    return 'Transaction was rejected by user';
  }
  
  if (error?.code === 'INSUFFICIENT_FUNDS') {
    return 'Insufficient funds for transaction';
  }
  
  return error?.message || 'An unknown error occurred';
};

// NFT utilities
export const getNFTDisplayName = (nft: NFT): string => {
  return nft.metadata?.name || `AdrianLab #${nft.tokenId}`;
};

export const getNFTImageUrl = (nft: NFT): string => {
  return nft.metadata?.image || nft.previewUrl;
};

// Trait utilities
export const getTraitDisplayName = (trait: Trait): string => {
  return trait.name || `Trait #${trait.id}`;
};

export const getTraitImageUrl = (trait: Trait): string => {
  return trait.imageURI || `/api/traits/${trait.id}/image`;
}; 