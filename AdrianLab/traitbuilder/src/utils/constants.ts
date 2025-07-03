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

// API endpoints
export const API_ENDPOINTS = {
  PREVIEW: '/api/preview',
  TRAITS: '/api/traits',
  NFTS: '/api/nfts',
  STATS: '/api/stats',
} as const;

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