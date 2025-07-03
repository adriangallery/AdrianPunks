/**
 * Application constants
 */

import { TraitCategory } from '@/types/traits';

// Trait categories
export const TRAIT_CATEGORIES: TraitCategory[] = [
  'BACKGROUND',
  'BASE',
  'BODY',
  'CLOTHING',
  'EYES',
  'MOUTH',
  'HEAD',
  'ACCESSORIES',
];

// Trait category display names
export const CATEGORY_DISPLAY_NAMES: Record<TraitCategory, string> = {
  BACKGROUND: 'Background',
  BASE: 'Base',
  BODY: 'Body',
  CLOTHING: 'Clothing',
  EYES: 'Eyes',
  MOUTH: 'Mouth',
  HEAD: 'Head',
  ACCESSORIES: 'Accessories',
};

// Trait category colors for UI
export const CATEGORY_COLORS: Record<TraitCategory, string> = {
  BACKGROUND: 'bg-gradient-to-r from-blue-500 to-purple-600',
  BASE: 'bg-gradient-to-r from-green-500 to-teal-600',
  BODY: 'bg-gradient-to-r from-orange-500 to-red-600',
  CLOTHING: 'bg-gradient-to-r from-pink-500 to-rose-600',
  EYES: 'bg-gradient-to-r from-yellow-500 to-orange-600',
  MOUTH: 'bg-gradient-to-r from-red-500 to-pink-600',
  HEAD: 'bg-gradient-to-r from-purple-500 to-indigo-600',
  ACCESSORIES: 'bg-gradient-to-r from-indigo-500 to-blue-600',
};

// Rarity levels and their colors
export const RARITY_LEVELS = {
  common: {
    name: 'Common',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  uncommon: {
    name: 'Uncommon',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  rare: {
    name: 'Rare',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  epic: {
    name: 'Epic',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  legendary: {
    name: 'Legendary',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
} as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;

// Contract addresses - will be loaded from config
export const getContractAddresses = () => {
  if (typeof window !== 'undefined' && window.ADRIANLAB_CONFIG) {
    return {
      ADRIAN_LAB_CORE: window.ADRIANLAB_CONFIG.ADRIAN_LAB_CORE,
      ADRIAN_TRAITS_CORE: window.ADRIANLAB_CONFIG.ADRIAN_TRAITS_CORE,
      ADRIAN_TRAITS_EXTENSIONS: window.ADRIANLAB_CONFIG.ADRIAN_TRAITS_EXTENSIONS,
    };
  }
  // Fallback values
  return {
    ADRIAN_LAB_CORE: '0x6e369bf0e4e0c106192d606fb6d85836d684da75',
    ADRIAN_TRAITS_CORE: '0x90546848474fb3c9fda3fdad887969bb244e7e58',
    ADRIAN_TRAITS_EXTENSIONS: '0x0000000000000000000000000000000000000000',
  };
};

// API endpoints
export const getApiEndpoints = () => {
  if (typeof window !== 'undefined' && window.ADRIANLAB_CONFIG) {
    return {
      PREVIEW: `${window.ADRIANLAB_CONFIG.PREVIEW_API_URL}`,
      TRAITS: `${window.ADRIANLAB_CONFIG.API_URL}/traits`,
      NFTS: `${window.ADRIANLAB_CONFIG.API_URL}/nfts`,
      STATS: `${window.ADRIANLAB_CONFIG.API_URL}/stats`,
    };
  }
  // Fallback values
  return {
    PREVIEW: 'https://adrianpunks.com/api/preview',
    TRAITS: 'https://adrianpunks.com/api/traits',
    NFTS: 'https://adrianpunks.com/api/nfts',
    STATS: 'https://adrianpunks.com/api/stats',
  };
};

export const API_ENDPOINTS = getApiEndpoints();

// Local storage keys
export const STORAGE_KEYS = {
  SELECTED_NFT: 'trait-builder-selected-nft',
  TRAIT_SELECTIONS: 'trait-builder-selections',
  USER_PREFERENCES: 'trait-builder-preferences',
  RECENT_ACTIVITY: 'trait-builder-recent-activity',
} as const;

// UI constants
export const UI_CONSTANTS = {
  GRID_COLUMNS: {
    sm: 2,
    md: 3,
    lg: 4,
    xl: 6,
  },
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 500,
  PREVIEW_UPDATE_DELAY: 1000,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet to continue',
  INSUFFICIENT_BALANCE: 'Insufficient trait balance',
  TRAIT_NOT_OWNED: 'You do not own this trait',
  NFT_NOT_OWNED: 'You do not own this NFT',
  NETWORK_ERROR: 'Network error. Please try again',
  TRANSACTION_FAILED: 'Transaction failed. Please try again',
  PREVIEW_GENERATION_FAILED: 'Failed to generate preview',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  TRAIT_EQUIPPED: 'Trait equipped successfully',
  TRAIT_UNEQUIPPED: 'Trait unequipped successfully',
  BATCH_UPDATE_SUCCESS: 'Batch update completed successfully',
  TRANSACTION_SUCCESS: 'Transaction completed successfully',
} as const; 